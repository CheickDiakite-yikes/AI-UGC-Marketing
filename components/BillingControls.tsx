'use client';

import React, { useState, useTransition } from 'react';
import type { PlanTier } from '@/types';
import { createBillingPortalSessionAction, createCheckoutSessionAction } from '@/app/actions/subscriptionActions';

type BillingControlsProps = {
  planTier: PlanTier;
  creditBalance: number;
  subscriptionStatus?: string | null;
};

const BillingControls: React.FC<BillingControlsProps> = ({ planTier, creditBalance, subscriptionStatus }) => {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingPlan, setPendingPlan] = useState<PlanTier | null>(null);
  const hasActiveBilling = planTier !== 'free' || Boolean(subscriptionStatus);
  const isFree = planTier === 'free';

  const handleManageBilling = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createBillingPortalSessionAction();
        if (result?.url) {
          window.location.href = result.url;
        } else {
          setError('Unable to open billing portal. Try again shortly.');
        }
      } catch (err) {
        console.error('Billing portal error', err);
        setError('Billing portal is unavailable. Start a plan in-app first.');
      }
    });
  };

  const handleUpgrade = (tier: PlanTier) => {
    setError(null);
    setPendingPlan(tier);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction(tier);
        if (result?.url) {
          window.location.href = result.url;
        } else {
          setError('Unable to start checkout. Try again shortly.');
        }
      } catch (err) {
        console.error('Checkout error', err);
        setError('Checkout is unavailable. Please try again.');
      } finally {
        setPendingPlan(null);
      }
    });
  };

  return (
    <div>
      <div className="grid gap-2 text-xs text-gray-700">
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-widest text-[10px] text-gray-500">Plan</span>
          <span className="font-bold capitalize">{planTier}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-widest text-[10px] text-gray-500">Status</span>
          <span className="font-bold">{subscriptionStatus || 'inactive'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-widest text-[10px] text-gray-500">Credits</span>
          <span className="font-bold">{creditBalance}</span>
        </div>
      </div>

      {isFree ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => handleUpgrade('basic')}
            disabled={isPending}
            className="w-full bg-neo-pink text-black border-2 border-black py-2 text-xs font-black uppercase tracking-widest hover:bg-neo-lime transition-all disabled:opacity-60"
          >
            {pendingPlan === 'basic' ? 'Loading...' : 'Upgrade to Basic - $29/mo'}
          </button>
          <button
            type="button"
            onClick={() => handleUpgrade('pro')}
            disabled={isPending}
            className="w-full bg-neo-cyan text-black border-2 border-black py-2 text-xs font-black uppercase tracking-widest hover:bg-neo-lime transition-all disabled:opacity-60"
          >
            {pendingPlan === 'pro' ? 'Loading...' : 'Upgrade to Pro - $79/mo'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleManageBilling}
          disabled={isPending || !hasActiveBilling}
          className="mt-4 w-full bg-neo-black text-white border-2 border-black py-2 text-xs font-black uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Opening...' : 'Manage Billing'}
        </button>
      )}

      {error && (
        <p className="mt-2 text-[10px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default BillingControls;
