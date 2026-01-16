import React from 'react';

const WorkspaceSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-[100dvh] md:h-screen w-full bg-gray-50 animate-fade-in">
      <div className="hidden md:flex w-1/5 bg-neo-yellow border-r-4 border-black p-4">
        <div className="w-full space-y-4">
          <div className="skeleton h-12 w-24 rounded" />
          <div className="skeleton h-4 w-28 rounded" />
          <div className="space-y-2">
            <div className="skeleton h-10 w-full rounded" />
            <div className="skeleton h-10 w-full rounded" />
            <div className="skeleton h-10 w-full rounded" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="skeleton h-6 w-20 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-12 space-y-6">
        <div className="md:hidden skeleton h-12 w-48 rounded" />
        <div className="hidden md:block skeleton h-12 w-1/3 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-52 md:h-64 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSkeleton;
