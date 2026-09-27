import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as glossaryService from "../services/glossary.service";

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const targetLanguage =
      typeof req.query.targetLanguage === "string" ? req.query.targetLanguage : undefined;
    const result = await glossaryService.listGlossaryTerms(req.user!.id, targetLanguage);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await glossaryService.addGlossaryTerm(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await glossaryService.deleteGlossaryTerm(req.user!.id, req.params.id);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (err) {
    next(err);
  }
}
