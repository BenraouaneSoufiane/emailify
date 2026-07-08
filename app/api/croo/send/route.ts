import { fail, ok, optionalString, readJson, requireString } from "@/lib/croo";
import { sendEmail } from "@/lib/mailer";
import { requireSenderProof } from "@/lib/senders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const to = requireString(body, "to");
    const title = requireString(body, "title");
    const htmlBody = requireString(body, "body");
    const replyTo = optionalString(body, "reply_to") || optionalString(body, "replyTo");
    const senderAddress =
      optionalString(body, "sender") ||
      optionalString(body, "senderAddress") ||
      optionalString(body, "from");
    const senderProof =
      optionalString(body, "senderpoof") ||
      optionalString(body, "senderproof") ||
      optionalString(body, "senderProof");
    const attachment = body.attachment ?? body.attachement;
    let from: string | undefined;

    if (senderAddress) {
      if (!senderProof) {
        throw new Error("senderpoof is required when using a reserved sender.");
      }

      const reservedSender = await requireSenderProof(senderAddress, senderProof);
      from = `${reservedSender.name} <${reservedSender.address}>`;
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
