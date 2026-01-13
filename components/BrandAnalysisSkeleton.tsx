import React from 'react';

const BrandAnalysisSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-2xl flex flex-col animate-pulse">
        
        {/* Header Skeleton */}
        <div className="bg-gray-100 border-b-4 border-black p-4 flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-300 rounded"></div>
          <div className="h-6 w-6 bg-gray-300 rounded"></div>
        </div>

        <div className="p-8 flex flex-col md:flex-row gap-8">
          {/* Logo Skeleton */}
          <div className="md:w-1/3 flex flex-col items-center">
             <div className="w-full aspect-square border-2 border-dashed border-gray-300 flex items-center justify-center p-4 bg-gray-50 mb-4 rounded-lg">
                <div className="w-16 h-16 bg-gray-200 rounded-full animate-bounce"></div>
             </div>
             <div className="h-3 w-24 bg-gray-300 rounded mt-2"></div>
          </div>

          {/* Fields Skeleton */}
          <div className="md:w-2/3 space-y-6">
             {/* Colors */}
             <div>
                <div className="h-3 w-32 bg-gray-300 rounded mb-2"></div>
                <div className="flex gap-4">
                   {[1, 2, 3].map(i => (
                      <div key={i} className="flex flex-col gap-1 w-full">
                         <div className="h-12 w-full rounded border-2 border-gray-200 bg-gray-100"></div>
                         <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Fonts */}
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <div className="h-3 w-24 bg-gray-300 rounded mb-2"></div>
                   <div className="h-10 w-full bg-gray-100 border-2 border-gray-200 rounded"></div>
                </div>
                <div>
                   <div className="h-3 w-24 bg-gray-300 rounded mb-2"></div>
                   <div className="h-10 w-full bg-gray-100 border-2 border-gray-200 rounded"></div>
                </div>
             </div>

             {/* Vibe */}
             <div>
                <div className="h-3 w-24 bg-gray-300 rounded mb-2"></div>
                <div className="h-16 w-full bg-gray-100 border-2 border-gray-200 rounded"></div>
             </div>
             
             <div className="flex items-center justify-center gap-2 text-neo-pink font-bold mt-4 animate-pulse">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Analyzing Brand DNA with Gemini 3...</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandAnalysisSkeleton;