import type { Metadata } from 'next';
import SeoLandingPage from '@/components/SeoLandingPage';
import SeoJsonLd from '@/components/SeoJsonLd';
import { DEFAULT_SOCIAL_IMAGE, getCanonicalUrl } from '@/app/seoConfig';

const canonicalUrl = getCanonicalUrl('/marketing-for-small-business');

const stats = [
  { label: 'Team size', value: 'Built for 1 to 5 people' },
  { label: 'Budget control', value: 'Credits instead of retainers' },
  { label: 'Time saved', value: 'Launch in a single session' },
];

const featureCards = [
  {
    title: 'No marketing team required',
    body: 'Predi AI guides strategy, hooks, and creative so founders can ship marketing without extra headcount.',
    accentClass: 'bg-neo-yellow',
  },
  {
    title: 'Budget-friendly scaling',
    body: 'Pay for output with credits and keep a clear margin between cost and ROI.',
    accentClass: 'bg-white',
  },
  {
    title: 'Fast feedback loops',
    body: 'Generate multiple angles fast and double down on what works.',
    accentClass: 'bg-neo-cyan',
  },
];

const steps = [
  {
    title: 'Describe the business',
    body: 'Share your product, audience, and goals so the agent builds the right angle.',
  },
  {
    title: 'Pick the campaign',
    body: 'Choose from research-backed ideas and lock the one that fits your offer.',
  },
  {
    title: 'Generate and publish',
    body: 'Create videos, images, and carousels ready for social, ads, or email.',
  },
];

const useCases = [
  {
    title: 'Local service marketing',
    body: 'Create ads and social posts that highlight testimonials and offers.',
  },
  {
    title: 'Ecommerce promos',
    body: 'Ship product drops, bundles, and seasonal campaigns quickly.',
  },
  {
    title: 'Founder-led brands',
    body: 'Keep your voice consistent with on-brand captions and visuals.',
  },
];

const faqs = [
  {
    question: 'Is Predi AI affordable for small businesses?',
    answer:
      'Yes. The credit system makes pricing predictable and scalable without long-term retainers.',
  },
  {
    question: 'Do I need design or editing skills?',
    answer:
      'No. Predi AI handles creative direction, prompts, and formatting so you can focus on results.',
  },
  {
    question: 'Can I use my own photos and branding?',
    answer:
      'Absolutely. Upload logos, product photos, and references to keep everything on brand.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      'Predi AI outputs for TikTok, Instagram, Facebook, and other social or paid channels.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marketing for Small Business - Predi AI',
    description:
      'Predi AI helps small businesses launch marketing campaigns fast without a full team.',
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
  title: 'Marketing for Small Business',
  description:
    'Predi AI helps small businesses launch marketing campaigns fast with brand-grounded AI and predictable pricing.',
  alternates: {
    canonical: canonicalUrl,
  },
  keywords: [
    'marketing for small business',
    'AI marketing for small business',
    'small business marketing tools',
    'no marketing team',
  ],
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Marketing for Small Business - Predi AI',
    description:
      'Launch campaigns fast without a full team. Predi AI keeps your marketing on brand and on budget.',
    images: [
      {
        url: DEFAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Marketing for Small Business - Predi AI',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketing for Small Business - Predi AI',
    description:
      'Launch campaigns fast without a full team. Predi AI keeps your marketing on brand and on budget.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function MarketingForSmallBusinessPage() {
  return (
    <>
      <SeoLandingPage
        eyebrow="Marketing for small business"
        title="Marketing for small business"
        accentTitle="without the overhead"
        intro="Predi AI gives founders and lean teams a full marketing system - strategy, creative, and output in one place."
        stats={stats}
        featureCards={featureCards}
        steps={steps}
        useCases={useCases}
        faqs={faqs}
        cta={{
          title: 'Ship your next campaign without extra headcount',
          body: 'Ground your brand, pick an angle, and generate the creative in minutes.',
          primaryLabel: 'Start free',
          primaryHref: '/signup',
          secondaryLabel: 'See how it works',
          secondaryHref: '/how-it-works',
        }}
        relatedLinks={[
          { label: 'AI marketing platform', href: '/ai-marketing-platform' },
          { label: 'AI video ads generator', href: '/ai-video-ads-generator' },
          { label: 'Showcase', href: '/showcase' },
        ]}
      />
      <SeoJsonLd data={jsonLd} />
    </>
  );
}
