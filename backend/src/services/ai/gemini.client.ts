import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";

let cachedClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      "GEMINI_API_KEY is not configured on the server. Get a free key at https://aistudio.google.com/app/apikey and set it in backend/.env.",
      503,
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return cachedClient;
}

export function getGeminiModelName(): string {
  return env.GEMINI_MODEL;
}

/**
 * Turns a raw Gemini SDK error into a clear, specific AppError instead of a
 * generic 500 — distinguishes invalid key / rate limit / quota / model
 * unavailable / network issues where the SDK's error message allows it.
 */
export function classifyGeminiError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return new AppError(
      "Gemini API request failed: your GEMINI_API_KEY is invalid. Check it at https://aistudio.google.com/app/apikey.",
      401,
    );
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
    return new AppError(
      "Gemini API request failed: rate limit or free-tier quota exceeded. Wait a moment and try again, or check your quota at https://aistudio.google.com/app/apikey.",
      429,
    );
  }
  if (lower.includes("404") || lower.includes("not found") || lower.includes("model")) {
    return new AppError(
      `Gemini API request failed: model "${getGeminiModelName()}" is unavailable. Set GEMINI_MODEL in backend/.env to a currently supported model name.`,
      502,
    );
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound")
  ) {
    return new AppError(
      "Gemini API request failed: network error reaching Google's API. Check your internet connection.",
      502,
    );
  }

  return new AppError(`Gemini API request failed: ${message}`, 502);
}
