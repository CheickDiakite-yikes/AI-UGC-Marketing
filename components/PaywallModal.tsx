import React from 'react';
import { CREDIT_PACKS, PLAN_CATALOG, VIDEO_AVG_SECONDS, formatLimit } from '../services/subscriptionPlans';
import type { PlanTier, UsageStats } from '../types';

type PaywallReason = 'image_limit' | 'video_limit' | 'video_locked' | null;

interface PaywallModalProps {
  isOpen: boolean;
  reason: PaywallReason;
  usage: UsageStats;
  planTier: PlanTier;
  imageLimit: number;
  videoLimit: number;
  onClose: () => void;
  onSelectPlan: (tier: PlanTier) => void;
  onSelectCredits: (credits: number) => void;
}

const reasonCopy: Record<Exclude<PaywallReason, null>, { title: string; body: string }> = {
  image_limit: {
    title: 'You hit your image limit',
    body: 'Upgrade to unlock more generations and keep shipping campaigns.',
  },
  video_limit: {
    title: 'You hit your video limit',
    body: 'Upgrade for more video capacity and faster creative testing.',
  },
  video_locked: {
    title: 'Video generation is a premium feature',
    body: 'Unlock video with a subscription. Basic includes a 3-day free trial.',
  },
};

const PlanCard: React.FC<{
  tier: PlanTier;
  isRecommended?: boolean;
  isCurrent?: boolean;
  onSelect: (tier: PlanTier) => void;
}> = ({ tier, isRecommended, isCurrent, onSelect }) => {
  const plan = PLAN_CATALOG[tier];
  const priceLabel = plan.priceMonthly === null ? 'Contact us' : `$${plan.priceMonthly}/mo`;

  return (
    <div className={`relative border-4 border-black p-4 shadow-neo-lg bg-white ${isRecommended ? 'bg-neo-lime/20' : ''}`}>
      {plan.badge && (
        <span className="absolute -top-3 left-4 bg-black text-white text-[10px] font-black uppercase tracking-widest px-2 py-1">
          {plan.badge}
        </span>
      )}
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display font-black text-xl">{plan.name}</h3>
        <span className="text-sm font-black">{priceLabel}</span>
      </div>
      <p className="text-xs text-gray-600 mb-3">{plan.description}</p>
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
        {formatLimit(plan.images)} images / {plan.videos > 0 ? `${plan.videos} videos` : 'no videos'}
      </div>
      <ul className="space-y-2 text-xs font-medium text-gray-700 mb-4">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="text-neo-pink">■</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.trialDays ? (
        <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-neo-pink">
          {plan.trialDays}-day free trial included
        </div>
      ) : null}
      <button
        onClick={() => onSelect(tier)}
        disabled={isCurrent}
        className={`w-full border-2 border-black py-2 text-xs font-black uppercase tracking-widest transition-all ${
          isRecommended ? 'bg-neo-pink text-black hover:bg-black hover:text-white' : 'bg-white hover:bg-neo-yellow'
        }`}
      >
        {isCurrent ? 'Current plan' : plan.priceMonthly === null ? 'Contact Sales' : plan.trialDays ? 'Start 3-day trial' : 'Upgrade now'}
      </button>
    </div>
  );
};

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  reason,
  usage,
  planTier,
  imageLimit,
  videoLimit,
  onClose,
  onSelectPlan,
  onSelectCredits,
}) => {
  if (!isOpen) return null;

  const reasonBlock = reason ? reasonCopy[reason] : null;
  const imageLimitLabel = formatLimit(imageLimit);
  const videoLimitLabel = videoLimit <= 0 ? 'Locked' : formatLimit(videoLimit);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white border-4 border-black shadow-neo-lg overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(255,240,200,0.6))] pointer-events-none" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Upgrade your creative engine
              </p>
              <h2 className="font-display font-black text-2xl md:text-3xl">
                Unlock more output. Ship faster.
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-xl font-black border-2 border-black w-9 h-9 flex items-center justify-center hover:bg-neo-pink transition-all"
              aria-label="Close paywall"
            >
              ×
            </button>
          </div>

          {reasonBlock && (
            <div className="mt-4 border-2 border-black bg-neo-yellow p-3 text-sm font-bold">
              <div className="text-xs uppercase tracking-widest text-gray-600">{reasonBlock.title}</div>
              <div className="text-sm font-bold text-black">{reasonBlock.body}</div>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="border-2 border-black bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Current plan</p>
              <p className="text-sm font-black capitalize">{planTier}</p>
              <div className="mt-2 text-[10px] font-bold text-gray-600">
                Images: {usage.imagesGenerated}/{imageLimitLabel}
              </div>
              <div className="text-[10px] font-bold text-gray-600">
                Videos: {usage.videosGenerated}/{videoLimitLabel}
              </div>
              <div className="text-[10px] font-bold text-gray-600">
                Credits: {usage.creditBalance}
              </div>
            </div>
            <div className="border-2 border-black bg-white p-3 md:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Video cost guide</p>
              <p className="text-xs text-gray-700">
                Avg video length: {VIDEO_AVG_SECONDS}s. Basic includes {PLAN_CATALOG.basic.videos} videos, Pro includes {PLAN_CATALOG.pro.videos}.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <PlanCard tier="free" onSelect={onSelectPlan} isCurrent={planTier === 'free'} />
            <PlanCard tier="basic" onSelect={onSelectPlan} isRecommended isCurrent={planTier === 'basic'} />
            <PlanCard tier="pro" onSelect={onSelectPlan} isCurrent={planTier === 'pro'} />
          </div>

          <div className="mt-6 border-2 border-black bg-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Need extra credits?</p>
                <p className="text-sm font-bold">Add-on packs for bursts of production.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {CREDIT_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => onSelectCredits(pack.credits)}
                    className="border-2 border-black bg-neo-cyan px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                  >
                    {pack.label} - ${pack.price}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              1 credit = 1 image. Videos use {VIDEO_AVG_SECONDS} credits on average.
            </p>
          </div>

          <div className="mt-4 border-2 border-black bg-neo-black text-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-300">Enterprise</p>
                <p className="text-sm font-bold">Custom volume, security, and priority support.</p>
              </div>
              <button
                onClick={() => onSelectPlan('enterprise')}
                className="border-2 border-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
              >
                Contact sales
              </button>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-gray-500">
            Trials auto-renew unless canceled. You can manage your subscription in Profile once billing is live.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
