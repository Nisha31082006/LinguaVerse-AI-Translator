import { Response, NextFunction } from "express";
import { z } from "zod";
import * as translateService from "../services/translate.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";

export async function translateTextHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await translateService.translateText(req.user!.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getHistoryHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await translateService.getHistory(req.user!.id, page, pageSize);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteTranslationHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await translateService.deleteTranslation(req.user!.id, req.params.id);
    res.status(200).json({ success: true, data: { message: "Deleted" } });
  } catch (err) {
    next(err);
  }
}

const compareSchema = z.object({
  sourceText: z.string().min(1).max(2000),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().min(2),
});

export async function compareProvidersHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = compareSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await translateService.compareProviders(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
