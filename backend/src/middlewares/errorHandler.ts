import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { logger } from "../utils/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const isAppError = err instanceof AppError;
  const isMulterError = err instanceof MulterError;

  const statusCode = isAppError ? err.statusCode : isMulterError ? 400 : 500;
  const code = isAppError ? err.constructor.name : isMulterError ? err.code : "INTERNAL_SERVER_ERROR";
  const message = isAppError || isMulterError ? err.message : "Something went wrong. Please try again later.";

  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`, {
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}
