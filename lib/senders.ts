import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const senderRoot = process.env.EMAILIFY_SENDER_ROOT || path.join(process.cwd(), "data", "senders");
const domain = process.env.EMAILIFY_DOMAIN || "emailify.site";
const virtualMailboxMapPath =
  process.env.EMAILIFY_POSTFIX_VIRTUAL_MAP || path.join(senderRoot, "..", "virtual_mailbox_maps");

export type SenderRecord = {
  username: string;
  name: string;
  address: string;
  proof?: string;
  passwordHash?: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

function createProof() {
  return randomBytes(32).toString("base64url");
}

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");

  return `scrypt$${salt}$${hash}`;
}

function secretMatches(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function passwordMatches(storedHash: string, password: string) {
  const [algorithm, salt, expectedHash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    throw new Error("reserved sender password metadata is invalid.");
  }

  const receivedHash = scryptSync(password, salt, 64).toString("base64url");

  return secretMatches(expectedHash, receivedHash);
}

function requirePassword(password: string) {
  const normalized = password.trim();

  if (normalized.length === 0) {
    throw new Error("password is required.");
  }

  return normalized;
}

async function upsertVirtualMailboxMap(record: SenderRecord) {
  const address = record.address.toLowerCase();
  const entry = `${address} ${record.username}/Maildir/`;
  let existing = "";

  try {
    existing = await readFile(virtualMailboxMapPath, "utf8");
  } catch {
    // The map is created on the first reserved sender.
  }

  const entries = existing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().startsWith(`${address} `));

  entries.push(entry);
  await mkdir(path.dirname(virtualMailboxMapPath), { recursive: true });
  await writeFile(virtualMailboxMapPath, `${entries.join("\n")}\n`, "utf8");
}

export function normalizeUsername(username: string) {
  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]$|^[a-z0-9]$/.test(normalized)) {
    throw new Error(
      "username must be 1-64 chars and use only letters, numbers, dots, underscores, or hyphens.",
    );
  }

  if (normalized.includes("..")) {
    throw new Error("username cannot contain consecutive dots.");
  }

  return normalized;
}

export async function createSender(
  username: string,
  name: string,
  password: string,
): Promise<SenderRecord> {
  const normalized = normalizeUsername(username);
  const displayName = name.trim();
  const normalizedPassword = requirePassword(password);
  const mailboxPath = path.join(senderRoot, normalized);
  const metadataPath = path.join(mailboxPath, "metadata.json");

  if (displayName.length === 0) {
    throw new Error("name is required.");
  }

  try {
    const existing = JSON.parse(await readFile(metadataPath, "utf8")) as Partial<SenderRecord>;
    const updated: SenderRecord = {
      username: normalized,
      name: displayName,
      address: `${normalized}@${domain}`,
      proof: typeof existing.proof === "string" ? existing.proof : createProof(),
      passwordHash: passwordHash(normalizedPassword),
      path: mailboxPath,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await writeFile(metadataPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    await upsertVirtualMailboxMap(updated);

    return updated;
  } catch {
    const now = new Date().toISOString();
    const record: SenderRecord = {
      username: normalized,
      name: displayName,
      address: `${normalized}@${domain}`,
      proof: createProof(),
      passwordHash: passwordHash(normalizedPassword),
      path: mailboxPath,
      createdAt: now,
      updatedAt: now,
    };

    await mkdir(path.join(mailboxPath, "Maildir", "cur"), { recursive: true });
    await mkdir(path.join(mailboxPath, "Maildir", "new"), { recursive: true });
    await mkdir(path.join(mailboxPath, "Maildir", "tmp"), { recursive: true });
    await writeFile(metadataPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await upsertVirtualMailboxMap(record);

    return record;
  }
}

export async function getSenderByAddress(address: string): Promise<SenderRecord> {
  const normalizedAddress = address.trim().toLowerCase();
  const suffix = `@${domain.toLowerCase()}`;

  if (!normalizedAddress.endsWith(suffix)) {
    throw new Error("sender must be a reserved Emailify address.");
  }

  const username = normalizeUsername(normalizedAddress.slice(0, -suffix.length));
  const metadataPath = path.join(senderRoot, username, "metadata.json");

  try {
    const record = JSON.parse(await readFile(metadataPath, "utf8")) as Partial<SenderRecord>;

    if (
      record.username !== username ||
      record.address?.toLowerCase() !== normalizedAddress ||
      typeof record.name !== "string" ||
      (typeof record.passwordHash !== "string" && typeof record.proof !== "string")
    ) {
      throw new Error("reserved sender metadata is invalid.");
    }

    return {
      ...record,
      path: path.join(senderRoot, username),
    } as SenderRecord;
  } catch (error) {
    if (error instanceof Error && error.message === "reserved sender metadata is invalid.") {
      throw error;
    }

    throw new Error("reserved sender was not found.");
  }
}

export async function findSenderByAddress(address: string): Promise<SenderRecord | undefined> {
  try {
    return await getSenderByAddress(address);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "sender must be a reserved Emailify address." ||
        error.message === "reserved sender was not found.")
    ) {
      return undefined;
    }

    throw error;
  }
}

export async function requireSenderPassword(
  address: string,
  password: string,
): Promise<SenderRecord> {
  const sender = await getSenderByAddress(address);
  const normalizedPassword = requirePassword(password);

  if (sender.passwordHash) {
    if (!passwordMatches(sender.passwordHash, normalizedPassword)) {
      throw new Error("password is invalid for this reserved sender.");
    }

    return sender;
  }

  if (!sender.proof || !secretMatches(sender.proof, normalizedPassword)) {
    throw new Error("password is invalid for this reserved sender.");
  }

  return sender;
}
