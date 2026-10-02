// A fake LLM for learning and testing the loop with NO API key and NO cost.
import type { ChatRequest, ChatResponse, LLMProvider } from "./types.js";

export class MockProvider implements LLMProvider {
  name = "mock";
  model = "mock-1";

  async chat({ messages }: ChatRequest): Promise<ChatResponse> {
    const last = messages[messages.length - 1];
    if (last.role === "tool") {
      return { text: `(mock) The calculator said: ${last.results[0].output}`, toolCalls: [] };
    }
    return {
      text: "",
      toolCalls: [{ id: "mock_1", name: "calculate", input: { expression: "1875.5 / 4500 * 100" } }],
    };
  }
}
