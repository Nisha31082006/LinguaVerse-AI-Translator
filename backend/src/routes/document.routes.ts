import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { documentUpload } from "../middlewares/upload.middleware";
import * as documentController from "../controllers/document.controller";

const router = Router();
router.use(requireAuth);

router.post("/translate", documentUpload.single("document"), documentController.translate);
router.get("/history", documentController.getHistory);
router.get("/:id/download", documentController.download);

export default router;
