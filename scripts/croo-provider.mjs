import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";
import { readFileSync } from "node:fs";

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

const requiredEnv = ["CROO_API_URL", "CROO_WS_URL", "CROO_SDK_KEY"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required env: ${missingEnv.join(", ")}`);
  process.exit(1);
}

if (process.env.CROO_SDK_KEY === "replace_with_your_croo_sk_key") {
  console.error("Set CROO_SDK_KEY in .env to the API key from your Croo dashboard.");
  process.exit(1);
}

const baseURL = process.env.EMAILIFY_BASE_URL || "http://localhost:3333";
const deliverableType =
  process.env.CROO_DELIVERABLE_TYPE === DeliverableType.Text
    ? DeliverableType.Text
    : DeliverableType.Schema;
const secrets = [process.env.CROO_SDK_KEY].filter(Boolean);

function redact(value) {
  if (typeof value === "string") {
    return secrets.reduce((text, secret) => text.replaceAll(secret, "[redacted]"), value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) => (typeof item === "string" ? redact(item) : item)),
    );
  } catch {
    return "[unserializable]";
  }
}

const redactingLogger = {
  info: (message, ...args) => console.log(redact(message), ...args.map(redact)),
  warn: (message, ...args) => console.warn(redact(message), ...args.map(redact)),
  error: (message, ...args) => console.error(redact(message), ...args.map(redact)),
  debug: (message, ...args) => console.debug(redact(message), ...args.map(redact)),
};

const client = new AgentClient(
  {
    baseURL: process.env.CROO_API_URL,
    wsURL: process.env.CROO_WS_URL,
    rpcURL: process.env.BASE_RPC_URL,
    logger: redactingLogger,
  },
  process.env.CROO_SDK_KEY,
);

function parseRequirements(raw) {
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

function normalizeAction(requirements) {
  const rawAction =
    requirements.action ||
    requirements.operation ||
    requirements.endpoint ||
    requirements.service ||
    requirements.type;

  if (typeof rawAction === "string") {
    const action = rawAction.trim().toLowerCase();

    if (["send", "sendemail", "send_email", "email"].includes(action)) {
      return "send";
    }

    if (["newtemplate", "new_template", "template", "create_template"].includes(action)) {
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
  }

  if (requirements.to && requirements.title && requirements.body) {
    return "send";
  }

  if (requirements.username && requirements.name) {
    return "reserveSender";
  }

  if (requirements.description) {
    return "newTemplate";
  }

  throw new Error(
    "requirements must include action/send/newTemplate/reserveSender, or fields that imply one.",
  );
}

function routeForAction(action) {
  switch (action) {
    case "send":
      return "/api/croo/send";
    case "newTemplate":
      return "/api/croo/newTemplate";
    case "reserveSender":
      return "/api/croo/reserveSender";
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

function payloadForAction(action, requirements) {
  const {
    action: _action,
    operation: _operation,
    endpoint: _endpoint,
    service: _service,
    type: _type,
    ...payload
  } = requirements;

  if (action === "newTemplate" && payload.image_url && !payload.imageUrl) {
    payload.imageUrl = payload.image_url;
  }

  return payload;
}

async function callEmailify(action, requirements) {
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

  return body;
}

function buildDelivery(action, result) {
  const payload = {
    action,
    result,
  };

  if (deliverableType === DeliverableType.Text) {
    return {
      deliverableType: DeliverableType.Text,
      deliverableText: JSON.stringify(payload),
    };
  }

  return {
    deliverableType: DeliverableType.Schema,
    deliverableSchema: JSON.stringify({
      type: "object",
      properties: {
        action: { type: "string" },
        result: { type: "object" },
      },
      required: ["action", "result"],
    }),
    deliverableText: JSON.stringify(payload),
  };
}

async function rejectOrder(orderId, error) {
  const message = error instanceof Error ? error.message : "Emailify failed to process order.";

  try {
    await client.rejectOrder(orderId, message);
    console.error(`Rejected order ${orderId}: ${message}`);
  } catch (rejectError) {
    console.error(`Failed to reject order ${orderId}:`, rejectError);
    console.error("Original error:", error);
  }
}

async function acceptNegotiation(event) {
  if (!event.negotiation_id) {
    console.warn("NegotiationCreated event missing negotiation_id", event);
    return;
  }

  console.log(`Accepting negotiation ${event.negotiation_id}`);
  const result = await client.acceptNegotiation(event.negotiation_id);
  console.log(`Order created: ${result.order.orderId}`);
}

async function deliverOrder(event) {
  if (!event.order_id) {
    console.warn("OrderPaid event missing order_id", event);
    return;
  }

  console.log(`Preparing delivery for order ${event.order_id}`);
  const order = await client.getOrder(event.order_id);
  const negotiation = await client.getNegotiation(order.negotiationId);
  const requirements = parseRequirements(negotiation.requirements);
  const action = normalizeAction(requirements);
  const result = await callEmailify(action, requirements);
  const delivery = buildDelivery(action, result);

  await client.deliverOrder(event.order_id, delivery);
  console.log(`Delivered order ${event.order_id} with action ${action}`);
}

async function main() {
  const stream = await client.connectWebSocket();

  stream.onAny((event) => {
    console.log(`Croo event: ${event.type}`);
  });

  stream.on(EventType.NegotiationCreated, (event) => {
    acceptNegotiation(event).catch((error) => {
      console.error("acceptNegotiation failed:", error);
    });
  });

  stream.on(EventType.OrderPaid, (event) => {
    deliverOrder(event).catch((error) => {
      if (event.order_id) {
        rejectOrder(event.order_id, error);
      } else {
        console.error("deliverOrder failed:", error);
      }
    });
  });

  stream.on(EventType.OrderCompleted, (event) => {
    console.log(`Order completed: ${event.order_id}`);
  });

  process.on("SIGINT", () => {
    stream.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    stream.close();
    process.exit(0);
  });

  console.log("Emailify Croo provider is online.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
