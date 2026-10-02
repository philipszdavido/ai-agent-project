import "dotenv/config";
import readline from "node:readline/promises";
import { Agent } from "./agent.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const agent = new Agent();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("Agent ready. Type a task. Commands: /reset, /exit\n");

while (true) {
  const input = (await rl.question("you > ")).trim();
  if (!input) continue;
  if (input === "/exit") break;
  if (input === "/reset") {
    agent.reset();
    console.log("(memory cleared)\n");
    continue;
  }

  try {
    const answer = await agent.run(input, (e) => {
      if (e.type === "tool_call") console.log(`  🔧 ${e.name}(${JSON.stringify(e.input)})`);
      else console.log(`  ${e.isError ? "❌" : "✅"} ${e.output.slice(0, 120).replace(/\n/g, " ")}`);
    });
    console.log(`\nagent > ${answer}\n`);
  } catch (err) {
    console.error("Error:", (err as Error).message, "\n");
  }
}
rl.close();
