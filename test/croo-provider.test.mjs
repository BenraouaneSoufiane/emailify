import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAction,
  parseRequirements,
  payloadForAction,
  routeForAction,
} from "../scripts/croo-provider.mjs";

test("infers newTemplate from Croo UI template prompt aliases", () => {
  const aliases = [
    { prompt: "Create a launch email" },
    { brief: "Create a launch email" },
    { templateDescription: "Create a launch email" },
    { template_description: "Create a launch email" },
    { emailDescription: "Create a launch email" },
    { email_description: "Create a launch email" },
  ];

  for (const requirements of aliases) {
    assert.equal(normalizeAction(requirements), "newTemplate");
  }
});

test("normalizes natural new template action names", () => {
  const actions = [
    "new template",
    "generate_template",
    "generate template",
    "email_template",
    "email template",
  ];

  for (const action of actions) {
    assert.equal(normalizeAction({ action }), "newTemplate");
  }
});

test("maps template aliases to the API description payload", () => {
  assert.deepEqual(payloadForAction("newTemplate", {
    action: "new template",
    prompt: "Create a launch email",
    image_url: "https://example.com/banner.png",
  }), {
    prompt: "Create a launch email",
    image_url: "https://example.com/banner.png",
    description: "Create a launch email",
    imageUrl: "https://example.com/banner.png",
  });
});

test("keeps the newTemplate route stable", () => {
  assert.equal(routeForAction("newTemplate"), "/api/croo/newTemplate");
});

test("infers send from task-based email requests", () => {
  assert.equal(
    normalizeAction({
      to: "benraouanesoufiane@proton.me",
      body: "Your AuditsForMe private audit is queued.",
      from: "auditsforme@emailify.site",
      task: "Send a concise private audit status email.",
      channel: "email",
      subject: "AuditsForMe private audit queued: https://x.com",
      fromName: "Auditsforme Alerts",
    }),
    "send",
  );
});

test("maps send subject aliases to the API title payload", () => {
  assert.deepEqual(
    payloadForAction("send", {
      to: "benraouanesoufiane@proton.me",
      body: "Your AuditsForMe private audit is queued.",
      from: "auditsforme@emailify.site",
      task: "Send a concise private audit status email.",
      channel: "email",
      subject: "AuditsForMe private audit queued: https://x.com",
      fromName: "Auditsforme Alerts",
    }),
    {
      to: "benraouanesoufiane@proton.me",
      body: "Your AuditsForMe private audit is queued.",
      from: "auditsforme@emailify.site",
      channel: "email",
      subject: "AuditsForMe private audit queued: https://x.com",
      title: "AuditsForMe private audit queued: https://x.com",
      fromName: "Auditsforme Alerts",
    },
  );
});

test("maps send description aliases to the API body payload", () => {
  const requirements = {
    to: "customer@example.com",
    subject: "Your update is ready",
    description: "Here is the requested update.",
    from: "notifications@emailify.site",
    fromName: "Notifications",
    metadata: { source: "external-service" },
  };

  assert.equal(normalizeAction(requirements), "send");
  assert.deepEqual(payloadForAction("send", requirements), {
    to: "customer@example.com",
    subject: "Your update is ready",
    title: "Your update is ready",
    description: "Here is the requested update.",
    body: "Here is the requested update.",
    from: "notifications@emailify.site",
    fromName: "Notifications",
    metadata: { source: "external-service" },
  });
});

test("accepts extra send parameters when required fields are present", () => {
  const requirements = {
    to: "customer@example.com",
    subject: "Your update is ready",
    body: "Here is the requested update.",
    from: "notifications@emailify.site",
    fromName: "Notifications",
    task: "Send an email notification.",
    channel: "email",
    metadata: { source: "external-service", requestId: "req_123" },
    customFlag: true,
    extraContext: ["anything", "can", "arrive"],
  };

  assert.equal(normalizeAction(requirements), "send");
  assert.deepEqual(payloadForAction("send", requirements), {
    to: "customer@example.com",
    subject: "Your update is ready",
    title: "Your update is ready",
    body: "Here is the requested update.",
    from: "notifications@emailify.site",
    fromName: "Notifications",
    channel: "email",
    metadata: { source: "external-service", requestId: "req_123" },
    customFlag: true,
    extraContext: ["anything", "can", "arrive"],
  });
});

test("normalizes checkInbox action names", () => {
  const actions = ["check inbox", "check_inbox", "inbox", "messages", "read_inbox"];

  for (const action of actions) {
    assert.equal(normalizeAction({ action }), "checkInbox");
  }
});

test("infers checkInbox from username and password", () => {
  assert.equal(
    normalizeAction({ username: "sales", password: "keep-this-secret" }),
    "checkInbox",
  );
});

test("keeps the checkInbox route stable", () => {
  assert.equal(routeForAction("checkInbox"), "/api/croo/checkInbox");
});

test("parses JSON object requirements", () => {
  assert.deepEqual(
    parseRequirements('{"prompt":"Create a launch email"}'),
    { prompt: "Create a launch email" },
  );
});
