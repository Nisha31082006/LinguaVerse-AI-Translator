import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as favoriteService from "../services/favorite.service";

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await favoriteService.listFavorites(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function add(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await favoriteService.addFavorite(req.user!.id, req.body.translationId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await favoriteService.removeFavorite(req.user!.id, req.params.translationId);
    res.json({ success: true, data: { message: "Removed" } });
  } catch (err) {
    next(err);
  }
}
