import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { updateStatusSchema, updateRoleSchema } from "../validators/admin.validator";
import * as adminController from "../controllers/admin.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", adminController.platformStats);
router.get("/users", adminController.listUsers);
router.put("/users/:id/status", validateBody(updateStatusSchema), adminController.updateUserStatus);
router.put("/users/:id/role", validateBody(updateRoleSchema), adminController.updateUserRole);

export default router;
