import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as tutorService from "../services/tutor.service";

const explainSchema = z.object({
  text: z.string().min(1).max(1000),
  language: z.string().min(2).max(10),
});

export async function explain(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = explainSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await tutorService.explainText(parsed.data.text, parsed.data.language);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

const generateQuizSchema = z.object({
  language: z.string().min(2).max(10),
  topic: z.string().max(100).optional(),
});

export async function generateQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = generateQuizSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await tutorService.generateQuiz(parsed.data.language, parsed.data.topic);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
