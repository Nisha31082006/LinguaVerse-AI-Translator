import { Router } from "express";
import * as translateController from "../controllers/translate.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { translateTextSchema } from "../validators/translate.validator";

const router = Router();

router.use(requireAuth);

router.post("/text", validateBody(translateTextSchema), translateController.translateTextHandler);
router.post("/compare", translateController.compareProvidersHandler);
router.get("/history", translateController.getHistoryHandler);
router.delete("/:id", translateController.deleteTranslationHandler);

export default router;
