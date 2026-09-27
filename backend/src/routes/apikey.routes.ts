import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as apiKeyController from "../controllers/apikey.controller";

const router = Router();
router.use(requireAuth);

router.post("/", apiKeyController.create);
router.get("/", apiKeyController.list);
router.delete("/:id", apiKeyController.revoke);

export default router;
