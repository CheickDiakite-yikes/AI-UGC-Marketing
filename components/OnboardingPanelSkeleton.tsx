import React from 'react';

const OnboardingPanelSkeleton: React.FC = () => {
  return (
    <div className="mb-6 md:mb-10 bg-neo-yellow border-4 border-black shadow-neo p-4 md:p-5 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div className="space-y-2">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-6 w-48 rounded" />
        </div>
        <div className="skeleton h-5 w-24 rounded" />
      </div>
      <div className="skeleton h-3 w-full rounded mb-4" />
      <div className="space-y-2">
        <div className="skeleton h-10 w-full rounded" />
        <div className="skeleton h-10 w-full rounded" />
      </div>
      <div className="border-t-2 border-black/60 mt-4 pt-3 space-y-2">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-full rounded" />
        </div>
      </div>
    </div>
  );
};

export default OnboardingPanelSkeleton;
