import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { audioUpload } from "../middlewares/upload.middleware";
import * as speechController from "../controllers/speech.controller";

const router = Router();
router.use(requireAuth);

router.post("/transcribe", audioUpload.single("audio"), speechController.transcribe);
router.get("/history", speechController.getHistory);
// text-to-speech route removed — the frontend uses the browser's Web
// Speech API instead of a backend call. See SpeechPage.tsx.

export default router;
