// LESSON 1: An agent is just a loop.
//   call model -> did it ask for a tool? -> run it -> feed result back -> repeat
// When the model stops asking for tools, it's done.

import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, runTool } from "./tools.js";

const MODEL = process.env.MODEL ?? "claude-sonnet-5-5";
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
  private client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  // LESSON 5: "Memory" is just the messages array. Keep it, and the agent remembers.
  private messages: Anthropic.MessageParam[] = [];

  reset() {
    this.messages = [];
  }

  async run(userInput: string, onEvent: (e: AgentEvent) => void = () => {}): Promise<string> {
    this.messages.push({ role: "user", content: userInput });

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: toolDefinitions,
        messages: this.messages,
      });

      // Always store the assistant turn (including its tool_use blocks).
      this.messages.push({ role: "assistant", content: response.content });

      // Model is done: return its text.
      if (response.stop_reason !== "tool_use") {
        return response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }

      // Model wants tools: run every requested tool, collect results.
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        onEvent({ type: "tool_call", name: block.name, input: block.input });
        const { output, isError } = await runTool(block.name, block.input);
        onEvent({ type: "tool_result", name: block.name, output, isError });
        results.push({
          type: "tool_result",
          tool_use_id: block.id, // must match the tool_use block's id
          content: output,
          is_error: isError,
        });
      }

      // Tool results go back as a *user* message, then the loop continues.
      this.messages.push({ role: "user", content: results });
    }

    return `Stopped after ${MAX_STEPS} steps without finishing. Try a narrower request.`;
  }
}
