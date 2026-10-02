# Build an AI Agent: Practical Starter

A tool-using agent in ~150 lines of TypeScript, built directly on the Anthropic SDK (no framework), so you can see exactly how agents work.

## Run it

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm start
```

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

## Exercises (do these, this is where you learn)

1. **Add a tool**: `search_notes` that greps all files in `workspace/`. Add the schema + handler in `tools.ts`. Nothing else changes.
2. **Break it on purpose**: ask it to read `../package.json`. Watch the sandbox reject it and the agent recover.
3. **Add human approval**: before `write_file` runs, ask `y/n` in the terminal. This is how you make agents safe for real actions.
4. **Persist memory**: save `this.messages` to `memory.json` after each run and load on startup.
5. **Stream output**: switch to `client.messages.stream(...)` so text appears live.
6. **Swap the domain**: replace the tools with your own (database query, REST API, calendar). The loop stays identical.

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
- Log every tool call; debugging agents means reading their traces.
