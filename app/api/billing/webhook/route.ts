import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { creditTransactions, users } from '@/db/schema';
import { getStripe } from '@/services/stripe';
import { getCreditsFromPriceId, getTierFromPriceId } from '@/services/stripePricing';

export const runtime = 'nodejs';

const toDate = (unixSeconds?: number | null) =>
  unixSeconds ? new Date(unixSeconds * 1000) : null;

const resolveUserIdFromSession = async (session: Stripe.Checkout.Session) => {
  const candidateId = session.client_reference_id || session.metadata?.userId;
  if (candidateId) return candidateId;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
    columns: { id: true },
  });
  return user?.id || null;
};

const updateSubscriptionForCustomer = async (customerId: string, subscription: Stripe.Subscription) => {
  const priceId = subscription.items.data[0]?.price?.id;
  const mappedTier = getTierFromPriceId(priceId);
  if (!mappedTier && priceId) {
    console.warn('[STRIPE] Unmapped subscription price', { priceId });
  }
  const planTier = mappedTier || 'free';

  await db.update(users)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: priceId || null,
      subscriptionCurrentPeriodEnd: toDate(subscription.current_period_end),
      trialEndsAt: toDate(subscription.trial_end),
      planTier,
    })
    .where(eq(users.stripeCustomerId, customerId));
};

const handleCreditPurchase = async (session: Stripe.Checkout.Session, eventId: string) => {
  const stripe = await getStripe();
  const userId = await resolveUserIdFromSession(session);
  if (!userId) {
    console.warn('[STRIPE] Credit purchase missing user mapping', { sessionId: session.id });
    return;
  }

  let credits = Number(session.metadata?.credits || 0);
  let priceId = session.metadata?.priceId;

  if (!credits) {
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price'],
    });
    priceId = expanded.line_items?.data?.[0]?.price?.id;
    credits = getCreditsFromPriceId(priceId) || 0;
  }

  if (!credits) {
    console.warn('[STRIPE] Unable to resolve credit pack for session', { sessionId: session.id, priceId });
    return;
  }

  const [entry] = await db.insert(creditTransactions)
    .values({
      userId,
      amount: credits,
      reason: 'stripe_purchase',
      stripeSessionId: session.id,
      stripeEventId: eventId,
    })
    .onConflictDoNothing()
    .returning();

  if (!entry) {
    console.info('[STRIPE] Credit purchase already processed', { sessionId: session.id });
    return;
  }

  await db.update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${credits}` })
    .where(eq(users.id, userId));

  console.info('[STRIPE] Credited user', { userId, credits, sessionId: session.id });
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing Stripe webhook secret or signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[STRIPE] Webhook signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          await handleCreditPurchase(session, event.id);
        }
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = await getStripe();
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
          await updateSubscriptionForCustomer(customerId, subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        await updateSubscriptionForCustomer(customerId, subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        await db.update(users)
          .set({
            stripeSubscriptionId: null,
            stripeSubscriptionStatus: subscription.status,
            stripePriceId: null,
            subscriptionCurrentPeriodEnd: null,
            trialEndsAt: null,
            planTier: 'free',
          })
          .where(eq(users.stripeCustomerId, customerId));
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('[STRIPE] Webhook handling error', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
