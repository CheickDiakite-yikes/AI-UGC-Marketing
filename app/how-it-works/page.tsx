import type { Metadata } from 'next';
import HowItWorksPageRoute from '@/components/HowItWorksPageRoute';
import { DEFAULT_SOCIAL_IMAGE, getCanonicalUrl } from '@/app/seoConfig';

const canonicalUrl = getCanonicalUrl('/how-it-works');

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
            url: DEFAULT_SOCIAL_IMAGE,
            width: 1200,
            height: 630,
            alt: 'How Predi AI Works',
            type: 'image/jpeg',
          },
        ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Predi AI Works',
    description:
      'Learn how Predi AI turns brand assets into campaign-ready images, videos, and carousels with built-in continuity.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function HowItWorksPage() {
  return <HowItWorksPageRoute />;
}
