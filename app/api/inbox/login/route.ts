import { fail, ok, readJson, requireString } from "@/lib/croo";
import { listMessages } from "@/lib/mailbox";
import { requireSenderPassword } from "@/lib/senders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const address = requireString(body, "address").toLowerCase();
    const password = requireString(body, "password");
    const sender = await requireSenderPassword(address, password);
    const messages = await listMessages(sender);

    return ok({
      inbox: {
        address: sender.address,
        name: sender.name,
      },
      messages,
    });
  } catch (error) {
    return fail(error, 401);
  }
}
