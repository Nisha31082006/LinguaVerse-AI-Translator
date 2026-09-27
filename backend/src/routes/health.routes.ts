import { Router } from "express";

const router = Router();

const startedAt = Date.now();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
