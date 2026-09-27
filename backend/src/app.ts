import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { logger } from "./utils/logger";
import { notFoundHandler, globalErrorHandler } from "./middlewares/errorHandler";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import translateRoutes from "./routes/translate.routes";
import favoriteRoutes from "./routes/favorite.routes";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import ocrRoutes from "./routes/ocr.routes";
import adminRoutes from "./routes/admin.routes";
import speechRoutes from "./routes/speech.routes";
import documentRoutes from "./routes/document.routes";
import billingRoutes from "./routes/billing.routes";
import learningRoutes from "./routes/learning.routes";
import tutorRoutes from "./routes/tutor.routes";
import glossaryRoutes from "./routes/glossary.routes";
import apiKeyRoutes from "./routes/apikey.routes";
import v1Routes from "./routes/v1.routes";
import { webhook as billingWebhook } from "./controllers/billing.controller";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(compression());

  // Stripe webhook needs the raw request body to verify its signature, so it
  // must be registered BEFORE express.json() parses the body into an object.
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhook);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan("combined", {
      stream: { write: (message: string) => logger.info(message.trim()) },
    }),
  );

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);

  // Health checks live outside /api so they're never rate-limited
  app.use("/", healthRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/translate", translateRoutes);
  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/ocr", ocrRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/speech", speechRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/learning", learningRoutes);
  app.use("/api/learning/tutor", tutorRoutes);
  app.use("/api/glossary", glossaryRoutes);
  app.use("/api/api-keys", apiKeyRoutes);

  // Public, API-key-authenticated surface for third-party integrations
  // (separate from the session/JWT-based routes above).
  app.use("/api/v1", v1Routes);

  // Further feature routers (multi-tenancy, ...) get mounted here as each
  // module is built out.

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
