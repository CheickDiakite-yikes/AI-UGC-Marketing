'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TermsPage from './TermsPage';

const TermsPageRoute: React.FC = () => {
  const router = useRouter();

  return <TermsPage onBack={() => router.push('/')} />;
};

export default TermsPageRoute;
