import type { Metadata } from 'next';
import AboutPageRoute from '@/components/AboutPageRoute';
import { DEFAULT_SOCIAL_IMAGE, getCanonicalUrl } from '@/app/seoConfig';

const canonicalUrl = getCanonicalUrl('/about');

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
            url: DEFAULT_SOCIAL_IMAGE,
            width: 1200,
            height: 630,
            alt: 'Predi AI About',
            type: 'image/jpeg',
          },
        ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Predi AI',
    description:
      'Meet the team behind Predi AI and the mission to help small teams ship world-class marketing with brand-grounded AI.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function AboutPage() {
  return <AboutPageRoute />;
}
