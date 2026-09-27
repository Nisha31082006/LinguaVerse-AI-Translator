import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as billingController from "../controllers/billing.controller";

const router = Router();

router.get("/plans", billingController.getPlans); // public — pricing page doesn't require login
router.get("/subscription", requireAuth, billingController.getSubscription);
router.post("/checkout-session", requireAuth, billingController.createCheckoutSession);

export default router;
