// LESSON 2: Tools = a schema (what the model sees) + a handler (what your code runs).
// The model never executes anything. It only *asks* you to run a tool.

import type { ToolDef } from "./providers/types.js";
import { evaluate } from "mathjs";
import fs from "node:fs/promises";
import path from "node:path";

// All file access is locked to this folder. Never give an agent the whole disk.
const WORKSPACE = path.resolve("workspace");

function safePath(p: string): string {
  const full = path.resolve(WORKSPACE, p);
  if (!full.startsWith(WORKSPACE + path.sep) && full !== WORKSPACE) {
    throw new Error("Path escapes the workspace folder");
  }
  return full;
}

// 1) What the model sees: names, descriptions, JSON schemas.
//    Good descriptions matter more than clever code.
export const toolDefinitions: ToolDef[] = [
  {
    name: "calculate",
    description:
      "Evaluate a math expression exactly, e.g. '(1200 * 1.075) ^ 2'. Use this for any arithmetic instead of computing in your head.",
    parameters: {
      type: "object",
      properties: { expression: { type: "string", description: "The math expression" } },
      required: ["expression"],
    },
  },
  {
    name: "get_time",
    description: "Get the current date and time in ISO format (UTC).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_files",
    description: "List files in the workspace folder.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "read_file",
    description: "Read a text file from the workspace.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Relative path, e.g. notes.md" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a text file in the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path, e.g. summary.md" },
        content: { type: "string", description: "Full file contents" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "fetch_url",
    description:
      "Download a web page and return its text content (HTML stripped, truncated to ~8000 chars).",
    parameters: {
      type: "object",
      properties: { url: { type: "string", description: "Full https:// URL" } },
      required: ["url"],
    },
  },
];

// 2) What your code runs: one handler per tool.
type Handler = (input: any) => Promise<string>;

const handlers: Record<string, Handler> = {
  async calculate({ expression }) {
    return String(evaluate(expression));
  },
  async get_time() {
    return new Date().toISOString();
  },
  async list_files() {
    await fs.mkdir(WORKSPACE, { recursive: true });
    const files = await fs.readdir(WORKSPACE);
    return files.length ? files.join("\n") : "(workspace is empty)";
  },
  async read_file({ path: p }) {
    return await fs.readFile(safePath(p), "utf8");
  },
  async write_file({ path: p, content }) {
    const full = safePath(p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
    return `Wrote ${content.length} characters to ${p}`;
  },
  async fetch_url({ url }) {
    if (!/^https?:\/\//.test(url)) throw new Error("URL must start with http(s)://");
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 8000);
  },
};

// 3) The dispatcher. Errors are returned as text (not thrown) so the model can
//    read the error and recover. This is what makes agents feel "smart".
export async function runTool(name: string, input: unknown): Promise<{ output: string; isError: boolean }> {
  const handler = handlers[name];
  if (!handler) return { output: `Unknown tool: ${name}`, isError: true };
  try {
    return { output: await handler(input), isError: false };
  } catch (err) {
    return { output: `Error: ${(err as Error).message}`, isError: true };
  }
}
