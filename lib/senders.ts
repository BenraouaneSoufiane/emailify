import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const senderRoot = process.env.EMAILIFY_SENDER_ROOT || path.join(process.cwd(), "data", "senders");
const domain = process.env.EMAILIFY_DOMAIN || "emailify.site";

export type SenderRecord = {
  username: string;
  name: string;
  address: string;
  proof: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

function createProof() {
  return randomBytes(32).toString("base64url");
}

function proofMatches(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
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

export async function createSender(username: string, name: string): Promise<SenderRecord> {
  const normalized = normalizeUsername(username);
  const displayName = name.trim();
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
      path: mailboxPath,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await writeFile(metadataPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

    return updated;
  } catch {
    const now = new Date().toISOString();
    const record: SenderRecord = {
      username: normalized,
      name: displayName,
      address: `${normalized}@${domain}`,
      proof: createProof(),
      path: mailboxPath,
      createdAt: now,
      updatedAt: now,
    };

    await mkdir(path.join(mailboxPath, "Maildir", "cur"), { recursive: true });
    await mkdir(path.join(mailboxPath, "Maildir", "new"), { recursive: true });
    await mkdir(path.join(mailboxPath, "Maildir", "tmp"), { recursive: true });
    await writeFile(metadataPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

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
      typeof record.proof !== "string"
    ) {
      throw new Error("reserved sender metadata is invalid.");
    }

    return record as SenderRecord;
  } catch (error) {
    if (error instanceof Error && error.message === "reserved sender metadata is invalid.") {
      throw error;
    }

    throw new Error("reserved sender was not found.");
  }
}

export async function requireSenderProof(address: string, proof: string): Promise<SenderRecord> {
  const sender = await getSenderByAddress(address);

  if (!proofMatches(sender.proof, proof.trim())) {
    throw new Error("senderpoof is invalid for this reserved sender.");
  }

  return sender;
}
