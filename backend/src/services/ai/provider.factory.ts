import { TranslationProvider } from "./provider.interface";
import { OpenAITranslationProvider } from "./openai.provider";
import { GeminiTranslationProvider } from "./gemini.provider";
import { env } from "../../config/env";

export const AVAILABLE_PROVIDERS = ["gemini", "openai"] as const;
export type ProviderName = (typeof AVAILABLE_PROVIDERS)[number];

// New providers plug in here later — business logic elsewhere only ever
// depends on the TranslationProvider interface, never on which one is active.
//
// No arg -> uses DEFAULT_AI_PROVIDER from the environment (Gemini unless
// explicitly changed). Never silently falls back to a different provider —
// if the configured/requested one isn't set up, it throws a clear error.
export function getTranslationProvider(name?: string): TranslationProvider {
  const resolved = name ?? env.DEFAULT_AI_PROVIDER;
  switch (resolved) {
    case "gemini":
      return new GeminiTranslationProvider();
    case "openai":
      return new OpenAITranslationProvider();
    default:
      throw new Error(`Unknown translation provider: ${resolved}`);
  }
}
