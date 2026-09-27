import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { getTranslationProvider } from "../services/ai/provider.factory";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

interface JoinRoomPayload {
  roomCode: string;
}

interface SpeakPayload {
  roomCode: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export function initConversationSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  // Authenticate every socket connection using the same JWT access tokens as the REST API
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      socket.userEmail = payload.email;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.userEmail} (${socket.id})`);

    socket.on("join-room", ({ roomCode }: JoinRoomPayload) => {
      if (!roomCode) return;
      socket.join(roomCode);
      socket.to(roomCode).emit("peer-joined", { userEmail: socket.userEmail });
      socket.emit("joined-room", { roomCode });
    });

    socket.on("leave-room", ({ roomCode }: JoinRoomPayload) => {
      socket.leave(roomCode);
      socket.to(roomCode).emit("peer-left", { userEmail: socket.userEmail });
    });

    socket.on("speak", async (payload: SpeakPayload) => {
      const { roomCode, text, sourceLanguage, targetLanguage } = payload;
      if (!roomCode || !text?.trim()) return;

      // Echo the original immediately so the room feels responsive while translation runs
      io.to(roomCode).emit("utterance", {
        speaker: socket.userEmail,
        originalText: text,
        sourceLanguage,
        translatedText: null,
        timestamp: new Date().toISOString(),
      });

      try {
        const provider = getTranslationProvider();
        const result = await provider.translate({
          sourceText: text,
          sourceLanguage,
          targetLanguage,
        });

        io.to(roomCode).emit("translation", {
          speaker: socket.userEmail,
          originalText: text,
          translatedText: result.translatedText,
          targetLanguage,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        socket.emit("translation-error", {
          message: "Translation failed for this message",
        });
        logger.error(`Live conversation translation failed: ${(err as Error).message}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.userEmail} (${socket.id})`);
    });
  });

  return io;
}
