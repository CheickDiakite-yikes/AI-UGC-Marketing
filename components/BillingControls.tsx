'use client';

import React, { useState, useTransition } from 'react';
import type { PlanTier } from '@/types';
import { createBillingPortalSessionAction, createCheckoutSessionAction } from '@/app/actions/subscriptionActions';
import { PLAN_CATALOG, formatLimit } from '@/services/subscriptionPlans';

type BillingControlsProps = {
  planTier: PlanTier;
  creditBalance: number;
  subscriptionStatus?: string | null;
};

const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
  </svg>
);

const featureMatrix = [
  { label: 'Image generations', free: '10', basic: '50', pro: '150' },
  { label: 'Video generations', free: false, basic: '3 videos', pro: '10 videos' },
  { label: 'Campaign packs', free: false, basic: true, pro: true },
  { label: 'Carousel creation', free: false, basic: true, pro: true },
  { label: 'Priority queue', free: false, basic: true, pro: true },
  { label: 'Brand consistency checks', free: false, basic: false, pro: true },
  { label: 'Faster turnaround', free: false, basic: false, pro: true },
];

const surfaceClass = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]';
const panelClass = 'rounded-xl border border-white/70 bg-white/60 backdrop-blur-lg';
const pillClass = 'rounded-full bg-white/70 border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600';
const buttonPrimary = 'rounded-lg bg-black text-white border border-black px-4 py-3 text-sm font-semibold uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const buttonGhost = 'rounded-lg bg-white/70 text-gray-700 border border-black/10 px-4 py-3 text-sm font-semibold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed';

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

  const renderFeatureValue = (value: boolean | string) => {
    if (value === false) return <XIcon />;
    if (value === true) return <CheckIcon />;
    return <span className="text-gray-900 font-semibold">{value}</span>;
  };

  if (!isFree) {
    return (
      <div className={`${surfaceClass} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <SparkleIcon />
          </div>
          <div>
            <p className="text-emerald-600 text-xs font-semibold uppercase tracking-widest">Active Plan</p>
            <p className="text-gray-900 font-display font-black text-xl capitalize">{planTier}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`${panelClass} p-3`}>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Status</p>
            <p className="text-gray-900 font-semibold capitalize">{subscriptionStatus || 'Active'}</p>
          </div>
          <div className={`${panelClass} p-3`}>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Credits</p>
            <p className="text-gray-900 font-semibold">{creditBalance}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManageBilling}
          disabled={isPending || !hasActiveBilling}
          className={`${buttonPrimary} w-full`}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Opening...
            </span>
          ) : (
            'Manage Billing'
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-rose-900 bg-rose-100 rounded-lg p-2 border border-rose-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${surfaceClass} overflow-hidden animate-fade-in`}>
      <div className="p-6 pb-4 border-b border-white/70">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-600">
            <SparkleIcon />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
            Upgrade your plan
          </span>
        </div>
        <h2 className="font-display font-black text-2xl md:text-3xl text-gray-900 leading-tight">
          Create without
          <span className="block text-gray-500">limits</span>
        </h2>
        <p className="mt-2 text-gray-600 text-sm">
          Join creators shipping campaigns 10x faster
        </p>
      </div>

      <div className="px-4 pb-4">
        <div className={`${panelClass} overflow-hidden`}>
          <div className="grid grid-cols-4 text-[10px] font-semibold uppercase tracking-widest border-b border-white/70">
            <div className="p-3 text-gray-500">Feature</div>
            <div className="p-3 text-center text-gray-500">Free</div>
            <div className="p-3 text-center text-gray-700">Basic</div>
            <div className="p-3 text-center text-gray-700">Pro</div>
          </div>
          {featureMatrix.map((feature, idx) => (
            <div
              key={feature.label}
              className={`grid grid-cols-4 text-xs border-b border-white/60 last:border-0 ${
                idx % 2 === 0 ? 'bg-white/40' : 'bg-white/20'
              }`}
            >
              <div className="p-3 text-gray-700 font-medium">{feature.label}</div>
              <div className="p-3 flex items-center justify-center">{renderFeatureValue(feature.free)}</div>
              <div className="p-3 flex items-center justify-center">{renderFeatureValue(feature.basic)}</div>
              <div className="p-3 flex items-center justify-center">{renderFeatureValue(feature.pro)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 grid gap-3">
        <div className="relative rounded-xl border border-emerald-200 bg-white/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
          <div className="absolute -top-3 left-4 bg-emerald-100 text-emerald-700 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full shadow">
            Most Popular
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-gray-900 font-display font-black text-xl">Basic</h3>
              <p className="text-gray-500 text-xs mt-1">{PLAN_CATALOG.basic.description}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-gray-900 font-black text-2xl">${PLAN_CATALOG.basic.priceMonthly}</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
              {formatLimit(PLAN_CATALOG.basic.images)} images
            </span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
              {PLAN_CATALOG.basic.videos} videos
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleUpgrade('basic')}
            disabled={isPending}
            className={`${buttonPrimary} mt-4 w-full`}
          >
            {pendingPlan === 'basic' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              <>
                Start 3-Day Free Trial
                <span className="block text-[10px] font-semibold opacity-80 normal-case mt-0.5">
                  No credit card required to try
                </span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.1)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-gray-900 font-display font-black text-xl">Pro</h3>
                <span className={pillClass}>
                  Scale Mode
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-1">{PLAN_CATALOG.pro.description}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-gray-900 font-black text-2xl">${PLAN_CATALOG.pro.priceMonthly}</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
              {formatLimit(PLAN_CATALOG.pro.images)} images
            </span>
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
              {PLAN_CATALOG.pro.videos} videos
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleUpgrade('pro')}
            disabled={isPending}
            className={`${buttonGhost} mt-4 w-full`}
          >
            {pendingPlan === 'pro' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Upgrade to Pro'
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className={`${panelClass} flex items-center justify-between p-3`}>
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Current: Free Plan</p>
            <p className="text-gray-800 text-xs font-semibold">
              {creditBalance} credits remaining
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-gray-600 text-xs font-semibold hover:text-gray-900 transition-colors underline underline-offset-2"
          >
            Continue with Free
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 pb-4">
          <p className="text-sm text-rose-900 bg-rose-100 rounded-lg p-3 border border-rose-200">
            {error}
          </p>
        </div>
      )}

      <div className="border-t border-white/70 px-4 py-3">
        <p className="text-[10px] text-gray-500 text-center">
          Cancel anytime · Secure payment · Instant access
        </p>
      </div>
    </div>
  );
};

export default BillingControls;
