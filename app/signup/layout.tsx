import type { Metadata } from 'next';
import { getCanonicalUrl } from '@/app/seoConfig';

export const metadata: Metadata = {
  title: 'Sign Up',
  alternates: {
    canonical: getCanonicalUrl('/signup'),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
