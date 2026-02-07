import type { Metadata } from 'next';
import { getCanonicalUrl } from '@/app/seoConfig';

export const metadata: Metadata = {
  title: 'Login',
  alternates: {
    canonical: getCanonicalUrl('/login'),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
