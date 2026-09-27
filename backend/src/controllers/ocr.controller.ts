import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as ocrService from "../services/ocr.service";

export async function processImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError("An image file is required (field name: image)", 400);
    }

    const targetLanguage =
      typeof req.body.targetLanguage === "string" && req.body.targetLanguage.length > 0
        ? req.body.targetLanguage
        : undefined;

    const result = await ocrService.processImage(
      req.user!.id,
      { path: req.file.path, originalname: req.file.originalname },
      { targetLanguage },
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await ocrService.getOcrHistory(req.user!.id, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
