import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

function meta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerUser(req.body, meta(req));
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body, meta(req));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken, meta(req));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logoutUser(req.body.refreshToken);
    res.status(200).json({ success: true, data: { message: "Logged out" } });
  } catch (err) {
    next(err);
  }
}

export async function profile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await authService.getProfile(req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
