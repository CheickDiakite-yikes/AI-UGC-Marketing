import type { Metadata } from 'next';
import ShowcasePageRoute from '@/components/ShowcasePageRoute';
import { DEFAULT_SOCIAL_IMAGE, getCanonicalUrl } from '@/app/seoConfig';

const canonicalUrl = getCanonicalUrl('/showcase');

export const metadata: Metadata = {
  title: 'Showcase',
  description:
    'Explore campaign-ready videos, images, and carousels created with Predi AI and curated by real teams.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Predi AI Showcase',
    description:
      'Explore campaign-ready videos, images, and carousels created with Predi AI and curated by real teams.',
    images: [
      {
        url: DEFAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Predi AI Showcase',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predi AI Showcase',
    description:
      'Explore campaign-ready videos, images, and carousels created with Predi AI and curated by real teams.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function ShowcasePage() {
  return <ShowcasePageRoute />;
}
