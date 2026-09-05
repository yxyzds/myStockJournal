import { env } from "../env";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Minimal Chat Completions client (JSON mode). Keeps the API free of an SDK
 * dependency until we grow into more providers.
 */
export async function chatJson(messages: ChatMessage[]): Promise<unknown> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiModel,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }
}
