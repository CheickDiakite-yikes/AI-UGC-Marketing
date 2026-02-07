import type { Metadata } from 'next';
import TermsPageRoute from '@/components/TermsPageRoute';
import { DEFAULT_SOCIAL_IMAGE, getCanonicalUrl } from '@/app/seoConfig';

const canonicalUrl = getCanonicalUrl('/terms');

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
        url: DEFAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Predi AI Terms of Service',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predi AI Terms of Service',
    description:
      'Review the Predi AI terms of service for AI-powered marketing generation and usage policies.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function TermsPage() {
  return <TermsPageRoute />;
}
