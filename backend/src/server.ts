import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initConversationSocket } from "./socket/conversation.socket";

const app = createApp();
const httpServer = createServer(app);

initConversationSocket(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`🚀 LinguaVerse API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`🔌 Socket.IO live conversation server attached`);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
