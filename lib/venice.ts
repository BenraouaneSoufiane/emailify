type VeniceChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function stripCodeFence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);

  return match?.[1]?.trim() || trimmed;
}

function buildTemplatePrompt(description: string, imageUrl?: string) {
  return [
    "Create a polished, production-ready HTML email template from these user inputs.",
    "",
    `Description: ${description}`,
    `Image URL: ${imageUrl || "None provided"}`,
    "",
    "Requirements:",
    "- Return only the complete HTML document, with no markdown or explanation.",
    "- Use table-based layout and inline CSS suitable for email clients.",
    "- Include the image URL as the main visual when one is provided.",
    "- Write concise, conversion-focused copy based on the description.",
    "- Keep links generic unless the description includes specific URLs.",
  ].join("\n");
}

export async function generateTemplateWithVenice(description: string, imageUrl?: string) {
  const apiKey = process.env.VENICE_API_KEY;
  const model = process.env.VENICE_MODEL || "zai-org-glm-5-1";
  const baseUrl = process.env.VENICE_API_URL || "https://api.venice.ai/api/v1";

  if (!apiKey || apiKey === "replace_with_your_venice_api_key") {
    throw new Error("VENICE_API_KEY is required.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert HTML email designer. You transform user-provided campaign details into clean, responsive email HTML.",
        },
        {
          role: "user",
          content: buildTemplatePrompt(description, imageUrl),
        },
      ],
      temperature: 0.4,
    }),
  });

  const text = await response.text();
  let body: VeniceChatResponse = {};

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      body.error?.message || `Venice template generation failed with HTTP ${response.status}.`,
    );
  }

  const content = body.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Venice returned an empty template response.");
  }

  return {
    html: stripCodeFence(content),
    model,
  };
}
