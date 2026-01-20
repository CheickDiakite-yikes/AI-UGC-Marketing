import type { Metadata } from 'next';
import HowItWorksPageRoute from '@/components/HowItWorksPageRoute';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/how-it-works`;

export const metadata: Metadata = {
  title: 'How Predi AI Works',
  description:
    'Learn how Predi AI turns brand assets into campaign-ready images, videos, and carousels with built-in continuity.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'How Predi AI Works',
    description:
      'Learn how Predi AI turns brand assets into campaign-ready images, videos, and carousels with built-in continuity.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'How Predi AI Works',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Predi AI Works',
    description:
      'Learn how Predi AI turns brand assets into campaign-ready images, videos, and carousels with built-in continuity.',
    images: ['/og-image.png'],
  },
};

export default function HowItWorksPage() {
  return <HowItWorksPageRoute />;
}
