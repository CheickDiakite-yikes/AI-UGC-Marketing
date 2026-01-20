'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import HowItWorksPage from './HowItWorksPage';

const HowItWorksPageRoute: React.FC = () => {
  const router = useRouter();

  return <HowItWorksPage onBack={() => router.push('/')} />;
};

export default HowItWorksPageRoute;
