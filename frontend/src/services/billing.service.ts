import { apiClient } from "../api/client";

export interface Plan {
  id: string;
  tier: "FREE" | "PRO" | "ENTERPRISE";
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  dailyTranslationLimit: number | null;
  features: string[];
}

export interface Subscription {
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
  currentPeriodEnd?: string | null;
  plan: Plan;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<ApiEnvelope<Plan[]>>("/billing/plans");
  return data.data;
}

export async function getSubscription(): Promise<Subscription> {
  const { data } = await apiClient.get<ApiEnvelope<Subscription>>("/billing/subscription");
  return data.data;
}

export async function startCheckout(planTier: "PRO" | "ENTERPRISE"): Promise<string> {
  const { data } = await apiClient.post<ApiEnvelope<{ checkoutUrl: string | null }>>(
    "/billing/checkout-session",
    { planTier },
  );
  if (!data.data.checkoutUrl) throw new Error("No checkout URL returned");
  return data.data.checkoutUrl;
}
