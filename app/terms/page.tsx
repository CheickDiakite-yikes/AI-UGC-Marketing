import type { Metadata } from 'next';
import TermsPageRoute from '@/components/TermsPageRoute';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/terms`;

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Review the Predi AI terms of service for AI-powered marketing generation and usage policies.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Predi AI Terms of Service',
    description:
      'Review the Predi AI terms of service for AI-powered marketing generation and usage policies.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Predi AI Terms of Service',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predi AI Terms of Service',
    description:
      'Review the Predi AI terms of service for AI-powered marketing generation and usage policies.',
    images: ['/og-image.png'],
  },
};

export default function TermsPage() {
  return <TermsPageRoute />;
}
