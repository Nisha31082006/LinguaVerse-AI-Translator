import { apiClient } from "../api/client";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getNotifications(unreadOnly = false) {
  const { data } = await apiClient.get<
    ApiEnvelope<{ items: NotificationItem[]; unreadCount: number }>
  >("/notifications", { params: unreadOnly ? { unread: "true" } : {} });
  return data.data;
}

export async function markNotificationRead(id: string) {
  await apiClient.put(`/notifications/read/${id}`);
}

export async function markAllNotificationsRead() {
  await apiClient.put("/notifications/read-all");
}

export async function deleteNotification(id: string) {
  await apiClient.delete(`/notifications/${id}`);
}
