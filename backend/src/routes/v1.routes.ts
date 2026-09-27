import { Router, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireApiKey, ApiKeyRequest } from "../middlewares/apikey.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as translateService from "../services/translate.service";

const router = Router();

// Public API keys get their own (tighter) rate limit, independent of the
// session-based /api limiter — keyed by API key, not IP, so one user's
// heavy usage never throttles another user sharing a NAT/proxy.
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests/minute per key
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: ApiKeyRequest) => req.apiKeyId ?? req.ip ?? "unknown",
});

router.use(requireApiKey, publicApiLimiter);

const translateSchema = z.object({
  sourceText: z.string().min(1).max(5000),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().min(2),
  tone: z.enum(["formal", "informal", "professional", "casual", "academic"]).optional(),
});

router.post("/translate", async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = translateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await translateService.translateText(req.apiKeyUserId!, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
