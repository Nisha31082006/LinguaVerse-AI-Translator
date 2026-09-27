import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as documentService from "../services/document.service";

export async function translate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError("A document file is required (field name: document)", 400);
    }
    const targetLanguage = req.body.targetLanguage;
    if (!targetLanguage || typeof targetLanguage !== "string") {
      throw new AppError("targetLanguage is required", 400);
    }

    const result = await documentService.translateDocument(
      req.user!.id,
      { path: req.file.path, originalname: req.file.originalname, mimetype: req.file.mimetype },
      targetLanguage,
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
    const result = await documentService.getDocumentHistory(req.user!.id, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function download(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { filePath, fileName } = await documentService.getDownloadPath(
      req.user!.id,
      req.params.id,
    );
    res.download(filePath, fileName, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}
