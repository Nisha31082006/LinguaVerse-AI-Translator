import { getGeminiClient, getGeminiModelName, classifyGeminiError } from "./ai/gemini.client";
import { AppError } from "../middlewares/errorHandler";
import { prisma } from "../config/prisma";

interface ExplanationResult {
  explanation: string;
  difficultWords: { word: string; meaning: string }[];
  culturalNotes?: string;
}

export async function explainText(text: string, languageCode: string): Promise<ExplanationResult> {
  const client = getGeminiClient();

  const model = client.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction: `You are a patient language tutor. Given a sentence in language code "${languageCode}", respond ONLY with JSON matching exactly:
{
  "explanation": string,       // plain-language grammar/meaning explanation, 2-4 sentences
  "difficultWords": [{"word": string, "meaning": string}],  // up to 5 notable words
  "culturalNotes": string      // optional cultural context, omit if not relevant
}`,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });

  let raw: string;
  try {
    const result = await model.generateContent(text);
    raw = result.response.text();
  } catch (err) {
    throw classifyGeminiError(err);
  }

  if (!raw) throw new AppError("Gemini API request failed: empty response", 502);

  try {
    return JSON.parse(raw) as ExplanationResult;
  } catch {
    throw new AppError("Gemini API request failed: response was not valid JSON", 502);
  }
}

interface GeneratedQuiz {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export async function generateQuiz(languageCode: string, topic?: string) {
  const client = getGeminiClient();

  const model = client.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction: `You write beginner-to-intermediate language-learning quiz questions for language code "${languageCode}"${
      topic ? `, focused on the topic "${topic}"` : ""
    }. Respond ONLY with JSON matching exactly:
{
  "question": string,
  "options": [string, string, string, string],   // exactly 4 options, one of which is correct
  "correctAnswer": string,                        // must exactly match one of the options
  "explanation": string                           // why that answer is correct, 1-2 sentences
}`,
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  let raw: string;
  try {
    const result = await model.generateContent(topic ? `Topic: ${topic}` : "Any beginner-friendly topic");
    raw = result.response.text();
  } catch (err) {
    throw classifyGeminiError(err);
  }

  if (!raw) throw new AppError("Gemini API request failed: empty response", 502);

  let parsed: GeneratedQuiz;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError("Gemini API request failed: response was not valid JSON", 502);
  }

  if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
    throw new AppError("Gemini API request failed: response was a malformed quiz question", 502);
  }

  // Persist it as a real Quiz row so it plugs into the existing quiz-taking flow
  // (GET /api/learning/quiz, POST /api/learning/quiz/submit) exactly like seeded questions.
  const saved = await prisma.quiz.create({
    data: {
      languageCode,
      question: parsed.question,
      options: JSON.stringify(parsed.options),
      correctAnswer: parsed.correctAnswer,
      explanation: parsed.explanation,
      difficulty: "BEGINNER",
    },
  });

  const { correctAnswer: _correctAnswer, ...safeQuiz } = saved;
  return { ...safeQuiz, options: parsed.options };
}
