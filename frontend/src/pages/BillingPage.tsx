import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "../layouts/AppLayout";
import { getPlans, getSubscription, startCheckout, Plan } from "../services/billing.service";

function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function BillingPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") toast.success("Subscription updated!");
    if (checkout === "cancelled") toast("Checkout cancelled", { icon: "ℹ️" });
  }, [searchParams]);

  const { data: plans } = useQuery({ queryKey: ["billing-plans"], queryFn: getPlans });
  const { data: subscription } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: getSubscription,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planTier: "PRO" | "ENTERPRISE") => startCheckout(planTier),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error?.message ??
          err?.message ??
          "Couldn't start checkout — this plan may not have a Stripe price configured yet.",
      );
    },
  });

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold text-primary-600">Billing</h1>
      {subscription && (
        <p className="mb-6 text-sm text-slate-500">
          Current plan: <strong>{subscription.plan.name}</strong> ({subscription.status})
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans?.map((plan: Plan) => {
          const isCurrent = subscription?.plan.tier === plan.tier;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                isCurrent
                  ? "border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold">
                {formatPrice(plan.priceCents, plan.currency)}
                {plan.priceCents > 0 && (
                  <span className="text-sm font-normal text-slate-500">/{plan.interval}</span>
                )}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <button
                disabled={isCurrent || plan.tier === "FREE" || checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate(plan.tier as "PRO" | "ENTERPRISE")}
                className="mt-6 rounded-lg bg-primary-600 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-40"
              >
                {isCurrent ? "Current plan" : plan.tier === "FREE" ? "Default plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Upgrades redirect to Stripe Checkout. Requires a Stripe secret key and price IDs
        configured on the backend — see the README.
      </p>
    </AppLayout>
  );
}
