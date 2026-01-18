'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from './authActions';
import type { PlanTier } from '@/types';
import { getStripe } from '@/services/stripe';
import { getCreditsPriceId, getPlanPriceId } from '@/services/stripePricing';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';

const getOrCreateStripeCustomerId = async (userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripeCustomerId: true, email: true, name: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  if (!user) {
    throw new Error('User not found');
  }

  const stripe = await getStripe();
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: { userId },
  });

  await db.update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
};

export async function getSubscriptionStateAction() {
  const session = await getSession();
  if (!session || !session.userId) {
    return { planTier: 'free' as PlanTier, creditBalance: 0, ahaPackUsed: false };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { planTier: true, creditBalance: true, stripeSubscriptionStatus: true, ahaPackUsed: true },
  });

  return {
    planTier: (user?.planTier as PlanTier) || 'free',
    creditBalance: user?.creditBalance || 0,
    subscriptionStatus: user?.stripeSubscriptionStatus || null,
    ahaPackUsed: user?.ahaPackUsed ?? false,
  };
}

export async function createCheckoutSessionAction(tier: PlanTier) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new Error('Unauthorized');
    }

    console.log('[Checkout] Starting checkout for tier:', tier, 'user:', session.userId);
    console.log('[Checkout] REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
    console.log('[Checkout] STRIPE_PRICE_BASIC set:', !!process.env.STRIPE_PRICE_BASIC);
    console.log('[Checkout] STRIPE_PRICE_PRO set:', !!process.env.STRIPE_PRICE_PRO);

    const priceId = getPlanPriceId(tier);
    console.log('[Checkout] Got price ID:', priceId);

    const stripe = await getStripe();
    console.log('[Checkout] Got Stripe client');

    const stripeCustomerId = await getOrCreateStripeCustomerId(session.userId as string);
    console.log('[Checkout] Got Stripe customer:', stripeCustomerId);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/profile?billing=success`,
      cancel_url: `${siteUrl}/profile?billing=cancel`,
      client_reference_id: session.userId as string,
      allow_promotion_codes: true,
      subscription_data: tier === 'basic' ? { trial_period_days: 3 } : undefined,
      metadata: { userId: session.userId as string, tier, priceId },
    });

    console.log('[Checkout] Created session:', checkoutSession.id);
    return { url: checkoutSession.url };
  } catch (error: any) {
    console.error('[Checkout] Error creating checkout session:', error?.message || error);
    console.error('[Checkout] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function createCreditsCheckoutSessionAction(credits: number) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  const priceId = getCreditsPriceId(credits);
  const stripe = await getStripe();
  const stripeCustomerId = await getOrCreateStripeCustomerId(session.userId as string);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/profile?credits=success`,
    cancel_url: `${siteUrl}/profile?credits=cancel`,
    client_reference_id: session.userId as string,
    metadata: { userId: session.userId as string, credits: String(credits), priceId },
  });

  return { url: checkoutSession.url };
}

export async function createBillingPortalSessionAction() {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error('No billing profile found.');
  }

  const stripe = await getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${siteUrl}/profile`,
  });

  return { url: portalSession.url };
}
