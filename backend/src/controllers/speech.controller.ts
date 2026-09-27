import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as speechService from "../services/speech.service";

export async function transcribe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError("An audio file is required (field name: audio)", 400);
    }
    const targetLanguage =
      typeof req.body.targetLanguage === "string" && req.body.targetLanguage.length > 0
        ? req.body.targetLanguage
        : undefined;

    const result = await speechService.transcribeAudio(
      req.user!.id,
      { path: req.file.path, originalname: req.file.originalname },
      { targetLanguage },
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// text-to-speech was removed from the backend entirely — see
// frontend/src/pages/SpeechPage.tsx, which now uses the browser's
// built-in Web Speech API instead of a server call.

export async function getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await speechService.getVoiceHistory(req.user!.id, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
