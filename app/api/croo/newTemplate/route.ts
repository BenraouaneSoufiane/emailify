import { fail, ok, optionalString, readJson, requireString } from "@/lib/croo";
import { generateEmailTemplate } from "@/lib/template";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const description = requireString(body, "description");
    const imageUrl = optionalString(body, "imageUrl") || optionalString(body, "image_url");
    const html = generateEmailTemplate(description, imageUrl);

    return ok({ html });
  } catch (error) {
    return fail(error);
  }
}
