import { Response, NextFunction, Request } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../middlewares/errorHandler";
import * as billingService from "../services/billing.service";

const checkoutSchema = z.object({
  planTier: z.enum(["PRO", "ENTERPRISE"]),
});

export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await billingService.listPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const subscription = await billingService.getUserSubscription(req.user!.id);
    res.json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
}

export async function createCheckoutSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join("; "), 400);
    }
    const result = await billingService.createCheckoutSession(
      req.user!.id,
      parsed.data.planTier,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** Note: req.body here is a raw Buffer — this route uses express.raw(), not express.json(). */
export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      throw new AppError("Missing Stripe signature header", 400);
    }
    await billingService.handleWebhookEvent(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
