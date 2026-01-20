'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PrivacyPage from './PrivacyPage';

const PrivacyPageRoute: React.FC = () => {
  const router = useRouter();

  return <PrivacyPage onBack={() => router.push('/')} />;
};

export default PrivacyPageRoute;
