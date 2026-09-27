import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as dashboardService from "../services/dashboard.service";

export async function getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await dashboardService.getDashboardStats(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
