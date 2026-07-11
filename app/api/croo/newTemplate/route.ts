import { fail, ok, optionalString, readJson, requireString } from "@/lib/croo";
import { generateTemplateWithVenice } from "@/lib/venice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const description = requireString(body, "description");
    const imageUrl = optionalString(body, "imageUrl") || optionalString(body, "image_url");
    const template = await generateTemplateWithVenice(description, imageUrl);

    return ok({ html: template.html, response: template.html, model: template.model });
  } catch (error) {
    return fail(error);
  }
}
