import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as tutorController from "../controllers/tutor.controller";

const router = Router();
router.use(requireAuth);

router.post("/explain", tutorController.explain);
router.post("/generate-quiz", tutorController.generateQuiz);

export default router;
