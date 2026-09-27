import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

const router = Router();
router.use(requireAuth);

router.get("/", notificationController.list);
router.put("/read/:id", notificationController.markRead);
router.put("/read-all", notificationController.markAllRead);
router.delete("/:id", notificationController.remove);

export default router;
