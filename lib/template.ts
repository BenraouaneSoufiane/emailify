function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTitle(description: string) {
  const firstSentence = description.split(/[.!?]/)[0]?.trim() || description;
  const compact = firstSentence.replace(/\s+/g, " ");

  if (compact.length <= 64) {
    return compact;
  }

  return `${compact.slice(0, 61).trim()}...`;
}

function buildParagraphs(description: string) {
  const chunks = description
    .split(/\n{2,}|[.!?]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (chunks.length === 0) {
    return ["A focused update from Emailify."];
  }

  return chunks;
}

export function generateEmailTemplate(description: string, imageUrl?: string) {
  const title = buildTitle(description);
  const paragraphs = buildParagraphs(description);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const imageBlock = imageUrl
    ? `
          <tr>
            <td>
              <img src="${escapeHtml(imageUrl)}" alt="" width="640" style="display:block;width:100%;max-width:640px;border:0;border-radius:12px;margin:0 0 24px;" />
            </td>
          </tr>`
    : "";

  const paragraphHtml = paragraphs
    .map(
      (paragraph) => `
          <tr>
            <td style="padding:0 0 16px;color:#3f4851;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
              ${escapeHtml(paragraph)}
            </td>
          </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f4f7f6;padding:24px;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${safeDescription}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;background:#fffdfa;border:1px solid #dfe5e2;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <div style="color:#0b8f83;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Emailify</div>
              </td>
            </tr>${imageBlock}
            <tr>
              <td style="padding:0 28px 10px;">
                <h1 style="margin:0;color:#111416;font-family:Arial,sans-serif;font-size:32px;line-height:1.15;">${safeTitle}</h1>
              </td>
            </tr>
            ${paragraphHtml}
            <tr>
              <td style="padding:10px 28px 30px;">
                <a href="https://emailify.site" style="display:inline-block;background:#111416;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;padding:13px 18px;">Open update</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
