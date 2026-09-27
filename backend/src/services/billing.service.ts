import Stripe from "stripe";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../middlewares/errorHandler";

function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(
      "STRIPE_SECRET_KEY is not configured on the server. Set it in backend/.env to enable billing.",
      503,
    );
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function listPlans() {
  const plans = await prisma.plan.findMany({ orderBy: { priceCents: "asc" } });
  return plans.map((p) => ({ ...p, features: JSON.parse(p.features) as string[] }));
}

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!subscription) {
    // Should not normally happen (seed/registration should assign FREE), but degrade gracefully
    const freePlan = await prisma.plan.findUnique({ where: { tier: "FREE" } });
    return freePlan
      ? { plan: { ...freePlan, features: JSON.parse(freePlan.features) }, status: "ACTIVE" as const }
      : null;
  }

  return {
    ...subscription,
    plan: { ...subscription.plan, features: JSON.parse(subscription.plan.features) as string[] },
  };
}

export async function createCheckoutSession(userId: string, planTier: "PRO" | "ENTERPRISE") {
  const stripe = getStripeClient();

  const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
  if (!plan || !plan.stripePriceId) {
    throw new AppError(
      `Plan ${planTier} isn't configured with a Stripe price yet. Set STRIPE_PRICE_ID_${planTier} and re-seed.`,
      503,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const existingSub = await prisma.userSubscription.findUnique({ where: { userId } });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: existingSub?.stripeCustomerId ? undefined : user.email,
    customer: existingSub?.stripeCustomerId ?? undefined,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/billing?checkout=success`,
    cancel_url: `${env.FRONTEND_URL}/billing?checkout=cancelled`,
    metadata: { userId, planTier },
  });

  return { checkoutUrl: session.url };
}

/** Verifies and applies a Stripe webhook event. rawBody must be the untouched request body Buffer. */
export async function handleWebhookEvent(rawBody: Buffer, signature: string) {
  const stripe = getStripeClient();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError("STRIPE_WEBHOOK_SECRET is not configured", 503);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new AppError("Invalid Stripe webhook signature", 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planTier = session.metadata?.planTier as "PRO" | "ENTERPRISE" | undefined;
      if (!userId || !planTier) break;

      const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
      if (!plan) break;

      await prisma.userSubscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          status: "ACTIVE",
          stripeCustomerId: String(session.customer ?? ""),
          stripeSubscriptionId: String(session.subscription ?? ""),
        },
        create: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          stripeCustomerId: String(session.customer ?? ""),
          stripeSubscriptionId: String(session.subscription ?? ""),
        },
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.userSubscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      if (!existing) break;

      const statusMap: Record<string, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED"> = {
        active: "ACTIVE",
        trialing: "TRIALING",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "PAST_DUE",
      };

      await prisma.userSubscription.update({
        where: { id: existing.id },
        data: {
          status: statusMap[sub.status] ?? "ACTIVE",
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
      break;
    }

    default:
      break; // other event types intentionally ignored
  }
}
