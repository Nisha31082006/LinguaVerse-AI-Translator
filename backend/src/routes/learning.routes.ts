import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as learningController from "../controllers/learning.controller";

const router = Router();
router.use(requireAuth);

router.get("/words", learningController.getVocabulary);
router.get("/flashcards", learningController.getFlashcards);
router.post("/flashcards/review", learningController.reviewFlashcard);
router.get("/quiz", learningController.getQuizzes);
router.post("/quiz/submit", learningController.submitQuiz);
router.get("/progress", learningController.getProgress);

export default router;
