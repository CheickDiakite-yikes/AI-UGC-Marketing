import React from 'react';
import Link from 'next/link';

interface StatItem {
  label: string;
  value: string;
}

interface CardItem {
  title: string;
  body: string;
  accentClass?: string;
}

interface StepItem {
  title: string;
  body: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface LinkItem {
  label: string;
  href: string;
}

interface CtaBlock {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

interface Props {
  eyebrow: string;
  title: string;
  accentTitle: string;
  intro: string;
  stats: StatItem[];
  featureCards: CardItem[];
  steps: StepItem[];
  useCases: CardItem[];
  faqs: FaqItem[];
  cta: CtaBlock;
  relatedLinks?: LinkItem[];
}

const SeoLandingPage: React.FC<Props> = ({
  eyebrow,
  title,
  accentTitle,
  intro,
  stats,
  featureCards,
  steps,
  useCases,
  faqs,
  cta,
  relatedLinks = [],
}) => {
  return (
    <div className="w-full min-h-screen bg-white font-sans text-neo-black relative overflow-x-hidden selection:bg-neo-cyan selection:text-black">
      <div className="absolute -top-24 -right-16 w-72 h-72 bg-neo-pink/30 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-neo-cyan/30 blur-3xl animate-float"></div>

      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-4 border-black">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <div className="h-12 w-24 overflow-hidden">
              <img src="/predi-cloud-logo.png" alt="Predi" className="h-full w-full object-cover scale-[2.2]" />
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest">
            <Link href="/showcase" className="hover:text-neo-pink transition-colors">Showcase</Link>
            <Link href="/how-it-works" className="hover:text-neo-yellow transition-colors">How it works</Link>
            <Link href="/about" className="hover:text-neo-cyan transition-colors">About</Link>
          </div>
          <Link
            href="/signup"
            className="bg-neo-black text-white border-2 border-black shadow-neo px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-colors"
          >
            Start free
          </Link>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span className="w-2 h-2 bg-neo-pink rounded-full animate-pulse"></span>
          {eyebrow}
        </div>
        <h1 className="mt-4 font-display font-black text-4xl md:text-7xl leading-none">
          {title}
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neo-pink to-neo-cyan">
            {accentTitle}
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl font-medium text-gray-700 max-w-2xl">
          {intro}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={cta.primaryHref}
            className="bg-neo-black text-white border-4 border-black px-6 py-3 font-black uppercase tracking-widest shadow-neo hover:bg-neo-pink hover:text-black transition-colors"
          >
            {cta.primaryLabel}
          </Link>
          {cta.secondaryLabel && cta.secondaryHref && (
            <Link
              href={cta.secondaryHref}
              className="bg-white text-neo-black border-4 border-black px-6 py-3 font-black uppercase tracking-widest shadow-neo hover:bg-neo-yellow transition-colors"
            >
              {cta.secondaryLabel}
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white border-4 border-black p-4 shadow-neo-sm">
              <div className="text-xs font-black uppercase tracking-widest text-gray-500">{stat.label}</div>
              <div className="mt-2 font-display font-black text-2xl">{stat.value}</div>
            </div>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">Why teams pick Predi AI</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className={`border-4 border-black p-6 shadow-neo ${card.accentClass || 'bg-white'}`}
              >
                <h3 className="font-display font-black text-2xl">{card.title}</h3>
                <p className="mt-3 text-sm font-medium text-gray-800">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="bg-white border-2 border-black p-4 shadow-neo-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Step {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="font-display font-black text-xl mt-2">{step.title}</h3>
                <p className="mt-2 text-sm font-medium text-gray-700">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">Use cases that convert</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="bg-neo-lime border-4 border-black p-5 shadow-neo">
                <h3 className="font-display font-black text-2xl">{useCase.title}</h3>
                <p className="mt-2 text-sm font-medium text-gray-800">{useCase.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">Frequently asked questions</h2>
          <div className="mt-6 grid gap-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="bg-white border-2 border-black p-5 shadow-neo-sm">
                <h3 className="font-display font-black text-xl">{faq.question}</h3>
                <p className="mt-2 text-sm font-medium text-gray-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 bg-black text-white border-4 border-black p-8 shadow-neo-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="font-display font-black text-3xl md:text-4xl">{cta.title}</h2>
              <p className="mt-3 text-sm md:text-base text-gray-300 max-w-xl">{cta.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={cta.primaryHref}
                className="bg-white text-black border-2 border-white px-6 py-3 font-black uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-colors"
              >
                {cta.primaryLabel}
              </Link>
              {cta.secondaryLabel && cta.secondaryHref && (
                <Link
                  href={cta.secondaryHref}
                  className="bg-transparent text-white border-2 border-white px-6 py-3 font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                >
                  {cta.secondaryLabel}
                </Link>
              )}
            </div>
          </div>
        </section>

        {relatedLinks.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display font-black text-2xl">Keep exploring</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-black uppercase tracking-widest">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="bg-white border-2 border-black px-4 py-2 shadow-neo-sm hover:bg-neo-yellow transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default SeoLandingPage;
