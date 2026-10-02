// One adapter that covers MANY providers: OpenAI, Gemini, Groq, OpenRouter,
// Ollama, Together, Mistral, DeepSeek... they all expose an OpenAI-compatible
// "chat completions" API. You only change baseURL + key + model.

import OpenAI from "openai";
import type { ChatRequest, ChatResponse, LLMProvider, Message, ToolCall } from "./types.js";

function toOpenAI(m: Message): OpenAI.Chat.ChatCompletionMessageParam[] {
  if (m.role === "user") return [{ role: "user", content: m.content }];
  if (m.role === "assistant") {
    // Gemini 3 attaches encrypted "thought signatures" to tool calls (in `extra_content`)
    // and REJECTS the next request (400) if they are missing. So when we have the
    // provider's original reply, echo its tool_calls back exactly as received.
    const raw = m.raw as any;
    if (raw && Array.isArray(raw.tool_calls) && raw.tool_calls.length) {
      return [
        {
          role: "assistant",
          content: raw.content ?? null,
          tool_calls: raw.tool_calls,
          ...(raw.extra_content ? { extra_content: raw.extra_content } : {}),
        } as any,
      ];
    }
    return [
      {
        role: "assistant",
        content: m.text || null,
        ...(m.toolCalls.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: "function" as const,
                function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) },
              })),
            }
          : {}),
      },
    ];
  }
  // OpenAI wants ONE message per tool result (role: "tool").
  return m.results.map((r) => ({
    role: "tool" as const,
    tool_call_id: r.toolCallId,
    content: r.output,
  }));
}

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;

  constructor(public name: string, public model: string, apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat({ system, messages, tools }: ChatRequest): Promise<ChatResponse> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "system", content: system }, ...messages.flatMap(toOpenAI)],
      tools: tools.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
    });

    const msg = res.choices[0].message;
    const toolCalls: ToolCall[] = [];
    for (const c of msg.tool_calls ?? []) {
      if (c.type !== "function") continue;
      let input: unknown = {};
      try {
        input = JSON.parse(c.function.arguments || "{}");
      } catch {
        // Weaker models sometimes emit broken JSON; the tool will report a clean error.
      }
      toolCalls.push({ id: c.id, name: c.function.name, input });
    }
    return { text: msg.content ?? "", toolCalls, raw: msg };
  }
}
