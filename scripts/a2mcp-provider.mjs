import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function loadDotEnv(path = ".env") {
  let content;

  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const baseURL = process.env.EMAILIFY_BASE_URL || "http://localhost:3333";

export function parseRequirements(raw) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("requirements JSON must be an object.");
    }

    return parsed;
  } catch {
    throw new Error(
      `requirements must be a JSON object string. Received: ${raw.slice(0, 160)}`,
    );
  }
}

export function normalizeAction(requirements) {
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
    "requirements must include action/send/newTemplate/reserveSender/checkInbox, or fields that imply one.",
  );
}

export function routeForAction(action) {
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

export function payloadForAction(action, requirements) {
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

export async function callEmailify(action, requirements) {
  const response = await fetch(new URL(routeForAction(action), baseURL), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payloadForAction(action, requirements)),
  });
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok || body.ok === false) {
    throw new Error(body.error || `Emailify ${action} failed with HTTP ${response.status}.`);
  }

  return {
    action,
    result: body,
  };
}

async function main() {
  const rawRequirements = process.argv[2];

  if (!rawRequirements) {
    throw new Error("Pass an A2MCP requirements JSON object as the first argument.");
  }

  const requirements = parseRequirements(rawRequirements);
  const action = normalizeAction(requirements);
  const result = await callEmailify(action, requirements);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
