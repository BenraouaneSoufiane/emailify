import { NextResponse } from "next/server";

export type JsonObject = Record<string, unknown>;

export async function readJson(request: Request): Promise<JsonObject> {
  try {
    const value = await request.json();

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Body must be a JSON object.");
    }

    return value as JsonObject;
  } catch {
    throw new Error("Body must be valid JSON.");
  }
}

export function requireString(
  body: JsonObject,
  key: string,
  label = key,
): string {
  const value = body[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

export function optionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string.`);
  }

  return value.trim();
}

export function ok(data: JsonObject, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Request failed.";

  return NextResponse.json({ ok: false, error: message }, { status });
}

export function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
