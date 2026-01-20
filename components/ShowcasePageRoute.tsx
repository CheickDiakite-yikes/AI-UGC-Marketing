'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ShowcasePage from './ShowcasePage';

const ShowcasePageRoute: React.FC = () => {
  const router = useRouter();

  return <ShowcasePage onBack={() => router.push('/')} />;
};

export default ShowcasePageRoute;
