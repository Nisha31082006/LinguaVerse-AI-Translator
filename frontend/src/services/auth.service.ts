import { apiClient } from "../api/client";

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatar: string | null;
  country: string | null;
  preferredLanguage: string | null;
  role: "USER" | "ADMIN";
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function registerRequest(payload: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>("/auth/register", payload);
  return data.data;
}

export async function loginRequest(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>("/auth/login", payload);
  return data.data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await apiClient.post("/auth/logout", { refreshToken });
}

export async function fetchProfile(): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiEnvelope<AuthUser>>("/auth/profile");
  return data.data;
}
