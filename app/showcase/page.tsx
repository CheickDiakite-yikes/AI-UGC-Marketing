import type { Metadata } from 'next';
import ShowcasePageRoute from '@/components/ShowcasePageRoute';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/showcase`;

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
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Predi AI Showcase',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predi AI Showcase',
    description:
      'Explore campaign-ready videos, images, and carousels created with Predi AI and curated by real teams.',
    images: ['/og-image.png'],
  },
};

export default function ShowcasePage() {
  return <ShowcasePageRoute />;
}
