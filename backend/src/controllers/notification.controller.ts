import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as notificationService from "../services/notification.service";

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const unreadOnly = req.query.unread === "true";
    const [items, unread] = await Promise.all([
      notificationService.listNotifications(req.user!.id, unreadOnly),
      notificationService.unreadCount(req.user!.id),
    ]);
    res.json({ success: true, data: { items, unreadCount: unread } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.markAsRead(req.user!.id, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.deleteNotification(req.user!.id, req.params.id);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (err) {
    next(err);
  }
}
