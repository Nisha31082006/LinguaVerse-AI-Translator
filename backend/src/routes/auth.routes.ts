import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validateBody } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema, refreshSchema } from "../validators/auth.validator";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/refresh-token", validateBody(refreshSchema), authController.refresh);
router.post("/logout", validateBody(refreshSchema), authController.logout);
router.get("/profile", requireAuth, authController.profile);

export default router;
