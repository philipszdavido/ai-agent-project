import "dotenv/config";
import readline from "node:readline/promises";
import { Agent } from "./agent.js";
import { createProvider } from "./providers/index.js";

let provider;
try {
  provider = createProvider();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

const agent = new Agent(provider);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("close", () => process.exit(0)); // exit cleanly on Ctrl+D or closed stdin

console.log(`Agent ready on ${provider.name} (${provider.model}). Commands: /reset, /exit\n`);

while (true) {
  let input: string;
  try {
    input = (await rl.question("you > ")).trim();
  } catch {
    break; // stdin closed
  }
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
