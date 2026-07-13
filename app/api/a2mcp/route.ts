import {
  fail,
  normalizeAction,
  ok,
  payloadForAction,
  readJson,
  routeForAction,
} from "@/lib/a2mcp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const action = normalizeAction(body);
    const response = await fetch(new URL(routeForAction(action), request.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payloadForAction(action, body)),
    });
    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || `Emailify ${action} failed.`);
    }

    return ok({ action, result });
  } catch (error) {
    return fail(error);
  }
}
