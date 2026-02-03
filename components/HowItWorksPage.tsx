import React from 'react';
import { PLAN_CATALOG, CREDIT_PACKS, formatLimit, VIDEO_AVG_SECONDS } from '../services/subscriptionPlans';
import { IMAGE_CREDIT_COST, VIDEO_CREDIT_COST } from '../services/usageLimits';

interface Props {
  onBack: () => void;
}

const HowItWorksPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="w-full h-screen overflow-y-auto bg-white font-sans text-neo-black relative overflow-x-hidden selection:bg-neo-cyan selection:text-black custom-scrollbar">
      <div className="absolute -top-24 left-10 w-64 h-64 bg-neo-lime/30 blur-3xl animate-float"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-neo-pink/30 blur-3xl animate-pulse"></div>

      {/* Navbar / Back Button */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-4 border-black p-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <img src="/predi-cloud-logo.png" alt="Predi" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-xl tracking-tight">Predi</span>
        </div>
        <button
          onClick={onBack}
          className="bg-white border-2 border-black shadow-neo px-4 py-2 font-bold hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <h1 className="font-display font-black text-5xl md:text-8xl leading-none">
          HOW IT
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neo-cyan to-neo-pink">
            WORKS
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl font-medium text-gray-700 max-w-2xl">
          Predi AI blends your brand DNA with structured prompts and a production pipeline that
          keeps every asset consistent, fast, and production-ready.
        </p>

        <section className="mt-12">
          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                title: 'Ground the brand',
                body: 'Upload logos, docs, and product assets. We lock color, voice, and product reality.',
                tag: 'Step 01',
              },
              {
                title: 'Set the identity',
                body: 'Add avatars and reference frames so people, props, and settings stay consistent.',
                tag: 'Step 02',
              },
              {
                title: 'Generate campaigns',
                body: 'Create images, videos, or packs. We auto-wire prompts, hooks, and captions.',
                tag: 'Step 03',
              },
              {
                title: 'Ship long video',
                body: 'Approve a storyboard, then render multi-scene video with continuity guardrails.',
                tag: 'Step 04',
              },
            ].map((step) => (
              <div key={step.title} className="bg-white border-4 border-black p-5 shadow-neo-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{step.tag}</div>
                <h2 className="font-display font-black text-2xl mt-2">{step.title}</h2>
                <p className="mt-3 text-sm font-medium text-gray-700">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="bg-neo-yellow border-4 border-black p-6 shadow-neo transform -rotate-1">
            <h2 className="font-display font-black text-3xl md:text-4xl">Credits, simply explained</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm font-medium text-gray-800">
              <div className="bg-white border-2 border-black p-4 shadow-neo-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">Images</div>
                <p className="mt-2">1 credit = {IMAGE_CREDIT_COST} image generation.</p>
              </div>
              <div className="bg-white border-2 border-black p-4 shadow-neo-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">Videos</div>
                <p className="mt-2">
                  Avg {VIDEO_AVG_SECONDS}s video uses {VIDEO_CREDIT_COST} credits (includes reference frames).
                </p>
              </div>
              <div className="bg-white border-2 border-black p-4 shadow-neo-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">Long video</div>
                <p className="mt-2">Long videos charge one video slot per scene (4/6/8s each).</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-600">
              Credits are priced from average compute cost plus a consistent margin.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">Plans</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {(['free', 'basic', 'pro'] as const).map((tier) => {
              const plan = PLAN_CATALOG[tier];
              return (
                <div key={tier} className="bg-white border-4 border-black p-6 shadow-neo-lg">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display font-black text-2xl">{plan.name}</h3>
                    <span className="text-sm font-black">{plan.priceMonthly === null ? 'Custom' : `$${plan.priceMonthly}/mo`}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                    {formatLimit(plan.images)} images · {plan.videos > 0 ? `${plan.videos} videos` : 'No videos'}
                  </p>
                  <p className="mt-3 text-sm font-medium text-gray-700">{plan.description}</p>
                  <ul className="mt-4 space-y-2 text-xs font-medium text-gray-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="text-neo-pink">■</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">Credit packs</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className="bg-neo-cyan border-4 border-black p-5 shadow-neo">
                <div className="text-xs font-black uppercase tracking-widest text-gray-700">{pack.label}</div>
                <div className="mt-2 font-display font-black text-3xl">${pack.price}</div>
                <p className="mt-2 text-sm font-medium text-gray-800">
                  Add {pack.credits} credits for burst production.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 bg-black text-white border-4 border-black p-8 shadow-neo-lg">
          <h2 className="font-display font-black text-3xl md:text-4xl">Ready to ship?</h2>
          <p className="mt-3 text-sm md:text-base text-gray-300 max-w-2xl">
            Start with a brand scan, add your product, and let the agent propose a campaign. You can
            approve a long-video storyboard before anything renders.
          </p>
          <button
            onClick={onBack}
            className="mt-6 bg-white text-black border-2 border-white px-6 py-3 font-black uppercase tracking-widest hover:bg-neo-yellow hover:text-black transition-all"
          >
            Back to the App
          </button>
        </section>
      </div>
    </div>
  );
};

export default HowItWorksPage;
