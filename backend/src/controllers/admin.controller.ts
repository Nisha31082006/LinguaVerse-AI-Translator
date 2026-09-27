import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as adminService from "../services/admin.service";

export async function listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await adminService.listUsers(page, pageSize, search);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { status } = req.body as { status: "ACTIVE" | "SUSPENDED" };
    const result = await adminService.setUserStatus(req.user!.id, req.params.id, status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { role } = req.body as { role: "USER" | "ADMIN" };
    const result = await adminService.setUserRole(req.user!.id, req.params.id, role);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function platformStats(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await adminService.getPlatformStats();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
