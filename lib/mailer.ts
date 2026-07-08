import nodemailer, { type SendMailOptions } from "nodemailer";

type AttachmentInput =
  | string
  | {
      filename?: string;
      content?: string;
      contentType?: string;
      url?: string;
      path?: string;
    };

export type SendPayload = {
  to: string;
  title: string;
  body: string;
  from?: string;
  replyTo?: string;
  attachment?: unknown;
};

function getTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  return nodemailer.createTransport({
    sendmail: true,
    newline: "unix",
    path: process.env.SENDMAIL_PATH || "/usr/sbin/sendmail",
  });
}

function normalizeAttachments(attachment: unknown): SendMailOptions["attachments"] {
  if (!attachment) {
    return undefined;
  }

  const values = Array.isArray(attachment) ? attachment : [attachment];

  return values.map((item, index) => {
    if (typeof item === "string") {
      return {
        filename: `attachment-${index + 1}`,
        path: item,
      };
    }

    if (!item || typeof item !== "object") {
      throw new Error("attachment must be a URL/path string, object, or array.");
    }

    const input = item as AttachmentInput;

    if (typeof input === "string") {
      return {
        filename: `attachment-${index + 1}`,
        path: input,
      };
    }

    if (!input.content && !input.url && !input.path) {
      throw new Error("attachment object must include content, url, or path.");
    }

    return {
      filename: input.filename || `attachment-${index + 1}`,
      content: input.content ? Buffer.from(input.content, "base64") : undefined,
      contentType: input.contentType,
      href: input.url,
      path: input.path,
    };
  });
}

export async function sendEmail(payload: SendPayload) {
  const from = payload.from || process.env.EMAILIFY_FROM || "Emailify <no-reply@emailify.site>";
  const transport = getTransport();
  const info = await transport.sendMail({
    from,
    to: payload.to,
    replyTo: payload.replyTo,
    subject: payload.title,
    html: payload.body,
    attachments: normalizeAttachments(payload.attachment),
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}
