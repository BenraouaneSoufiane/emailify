import { fail, getBaseUrl, ok, readJson, requireString } from "@/lib/croo";
import { createSender } from "@/lib/senders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const username = requireString(body, "username");
    const name = requireString(body, "name");
    const sender = await createSender(username, name);

    return ok(
      {
        sender,
        proof: sender.proof,
        senderPath: `${getBaseUrl(request)}/api/croo/reserveSender`,
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
