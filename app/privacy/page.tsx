import type { Metadata } from 'next';
import PrivacyPageRoute from '@/components/PrivacyPageRoute';
import { DEFAULT_SOCIAL_IMAGE, getCanonicalUrl } from '@/app/seoConfig';

const canonicalUrl = getCanonicalUrl('/privacy');

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
        url: DEFAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Predi AI Privacy Policy',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predi AI Privacy Policy',
    description:
      'Read the Predi AI privacy policy and how we handle data for AI-powered marketing workflows.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function PrivacyPage() {
  return <PrivacyPageRoute />;
}
