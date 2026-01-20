import type { Metadata } from 'next';
import SeoLandingPage from '@/components/SeoLandingPage';
import SeoJsonLd from '@/components/SeoJsonLd';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/ai-marketing-platform`;

const stats = [
  { label: 'Campaign kickoff', value: 'Minutes, not weeks' },
  { label: 'Assets per brief', value: 'Images, videos, carousels' },
  { label: 'Consistency', value: 'Brand and avatar locked' },
];

const featureCards = [
  {
    title: 'Brand-grounded generation',
    body: 'Ground every output in logos, product docs, and brand tone so content stays on brand.',
    accentClass: 'bg-neo-yellow',
  },
  {
    title: 'Agentic campaign planning',
    body: 'Get research-backed ideas, approve angles, and ship multi-asset campaigns from a single brief.',
    accentClass: 'bg-white',
  },
  {
    title: 'Multi-channel delivery',
    body: 'Export creative optimized for TikTok, Reels, ads, and social posts with format-aware prompts.',
    accentClass: 'bg-neo-cyan',
  },
];

const steps = [
  {
    title: 'Ground your brand DNA',
    body: 'Upload brand docs, products, and reference assets so the agent knows your voice and visuals.',
  },
  {
    title: 'Pick the angle',
    body: 'Review agent ideas, choose the winning narrative, and approve the campaign direction.',
  },
  {
    title: 'Generate and ship',
    body: 'Create images, videos, and carousels with continuity guardrails and publish-ready exports.',
  },
];

const useCases = [
  {
    title: 'Product launches',
    body: 'Launch faster with UGC, paid ads, and social posts generated from one brief.',
  },
  {
    title: 'Performance campaigns',
    body: 'Test multiple hooks, offers, and formats without spinning up new vendors.',
  },
  {
    title: 'Always-on content',
    body: 'Keep feeds fresh with on-brand assets that match each platform and audience.',
  },
];

const faqs = [
  {
    question: 'Is Predi AI a marketing platform or a generator?',
    answer:
      'Predi AI is a full marketing OS that combines planning, brand grounding, and multi-asset generation in one workflow.',
  },
  {
    question: 'How do credits work?',
    answer:
      'Credits track compute usage. Images cost 1 credit, videos cost more because they include reference frames and rendering.',
  },
  {
    question: 'Can I keep my brand consistent?',
    answer:
      'Yes. Predi AI uses brand identity, avatars, and reference assets to keep people and products consistent across outputs.',
  },
  {
    question: 'Do I need a marketing team to use Predi AI?',
    answer:
      'No. Predi AI is designed for small teams and founders who need high-output marketing without extra headcount.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI Marketing Platform - Predi AI',
    description:
      'Predi AI is the AI marketing platform that helps small teams generate brand-grounded campaigns and multi-channel assets fast.',
    url: canonicalUrl,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  },
];

export const metadata: Metadata = {
  title: 'AI Marketing Platform',
  description:
    'Predi AI is the AI marketing platform that plans campaigns, keeps brand consistency, and generates videos, images, and carousels fast.',
  alternates: {
    canonical: canonicalUrl,
  },
  keywords: [
    'AI marketing platform',
    'AI marketing OS',
    'marketing automation AI',
    'AI content generator',
    'brand grounded AI',
  ],
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'AI Marketing Platform - Predi AI',
    description:
      'Plan campaigns, lock brand consistency, and generate multi-channel assets with Predi AI.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Marketing Platform - Predi AI',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Marketing Platform - Predi AI',
    description:
      'Plan campaigns, lock brand consistency, and generate multi-channel assets with Predi AI.',
    images: ['/og-image.png'],
  },
};

export default function AiMarketingPlatformPage() {
  return (
    <>
      <SeoLandingPage
        eyebrow="AI marketing platform"
        title="AI marketing platform"
        accentTitle="built for fast teams"
        intro="Predi AI compresses the full marketing workflow into one system - research, brand grounding, and multi-asset generation with continuity baked in."
        stats={stats}
        featureCards={featureCards}
        steps={steps}
        useCases={useCases}
        faqs={faqs}
        cta={{
          title: 'Launch your first AI campaign today',
          body: 'Bring your brand, pick the angle, and let Predi AI ship the creative in a single flow.',
          primaryLabel: 'Start free',
          primaryHref: '/signup',
          secondaryLabel: 'See examples',
          secondaryHref: '/showcase',
        }}
        relatedLinks={[
          { label: 'How it works', href: '/how-it-works' },
          { label: 'Showcase', href: '/showcase' },
          { label: 'Marketing for small business', href: '/marketing-for-small-business' },
        ]}
      />
      <SeoJsonLd data={jsonLd} />
    </>
  );
}
