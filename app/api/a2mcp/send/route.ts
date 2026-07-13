import { fail, ok, optionalString, readJson, requireString } from "@/lib/a2mcp";
import { sendEmail } from "@/lib/mailer";
import { findSenderByAddress, requireSenderPassword } from "@/lib/senders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const to = requireString(body, "to");
    const title = optionalString(body, "title") || requireString(body, "subject", "title or subject");
    const htmlBody = optionalString(body, "body") || requireString(body, "description", "body or description");
    const replyTo = optionalString(body, "reply_to") || optionalString(body, "replyTo");
    const senderAddress = requireString(body, "from");
    const fromName = optionalString(body, "fromName") || requireString(body, "from_name", "fromName");
    const password = optionalString(body, "password");
    const attachment = body.attachment ?? body.attachement;
    const reservedSender = await findSenderByAddress(senderAddress);
    let from = `${fromName} <${senderAddress}>`;

    if (reservedSender) {
      if (!password) {
        throw new Error(
          "password is required for this reserved sender, or change the sender to something else.",
        );
      }

      const verifiedSender = await requireSenderPassword(senderAddress, password);
      from = `${fromName || verifiedSender.name} <${verifiedSender.address}>`;
    }

    const result = await sendEmail({
      to,
      title,
      body: htmlBody,
      from,
      replyTo,
      attachment,
    });

    return ok({ delivery: result });
  } catch (error) {
    return fail(error, error instanceof Error && /sendmail|ECONN/.test(error.message) ? 502 : 400);
  }
}
