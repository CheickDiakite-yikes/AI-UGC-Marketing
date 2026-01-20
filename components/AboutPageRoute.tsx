'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AboutPage from './AboutPage';

const AboutPageRoute: React.FC = () => {
  const router = useRouter();

  return <AboutPage onBack={() => router.push('/')} />;
};

export default AboutPageRoute;
