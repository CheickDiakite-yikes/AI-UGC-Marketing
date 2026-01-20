import type { Metadata } from 'next';
import PrivacyPageRoute from '@/components/PrivacyPageRoute';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/privacy`;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read the Predi AI privacy policy and how we handle data for AI-powered marketing workflows.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Predi AI Privacy Policy',
    description:
      'Read the Predi AI privacy policy and how we handle data for AI-powered marketing workflows.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Predi AI Privacy Policy',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predi AI Privacy Policy',
    description:
      'Read the Predi AI privacy policy and how we handle data for AI-powered marketing workflows.',
    images: ['/og-image.png'],
  },
};

export default function PrivacyPage() {
  return <PrivacyPageRoute />;
}
