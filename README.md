# Build an AI Agent: Practical Starter

A tool-using agent in TypeScript that works with **any LLM provider** (Anthropic, OpenAI, Gemini, Groq, OpenRouter, local Ollama). No framework, so you can see exactly how agents work.

## Run it

```bash
npm install
cp .env.example .env      # set PROVIDER and the matching API key
npm start
```

No key yet? Try it free and offline: `PROVIDER=mock npm start` (a fake model that calls the calculator, so you can watch the loop).

## Switching providers (one line in `.env`)

| PROVIDER | Key variable | Default model (override with `MODEL=`) |
|----------|-------------|----------------------------------------|
| `anthropic` | `ANTHROPIC_API_KEY` | claude-sonnet-5-5 |
| `openai` | `OPENAI_API_KEY` | gpt-4o-mini |
| `gemini` | `GEMINI_API_KEY` | gemini-3.5-flash |
| `groq` | `GROQ_API_KEY` | llama-3.3-70b-versatile |
| `openrouter` | `OPENROUTER_API_KEY` | openai/gpt-4o-mini |
| `ollama` | none (runs locally) | llama3.1 |
| `mock` | none | fake model for learning/testing |

Model names change often. If you get a 404, set `MODEL` to a current name from the provider's docs.

Try these:

1. `How much of my budget is left? Check notes.txt and calculate the percentage spent.`
2. `Fetch https://example.com and save a 3-bullet summary to summary.md`
3. `What's the date, and how many days until 2026-12-15?`

Watch the 🔧 lines: that's the agent deciding which tools to call.

## The 5 lessons (read the code in this order)

| # | Concept | Where | Key idea |
|---|---------|-------|----------|
| 1 | The loop | `src/agent.ts` | An agent = call model → run requested tools → feed results back → repeat until `stop_reason !== "tool_use"` |
| 2 | Tools | `src/tools.ts` | A tool is a JSON schema + a handler. The model only *requests* calls; your code executes them |
| 3 | System prompt | `src/agent.ts` | Defines the agent's role, rules, and when to use tools |
| 4 | Guardrails | both | Step cap, sandboxed file paths, errors returned as text so the model can recover |
| 5 | Memory | `src/agent.ts` | Memory is the `messages` array. Persist it and the agent remembers across sessions |
| 6 | Provider adapters | `src/providers/` | One neutral message/tool format. Each provider gets a small adapter that translates to its API |
| 7 | Config over code | `src/providers/index.ts` | The provider is chosen from `PROVIDER`, so the agent code never changes |

### Provider-specific data (`raw`)

Some providers attach hidden state to a reply that you must send back unchanged. Gemini 3 puts encrypted "thought signatures" on tool calls and returns a 400 if you drop them. The neutral `Message` therefore carries an optional `raw` field: the adapter stores the provider's original reply there and echoes it back on the next turn. If a provider works for one step and fails with a 400 on the second, suspect this first.

### How the adapters differ (this is the real learning)

| | Anthropic | OpenAI-style (OpenAI, Gemini, Groq...) |
|---|---|---|
| System prompt | separate `system` field | first message with role `system` |
| Tool schema | `input_schema` | `function.parameters` |
| Tool call args | already a parsed object | a JSON *string* you must parse |
| Tool results | blocks inside one `user` message | one `role: "tool"` message per result |

`openai.ts` covers many providers at once because most of them copy OpenAI's API shape. Gemini is used through its OpenAI-compatible endpoint.

## Exercises (do these, this is where you learn)

1. **Add a tool**: `search_notes` that greps all files in `workspace/`. Add the schema + handler in `tools.ts`. Nothing else changes.
2. **Break it on purpose**: ask it to read `../package.json`. Watch the sandbox reject it and the agent recover.
3. **Add human approval**: before `write_file` runs, ask `y/n` in the terminal. This is how you make agents safe for real actions.
4. **Persist memory**: save `this.messages` to `memory.json` after each run and load on startup.
5. **Stream output**: switch to `client.messages.stream(...)` so text appears live.
6. **Add a provider**: write `src/providers/gemini-native.ts` using Google's `@google/genai` SDK (implement `LLMProvider.chat`), register it in `providers/index.ts`. The agent and tools won't change.
7. **Fallbacks**: wrap two providers so if one errors or rate-limits, the call retries on the other.
8. **Swap the domain**: replace the tools with your own (database query, REST API, calendar). The loop stays identical.

## Next level

- **Context limits**: long sessions grow the messages array. Summarize or trim old turns.
- **Evals**: write 10 test tasks with expected outcomes and run them after every prompt/tool change.
- **Planning**: for big tasks, have the agent write a plan to a file first, then execute it.
- **Sub-agents**: a second `Agent` instance with different tools and prompt, exposed to the first as a tool.
- **MCP**: expose your tools via the Model Context Protocol so any compatible client can use them.

## Rules of thumb

- Tool descriptions are prompts. Write them like instructions to a new hire.
- Fewer, well-named tools beat many overlapping ones.
- Never give an agent more access than the task needs.
- Tool-calling quality varies a lot between models. Small local models often pick wrong tools or emit bad JSON. Test your agent on each provider you plan to support.
- Log every tool call; debugging agents means reading their traces.
