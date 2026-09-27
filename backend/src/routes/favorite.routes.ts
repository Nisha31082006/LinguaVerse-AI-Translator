import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as favoriteController from "../controllers/favorite.controller";

const router = Router();
router.use(requireAuth);

router.get("/", favoriteController.list);
router.post("/", favoriteController.add);
router.delete("/:translationId", favoriteController.remove);

export default router;
