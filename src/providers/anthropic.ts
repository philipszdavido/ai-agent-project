import Anthropic from "@anthropic-ai/sdk";
import type { ChatRequest, ChatResponse, LLMProvider, Message } from "./types.js";

function toAnthropic(m: Message): Anthropic.MessageParam {
  if (m.role === "user") return { role: "user", content: m.content };
  if (m.role === "assistant") {
    const content: Anthropic.ContentBlockParam[] = [];
    if (m.text) content.push({ type: "text", text: m.text });
    for (const c of m.toolCalls) {
      content.push({ type: "tool_use", id: c.id, name: c.name, input: c.input as Record<string, unknown> });
    }
    return { role: "assistant", content };
  }
  // Anthropic wants tool results inside a *user* message.
  return {
    role: "user",
    content: m.results.map((r) => ({
      type: "tool_result" as const,
      tool_use_id: r.toolCallId,
      content: r.output,
      is_error: r.isError,
    })),
  };
}

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(public model: string, apiKey?: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat({ system, messages, tools }: ChatRequest): Promise<ChatResponse> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
      messages: messages.map(toAnthropic),
    });

    let text = "";
    const toolCalls = [];
    for (const b of res.content) {
      if (b.type === "text") text += b.text;
      if (b.type === "tool_use") toolCalls.push({ id: b.id, name: b.name, input: b.input });
    }
    return { text, toolCalls };
  }
}
