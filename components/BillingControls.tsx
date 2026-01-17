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
  <svg className="w-5 h-5 text-neo-lime flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
  { label: 'Image generations', free: '20', basic: '50', pro: '150' },
  { label: 'Video generations', free: false, basic: '4 videos', pro: '12 videos' },
  { label: 'Campaign packs', free: false, basic: true, pro: true },
  { label: 'Carousel creation', free: false, basic: true, pro: true },
  { label: 'Priority queue', free: false, basic: true, pro: true },
  { label: 'Brand consistency checks', free: false, basic: false, pro: true },
  { label: 'Faster turnaround', free: false, basic: false, pro: true },
];

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
    return <span className="text-white font-bold">{value}</span>;
  };

  if (!isFree) {
    return (
      <div className="bg-gradient-to-br from-neo-black via-gray-900 to-gray-800 rounded-xl border-4 border-black p-6 shadow-neo-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-neo-lime flex items-center justify-center">
            <SparkleIcon />
          </div>
          <div>
            <p className="text-neo-lime text-xs font-bold uppercase tracking-widest">Active Plan</p>
            <p className="text-white font-display font-black text-xl capitalize">{planTier}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-3 border border-white/20">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Status</p>
            <p className="text-white font-bold capitalize">{subscriptionStatus || 'Active'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 border border-white/20">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Credits</p>
            <p className="text-neo-cyan font-bold">{creditBalance}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManageBilling}
          disabled={isPending || !hasActiveBilling}
          className="w-full bg-white text-neo-black border-2 border-white py-3 text-sm font-black uppercase tracking-widest hover:bg-neo-lime hover:border-neo-lime transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-neo-sm"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-neo-black border-t-transparent rounded-full animate-spin" />
              Opening...
            </span>
          ) : (
            'Manage Billing'
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-neo-black via-gray-900 to-gray-800 rounded-xl border-4 border-black shadow-neo-lg overflow-hidden animate-fade-in">
      <div className="relative p-6 pb-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neo-pink/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-neo-cyan/20 rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-neo-lime">
              <SparkleIcon />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-neo-lime animate-pulse">
              Unlock Your Full Potential
            </span>
          </div>
          <h2 className="font-display font-black text-2xl md:text-3xl text-white leading-tight">
            Create Without
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime">
              Limits
            </span>
          </h2>
          <p className="mt-2 text-gray-400 text-sm">
            Join creators shipping campaigns 10x faster
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10">
            <div className="p-3 text-gray-500">Feature</div>
            <div className="p-3 text-center text-gray-500">Free</div>
            <div className="p-3 text-center text-neo-pink">Basic</div>
            <div className="p-3 text-center text-neo-cyan">Pro</div>
          </div>
          {featureMatrix.map((feature, idx) => (
            <div 
              key={feature.label} 
              className={`grid grid-cols-4 text-xs border-b border-white/5 last:border-0 ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
            >
              <div className="p-3 text-gray-300 font-medium">{feature.label}</div>
              <div className="p-3 flex items-center justify-center">{renderFeatureValue(feature.free)}</div>
              <div className="p-3 flex items-center justify-center">{renderFeatureValue(feature.basic)}</div>
              <div className="p-3 flex items-center justify-center">{renderFeatureValue(feature.pro)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 grid gap-3">
        <div className="relative bg-gradient-to-r from-neo-pink/20 to-neo-pink/10 rounded-xl border-2 border-neo-pink p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-neo-pink/20">
          <div className="absolute -top-3 left-4 bg-neo-pink text-neo-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
            Most Popular
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-white font-display font-black text-xl">Basic</h3>
              <p className="text-gray-400 text-xs mt-1">{PLAN_CATALOG.basic.description}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-white font-black text-2xl">${PLAN_CATALOG.basic.priceMonthly}</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="bg-neo-pink/20 text-neo-pink px-2 py-1 rounded-full font-bold">
              {formatLimit(PLAN_CATALOG.basic.images)} images
            </span>
            <span className="bg-neo-pink/20 text-neo-pink px-2 py-1 rounded-full font-bold">
              {PLAN_CATALOG.basic.videos} videos
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleUpgrade('basic')}
            disabled={isPending}
            className="mt-4 w-full bg-neo-pink text-neo-black border-2 border-neo-pink py-3 text-sm font-black uppercase tracking-widest hover:bg-white hover:border-white transition-all duration-300 disabled:opacity-60 rounded-lg shadow-lg hover:shadow-xl"
          >
            {pendingPlan === 'basic' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-neo-black border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              <>
                Start 3-Day Free Trial
                <span className="block text-[10px] font-bold opacity-80 normal-case mt-0.5">
                  No credit card required to try
                </span>
              </>
            )}
          </button>
        </div>

        <div className="bg-gradient-to-r from-neo-cyan/10 to-neo-cyan/5 rounded-xl border-2 border-white/20 p-4 transition-all duration-300 hover:border-neo-cyan/50 hover:scale-[1.01]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-display font-black text-xl">Pro</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-neo-cyan bg-neo-cyan/20 px-2 py-0.5 rounded-full">
                  Scale Mode
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">{PLAN_CATALOG.pro.description}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-white font-black text-2xl">${PLAN_CATALOG.pro.priceMonthly}</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="bg-neo-cyan/20 text-neo-cyan px-2 py-1 rounded-full font-bold">
              {formatLimit(PLAN_CATALOG.pro.images)} images
            </span>
            <span className="bg-neo-cyan/20 text-neo-cyan px-2 py-1 rounded-full font-bold">
              {PLAN_CATALOG.pro.videos} videos
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleUpgrade('pro')}
            disabled={isPending}
            className="mt-4 w-full bg-transparent text-neo-cyan border-2 border-neo-cyan py-3 text-sm font-black uppercase tracking-widest hover:bg-neo-cyan hover:text-neo-black transition-all duration-300 disabled:opacity-60 rounded-lg"
          >
            {pendingPlan === 'pro' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-neo-cyan border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Upgrade to Pro'
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Current: Free Plan</p>
            <p className="text-white text-xs font-bold">
              {creditBalance} credits remaining
            </p>
          </div>
          <button
            type="button"
            className="text-gray-500 text-xs hover:text-white transition-colors underline-offset-2 hover:underline"
          >
            Continue with Free
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 pb-4">
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            {error}
          </p>
        </div>
      )}

      <div className="bg-white/5 border-t border-white/10 px-4 py-3">
        <p className="text-[10px] text-gray-500 text-center">
          Cancel anytime · Secure payment · Instant access
        </p>
      </div>
    </div>
  );
};

export default BillingControls;
