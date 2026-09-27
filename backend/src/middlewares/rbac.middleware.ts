import { NextFunction, Response } from "express";
import { AppError } from "./errorHandler";
import { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../config/prisma";

export async function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  // Checked against the DB (not the JWT payload) so a role change or
  // suspension takes effect immediately, without waiting for token expiry.
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user || user.deletedAt) {
    return next(new AppError("Account not found", 401));
  }

  if (user.status === "SUSPENDED") {
    return next(new AppError("Account suspended", 403));
  }

  if (user.role !== "ADMIN") {
    return next(new AppError("Admin access required", 403));
  }

  next();
}
