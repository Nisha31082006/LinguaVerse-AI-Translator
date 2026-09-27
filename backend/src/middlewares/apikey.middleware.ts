import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { verifyApiKey } from "../services/apikey.service";

export interface ApiKeyRequest extends Request {
  apiKeyUserId?: string;
  apiKeyId?: string;
}

export async function requireApiKey(req: ApiKeyRequest, _res: Response, next: NextFunction) {
  const header = req.headers["x-api-key"];
  const rawKey = typeof header === "string" ? header : undefined;

  if (!rawKey) {
    return next(new AppError("Missing X-API-Key header", 401));
  }

  const result = await verifyApiKey(rawKey);
  if (!result) {
    return next(new AppError("Invalid or revoked API key", 401));
  }

  req.apiKeyUserId = result.userId;
  req.apiKeyId = result.keyId;
  next();
}
