import { fail, ok, optionalString, readJson, requireString } from "@/lib/a2mcp";
import { listMessages } from "@/lib/mailbox";
import { requireSenderPassword } from "@/lib/senders";

export const runtime = "nodejs";

const domain = process.env.EMAILIFY_DOMAIN || "emailify.site";

function resolveAddress(usernameOrAddress: string) {
  const value = usernameOrAddress.trim().toLowerCase();

  if (value.includes("@")) {
    return value;
  }

  return `${value}@${domain}`;
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const usernameOrAddress =
      optionalString(body, "username") || requireString(body, "address", "username");
    const password = requireString(body, "password");
    const sender = await requireSenderPassword(resolveAddress(usernameOrAddress), password);
    const messages = await listMessages(sender);

    return ok({
      inbox: {
        username: sender.username,
        address: sender.address,
        name: sender.name,
      },
      messages,
    });
  } catch (error) {
    return fail(error, 401);
  }
}
