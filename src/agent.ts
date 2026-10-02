// LESSON 1: An agent is just a loop.
//   call model -> did it ask for a tool? -> run it -> feed result back -> repeat
// This file knows NOTHING about Anthropic/OpenAI/Gemini. It only uses the neutral types.

import type { LLMProvider, Message, ToolResult } from "./providers/types.js";
import { toolDefinitions, runTool } from "./tools.js";

const MAX_STEPS = 12; // LESSON 4: always cap the loop. Agents can spin forever.

// LESSON 3: The system prompt is the agent's "job description".
const SYSTEM_PROMPT = `You are a practical research and productivity assistant.

You can use tools to do math, read and write files in a sandboxed workspace, and fetch web pages.

Rules:
- Use tools whenever they make the answer more accurate (math, current time, web content, files).
- For multi-step tasks, work step by step and use several tools if needed.
- If a tool returns an error, read it and try a different approach.
- When finished, give a short, clear final answer.`;

export type AgentEvent =
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; output: string; isError: boolean };

export class Agent {
  // LESSON 5: "Memory" is just the messages array. Keep it, and the agent remembers.
  private messages: Message[] = [];

  constructor(private provider: LLMProvider) {}

  reset() {
    this.messages = [];
  }

  async run(userInput: string, onEvent: (e: AgentEvent) => void = () => {}): Promise<string> {
    this.messages.push({ role: "user", content: userInput });

    for (let step = 0; step < MAX_STEPS; step++) {
      const { text, toolCalls, raw } = await this.provider.chat({
        system: SYSTEM_PROMPT,
        messages: this.messages,
        tools: toolDefinitions,
      });

      this.messages.push({ role: "assistant", text, toolCalls, raw });

      // No tool requested: the model is done.
      if (toolCalls.length === 0) return text;

      // Run every requested tool and collect the results.
      const results: ToolResult[] = [];
      for (const call of toolCalls) {
        onEvent({ type: "tool_call", name: call.name, input: call.input });
        const { output, isError } = await runTool(call.name, call.input);
        onEvent({ type: "tool_result", name: call.name, output, isError });
        results.push({ toolCallId: call.id, output, isError });
      }

      this.messages.push({ role: "tool", results });
    }

    return `Stopped after ${MAX_STEPS} steps without finishing. Try a narrower request.`;
  }
}
