import type { Metadata } from 'next';
import AboutPageRoute from '@/components/AboutPageRoute';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prediai.replit.app';
const canonicalUrl = `${siteUrl}/about`;

export const metadata: Metadata = {
  title: 'About Predi AI',
  description:
    'Meet the team behind Predi AI and the mission to help small teams ship world-class marketing with brand-grounded AI.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'About Predi AI',
    description:
      'Meet the team behind Predi AI and the mission to help small teams ship world-class marketing with brand-grounded AI.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Predi AI About',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Predi AI',
    description:
      'Meet the team behind Predi AI and the mission to help small teams ship world-class marketing with brand-grounded AI.',
    images: ['/og-image.png'],
  },
};

export default function AboutPage() {
  return <AboutPageRoute />;
}
