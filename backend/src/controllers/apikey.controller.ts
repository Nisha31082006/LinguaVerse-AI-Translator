import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as apiKeyService from "../services/apikey.service";

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await apiKeyService.createApiKey(req.user!.id, parsed.data.name);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await apiKeyService.listApiKeys(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function revoke(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await apiKeyService.revokeApiKey(req.user!.id, req.params.id);
    res.json({ success: true, data: { message: "Revoked" } });
  } catch (err) {
    next(err);
  }
}
