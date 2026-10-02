// LESSON 6: Provider independence = one neutral format + one adapter per API.
// The agent loop and the tools only ever see these types.

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
};

export type ToolCall = { id: string; name: string; input: unknown };
export type ToolResult = { toolCallId: string; output: string; isError: boolean };

export type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[]; raw?: unknown }
  | { role: "tool"; results: ToolResult[] };

export type ChatRequest = { system: string; messages: Message[]; tools: ToolDef[] };
// `raw` = provider-specific data (e.g. Gemini thought signatures) that must be echoed back untouched.
export type ChatResponse = { text: string; toolCalls: ToolCall[]; raw?: unknown };

export interface LLMProvider {
  name: string;
  model: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
}
