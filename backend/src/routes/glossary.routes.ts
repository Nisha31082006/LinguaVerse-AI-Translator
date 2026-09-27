import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { createGlossaryTermSchema } from "../validators/glossary.validator";
import * as glossaryController from "../controllers/glossary.controller";

const router = Router();
router.use(requireAuth);

router.get("/", glossaryController.list);
router.post("/", validateBody(createGlossaryTermSchema), glossaryController.create);
router.delete("/:id", glossaryController.remove);

export default router;
