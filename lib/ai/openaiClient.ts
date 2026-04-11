import { areThirdPartyApisDisabled } from "@/lib/config/externalAccess";

export function getOpenAiModel(): string {
  const m = process.env.OPENAI_MODEL?.trim();
  return m && m.length > 0 ? m : "gpt-4o-mini";
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim()) && !areThirdPartyApisDisabled();
}

/**
 * Chat completion with JSON object response. Throws on HTTP/parse errors or missing config.
 */
export async function openAiJsonCompletion(
  system: string,
  user: string,
  temperature = 0.25
): Promise<unknown> {
  if (areThirdPartyApisDisabled()) {
    throw new Error("External APIs disabled (DISABLE_EXTERNAL_API_CALLS).");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const llmResult = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = llmResult.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response.");
  }

  return JSON.parse(content) as unknown;
}
