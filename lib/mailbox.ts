import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { SenderRecord } from "@/lib/senders";

export type MailboxMessage = {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  preview: string;
  body: string;
};

function unfoldHeaders(rawHeaders: string) {
  return rawHeaders.replace(/\r?\n[ \t]+/g, " ");
}

function parseHeaders(rawHeaders: string) {
  const headers = new Map<string, string>();

  for (const line of unfoldHeaders(rawHeaders).split(/\r?\n/)) {
    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key && value) {
      headers.set(key, value);
    }
  }

  return headers;
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanBody(value: string) {
  return stripHtml(value)
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function decodeBody(value: string, transferEncoding: string) {
  if (transferEncoding.includes("base64")) {
    try {
      return Buffer.from(value.replace(/\s/g, ""), "base64").toString("utf8");
    } catch {
      return value;
    }
  }

  if (transferEncoding.includes("quoted-printable")) {
    return decodeQuotedPrintable(value);
  }

  return value;
}

function findBoundary(contentType: string) {
  const match = contentType.match(/boundary="?([^";]+)"?/i);
  return match?.[1];
}

function preferredBody(headers: Map<string, string>, rawBody: string): string {
  const contentType = headers.get("content-type")?.toLowerCase() || "";
  const transferEncoding = headers.get("content-transfer-encoding")?.toLowerCase() || "";
  const boundary = findBoundary(contentType);

  if (!boundary) {
    return decodeBody(rawBody, transferEncoding);
  }

  const parts = rawBody.split(`--${boundary}`);
  let fallback = "";

  for (const part of parts) {
    const trimmed = part.trim();

    if (!trimmed || trimmed === "--") {
      continue;
    }

    const parsed = parseRawMessage(trimmed);
    const partType = parsed.headers.get("content-type")?.toLowerCase() || "";
    const decoded = decodeBody(
      parsed.rawBody,
      parsed.headers.get("content-transfer-encoding")?.toLowerCase() || "",
    );

    if (partType.includes("text/plain")) {
      return decoded;
    }

    if (!fallback && partType.includes("text/html")) {
      fallback = decoded;
    }
  }

  return fallback || rawBody;
}

function parseRawMessage(raw: string) {
  const separator = raw.match(/\r?\n\r?\n/);

  if (!separator || separator.index === undefined) {
    return {
      headers: new Map<string, string>(),
      rawBody: raw,
    };
  }

  const headerEnd = separator.index;
  const bodyStart = headerEnd + separator[0].length;

  return {
    headers: parseHeaders(raw.slice(0, headerEnd)),
    rawBody: raw.slice(bodyStart),
  };
}

async function readMessage(filePath: string): Promise<MailboxMessage> {
  const raw = await readFile(filePath, "utf8");
  const parsed = parseRawMessage(raw);
  const body = cleanBody(preferredBody(parsed.headers, parsed.rawBody));
  const fileInfo = await stat(filePath);

  return {
    id: path.basename(filePath),
    from: parsed.headers.get("from") || "Unknown sender",
    to: parsed.headers.get("to") || "",
    subject: parsed.headers.get("subject") || "(no subject)",
    date: parsed.headers.get("date") || fileInfo.mtime.toISOString(),
    preview: body.slice(0, 180),
    body,
  };
}

async function listMaildirFiles(maildirPath: string) {
  const folders = ["new", "cur"];
  const files: string[] = [];

  for (const folder of folders) {
    const folderPath = path.join(maildirPath, folder);

    try {
      const entries = await readdir(folderPath);
      files.push(...entries.map((entry) => path.join(folderPath, entry)));
    } catch {
      // Missing Maildir folders simply mean there are no messages to show.
    }
  }

  return files;
}

export async function listMessages(sender: SenderRecord): Promise<MailboxMessage[]> {
  const files = await listMaildirFiles(path.join(sender.path, "Maildir"));
  const messages = await Promise.all(files.map((file) => readMessage(file)));

  return messages.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
