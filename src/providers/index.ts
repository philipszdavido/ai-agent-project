// LESSON 7: Pick the provider from config, not code. Switch with one env var.

import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { MockProvider } from "./mock.js";
import type { LLMProvider } from "./types.js";

type Preset = { keyEnv?: string; baseURL?: string; model: string };

// Model names change often. If one 404s, set MODEL in .env to a current one.
const OPENAI_COMPATIBLE: Record<string, Preset> = {
  openai: { keyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  gemini: {
    keyEnv: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-3.5-flash",
  },
  groq: { keyEnv: "GROQ_API_KEY", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openrouter: { keyEnv: "OPENROUTER_API_KEY", baseURL: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  // Local models, no key needed: install Ollama, then `ollama pull llama3.1`
  ollama: { baseURL: "http://localhost:11434/v1", model: "llama3.1" },
};

export const AVAILABLE_PROVIDERS = ["anthropic", ...Object.keys(OPENAI_COMPATIBLE), "mock"];

export function createProvider(): LLMProvider {
  const name = (process.env.PROVIDER ?? "anthropic").toLowerCase();
  const modelOverride = process.env.MODEL;

  if (name === "mock") return new MockProvider();

  if (name === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY in .env");
    return new AnthropicProvider(modelOverride ?? "claude-sonnet-5-5", key);
  }

  const preset = OPENAI_COMPATIBLE[name];
  if (!preset) {
    throw new Error(`Unknown PROVIDER "${name}". Choose one of: ${AVAILABLE_PROVIDERS.join(", ")}`);
  }
  const key = preset.keyEnv ? process.env[preset.keyEnv] : "not-needed";
  if (!key) throw new Error(`Missing ${preset.keyEnv} in .env`);
  return new OpenAICompatibleProvider(name, modelOverride ?? preset.model, key, preset.baseURL);
}
