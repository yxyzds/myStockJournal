import { env } from "../env";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function chatCompletionsUrl() {
  const base = env.aiBaseUrl.replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

/** Pull a JSON object out of raw model text (plain or ```json fenced). */
function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim()) as unknown;
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("Model returned non-JSON content");
  }
}

/**
 * Plain `fetch` to an OpenAI-compatible relay (中转站). No SDK.
 * POST `${AI_BASE_URL}/chat/completions`
 */
export async function chatJson(messages: ChatMessage[]): Promise<unknown> {
  if (!env.aiApiKey) {
    throw new Error("AI_API_KEY is not configured");
  }
  if (!env.aiBaseUrl) {
    throw new Error("AI_BASE_URL is not configured");
  }

  const body: Record<string, unknown> = {
    model: env.aiModel,
    temperature: 0.8,
    messages,
  };
  // Some relays reject this; prompt already asks for JSON when off.
  if (env.aiJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.aiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI error ${res.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");

  return parseJsonContent(content);
}
