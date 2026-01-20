import type { Metadata } from 'next';
import SeoLandingPage from '@/components/SeoLandingPage';
import SeoJsonLd from '@/components/SeoJsonLd';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/long-form-ai-video`;

const stats = [
  { label: 'Total length', value: 'Up to 30 seconds' },
  { label: 'Scene continuity', value: 'Reference locked' },
  { label: 'Storyboard', value: 'Approval required' },
];

const featureCards = [
  {
    title: 'Storyboard-first workflow',
    body: 'Approve the narrative before anything renders so you stay in control of pacing and message.',
    accentClass: 'bg-neo-yellow',
  },
  {
    title: 'Continuity guardrails',
    body: 'Reference kits keep characters, products, and settings consistent across scenes.',
    accentClass: 'bg-white',
  },
  {
    title: 'Auto stitched delivery',
    body: 'Scenes are rendered and stitched into a single long-form video ready for distribution.',
    accentClass: 'bg-neo-cyan',
  },
];

const steps = [
  {
    title: 'Define the story',
    body: 'Describe the narrative, target audience, and core message.',
  },
  {
    title: 'Approve the storyboard',
    body: 'Review a multi-scene plan with timing, actions, and continuity notes.',
  },
  {
    title: 'Render and stitch',
    body: 'Generate each scene with references and deliver a single stitched video.',
  },
];

const useCases = [
  {
    title: 'Product story arcs',
    body: 'Show before-and-after narratives that need continuity across scenes.',
  },
  {
    title: 'Founder narratives',
    body: 'Tell a single story across multiple shots with consistent talent and styling.',
  },
  {
    title: 'Tutorial walkthroughs',
    body: 'Explain a workflow step-by-step with scene-level control.',
  },
];

const faqs = [
  {
    question: 'How long can long-form videos be?',
    answer:
      'Predi AI supports multi-scene videos up to 30 seconds total with 4, 6, or 8 second scenes.',
  },
  {
    question: 'How do you keep the character consistent?',
    answer:
      'Reference kits and continuity notes are injected into each scene prompt and rendering step.',
  },
  {
    question: 'Is long-form video available on the free plan?',
    answer:
      'Long-form video is available with credits or paid plans to cover higher compute costs.',
  },
  {
    question: 'Do I need to provide reference images?',
    answer:
      'References are recommended for best continuity. Predi AI can also generate references when needed.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Long Form AI Video - Predi AI',
    description:
      'Generate long-form AI video with storyboard approval, continuity guardrails, and reference kits.',
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
  title: 'Long Form AI Video',
  description:
    'Generate long-form AI video with storyboard approval, continuity guardrails, and reference-driven rendering.',
  alternates: {
    canonical: canonicalUrl,
  },
  keywords: [
    'long form AI video',
    'AI storyboard generator',
    'AI video continuity',
    'multi scene video generator',
  ],
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Long Form AI Video - Predi AI',
    description:
      'Storyboard, render, and stitch multi-scene AI video with continuity guardrails.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Long Form AI Video - Predi AI',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Long Form AI Video - Predi AI',
    description:
      'Storyboard, render, and stitch multi-scene AI video with continuity guardrails.',
    images: ['/og-image.png'],
  },
};

export default function LongFormAiVideoPage() {
  return (
    <>
      <SeoLandingPage
        eyebrow="Long form AI video"
        title="Long form AI video"
        accentTitle="with continuity built in"
        intro="Plan, approve, and render multi-scene videos with consistent characters, products, and environments."
        stats={stats}
        featureCards={featureCards}
        steps={steps}
        useCases={useCases}
        faqs={faqs}
        cta={{
          title: 'Launch a long-form video with confidence',
          body: 'Approve the storyboard, lock the references, and ship a stitched video fast.',
          primaryLabel: 'Start free',
          primaryHref: '/signup',
          secondaryLabel: 'See long-video examples',
          secondaryHref: '/showcase',
        }}
        relatedLinks={[
          { label: 'AI video ads generator', href: '/ai-video-ads-generator' },
          { label: 'How it works', href: '/how-it-works' },
          { label: 'Showcase', href: '/showcase' },
        ]}
      />
      <SeoJsonLd data={jsonLd} />
    </>
  );
}
