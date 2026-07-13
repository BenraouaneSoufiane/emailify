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

export function normalizeAction(requirements: JsonObject) {
  const rawAction =
    requirements.action ||
    requirements.operation ||
    requirements.endpoint ||
    requirements.service ||
    requirements.type ||
    requirements.task;

  if (typeof rawAction === "string") {
    const action = rawAction.trim().toLowerCase();

    if (
      ["send", "sendemail", "send_email", "email"].includes(action) ||
      (action.startsWith("send") && action.includes("email"))
    ) {
      return "send";
    }

    if (
      [
        "newtemplate",
        "new_template",
        "template",
        "create_template",
        "new template",
        "generate_template",
        "generate template",
        "email_template",
        "email template",
      ].includes(action)
    ) {
      return "newTemplate";
    }

    if (
      [
        "reservesender",
        "reserve_sender",
        "reserved_sender",
        "sender",
        "create_sender",
        "newsender",
        "new_sender",
      ].includes(action)
    ) {
      return "reserveSender";
    }

    if (
      [
        "checkinbox",
        "check_inbox",
        "check inbox",
        "inbox",
        "messages",
        "mailbox",
        "read_inbox",
        "read inbox",
      ].includes(action)
    ) {
      return "checkInbox";
    }
  }

  if (
    requirements.to &&
    (requirements.title || requirements.subject) &&
    (requirements.body || requirements.description)
  ) {
    return "send";
  }

  if (requirements.username && requirements.name) {
    return "reserveSender";
  }

  if ((requirements.username || requirements.address) && requirements.password) {
    return "checkInbox";
  }

  if (
    requirements.description ||
    requirements.prompt ||
    requirements.brief ||
    requirements.template ||
    requirements.templateDescription ||
    requirements.template_description ||
    requirements.emailDescription ||
    requirements.email_description
  ) {
    return "newTemplate";
  }

  throw new Error(
    "Body must include action/send/newTemplate/reserveSender/checkInbox, or fields that imply one.",
  );
}

export function routeForAction(action: string) {
  switch (action) {
    case "send":
      return "/api/a2mcp/send";
    case "newTemplate":
      return "/api/a2mcp/newTemplate";
    case "reserveSender":
      return "/api/a2mcp/reserveSender";
    case "checkInbox":
      return "/api/a2mcp/checkInbox";
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

export function payloadForAction(action: string, requirements: JsonObject) {
  const {
    action: _action,
    operation: _operation,
    endpoint: _endpoint,
    service: _service,
    type: _type,
    task: _task,
    ...payload
  } = requirements;

  if (action === "send") {
    if (payload.subject && !payload.title) {
      payload.title = payload.subject;
    }

    if (payload.description && !payload.body) {
      payload.body = payload.description;
    }
  }

  if (action === "newTemplate") {
    payload.description =
      payload.description ||
      payload.prompt ||
      payload.brief ||
      payload.templateDescription ||
      payload.template_description ||
      payload.emailDescription ||
      payload.email_description ||
      payload.template;

    if (payload.image_url && !payload.imageUrl) {
      payload.imageUrl = payload.image_url;
    }
  }

  return payload;
}
