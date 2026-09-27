import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();
router.use(requireAuth);

router.get("/stats", dashboardController.getStats);

export default router;
