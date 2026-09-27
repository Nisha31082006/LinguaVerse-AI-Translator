import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { imageUpload } from "../middlewares/upload.middleware";
import * as ocrController from "../controllers/ocr.controller";

const router = Router();
router.use(requireAuth);

router.post("/image", imageUpload.single("image"), ocrController.processImage);
router.get("/history", ocrController.getHistory);

export default router;
