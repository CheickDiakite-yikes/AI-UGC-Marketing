import type { Metadata } from 'next';
import SeoLandingPage from '@/components/SeoLandingPage';
import SeoJsonLd from '@/components/SeoJsonLd';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/ai-video-ads-generator`;

const stats = [
  { label: 'Video-ready in', value: 'Minutes per scene' },
  { label: 'Formats', value: '9:16, 1:1, 16:9' },
  { label: 'Continuity', value: 'Reference locked' },
];

const featureCards = [
  {
    title: 'Reference-driven casting',
    body: 'Use avatar and product references to keep talent, wardrobe, and props consistent.',
    accentClass: 'bg-neo-yellow',
  },
  {
    title: 'Hook-first scripting',
    body: 'Generate compelling hooks and action blocks aligned to ad performance patterns.',
    accentClass: 'bg-white',
  },
  {
    title: 'Platform cutdowns',
    body: 'Export versions tuned for TikTok, Instagram Reels, and paid social placements.',
    accentClass: 'bg-neo-cyan',
  },
];

const steps = [
  {
    title: 'Upload references',
    body: 'Add avatar and product imagery so every scene stays on-character.',
  },
  {
    title: 'Approve the angle',
    body: 'Select the best hook, CTA, and storyboard before rendering.',
  },
  {
    title: 'Generate variants',
    body: 'Create multiple edits, lengths, and aspect ratios from the same concept.',
  },
];

const useCases = [
  {
    title: 'UGC ad variants',
    body: 'Test creator-style ads with multiple hooks and calls to action.',
  },
  {
    title: 'Product demo ads',
    body: 'Show features in motion with crisp, repeatable scenes and continuity.',
  },
  {
    title: 'Retargeting refresh',
    body: 'Rotate new creatives without reshooting every month.',
  },
];

const faqs = [
  {
    question: 'Can I use my own actor or avatar?',
    answer:
      'Yes. Upload an avatar image or reference kit and Predi AI will keep character traits consistent.',
  },
  {
    question: 'Do you support vertical video for TikTok?',
    answer:
      'Yes. Predi AI supports 9:16 output and automatically formats prompts for vertical video.',
  },
  {
    question: 'How long does video generation take?',
    answer:
      'Most scenes render in minutes. Longer scenes or higher quality modes can take longer.',
  },
  {
    question: 'Can I generate multiple ad versions?',
    answer:
      'Absolutely. Predi AI is built for rapid variation and A/B testing across hooks and edits.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI Video Ads Generator - Predi AI',
    description:
      'Generate high-performing video ads with reference-driven consistency and platform-ready formats.',
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
  title: 'AI Video Ads Generator',
  description:
    'Generate high-performing video ads for TikTok, Instagram, and paid social with reference-driven continuity.',
  alternates: {
    canonical: canonicalUrl,
  },
  keywords: [
    'AI video ads generator',
    'AI ad creator',
    'UGC video generator',
    'TikTok ad generator',
    'Instagram Reels ads',
  ],
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'AI Video Ads Generator - Predi AI',
    description:
      'Generate video ads for TikTok, Instagram, and paid social with reference-driven continuity.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Video Ads Generator - Predi AI',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Ads Generator - Predi AI',
    description:
      'Generate video ads for TikTok, Instagram, and paid social with reference-driven continuity.',
    images: ['/og-image.png'],
  },
};

export default function AiVideoAdsGeneratorPage() {
  return (
    <>
      <SeoLandingPage
        eyebrow="AI video ads generator"
        title="AI video ads generator"
        accentTitle="for performance marketing"
        intro="Create platform-ready video ads with consistent talent, products, and visual style across every scene."
        stats={stats}
        featureCards={featureCards}
        steps={steps}
        useCases={useCases}
        faqs={faqs}
        cta={{
          title: 'Build your next video ad in minutes',
          body: 'Bring a reference kit, pick the hook, and generate ad variants fast.',
          primaryLabel: 'Start free',
          primaryHref: '/signup',
          secondaryLabel: 'View showcase',
          secondaryHref: '/showcase',
        }}
        relatedLinks={[
          { label: 'How it works', href: '/how-it-works' },
          { label: 'AI marketing platform', href: '/ai-marketing-platform' },
          { label: 'Long-form AI video', href: '/long-form-ai-video' },
        ]}
      />
      <SeoJsonLd data={jsonLd} />
    </>
  );
}
