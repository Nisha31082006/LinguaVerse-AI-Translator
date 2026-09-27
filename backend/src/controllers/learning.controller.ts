import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as learningService from "../services/learning.service";

function requireLangQuery(req: AuthenticatedRequest): string {
  const lang = req.query.language;
  if (!lang || typeof lang !== "string") {
    throw new AppError("A 'language' query parameter is required", 400);
  }
  return lang;
}

export async function getVocabulary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await learningService.listVocabulary(requireLangQuery(req));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getFlashcards(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await learningService.listFlashcards(requireLangQuery(req));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

const flashcardReviewSchema = z.object({
  flashcardId: z.string().min(1),
  result: z.enum(["correct", "incorrect"]),
});

export async function reviewFlashcard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = flashcardReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await learningService.recordFlashcardReview(
      req.user!.id,
      parsed.data.flashcardId,
      parsed.data.result,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getQuizzes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await learningService.listQuizzes(requireLangQuery(req));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

const quizSubmitSchema = z.object({
  quizId: z.string().min(1),
  selectedAnswer: z.string().min(1),
});

export async function submitQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = quizSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await learningService.submitQuizAnswer(
      req.user!.id,
      parsed.data.quizId,
      parsed.data.selectedAnswer,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await learningService.getProgress(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
