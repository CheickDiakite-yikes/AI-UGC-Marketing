
import React, { useState } from 'react';
import { CanvasItem } from '../types';

interface Props {
  item: CanvasItem;
  onExpand?: (item: CanvasItem) => void;
  onDelete?: (itemId: string) => void;
}

const CanvasItemCard: React.FC<Props> = ({ item, onExpand, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${item.title}"? This action cannot be undone.`)) {
      onDelete?.(item.id);
    }
  };

  const copyCaption = () => {
    if (item.meta?.caption) {
      navigator.clipboard.writeText(item.meta.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    // For carousel, download current slide. For others, download content.
    const contentToDownload = (item.type === 'carousel' && item.carouselUrls) 
      ? item.carouselUrls[currentSlide] 
      : item.content;

    link.href = contentToDownload;
    
    // Generate filename
    const ext = item.type === 'video' ? 'mp4' : 'png';
    const filename = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.${ext}`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.carouselUrls) {
      setCurrentSlide((prev) => (prev + 1) % item.carouselUrls!.length);
    }
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.carouselUrls) {
      setCurrentSlide((prev) => (prev - 1 + item.carouselUrls!.length) % item.carouselUrls!.length);
    }
  };

  // Determine what content to show based on type
  let displayContent = item.content;
  if (item.type === 'carousel' && item.carouselUrls && item.carouselUrls.length > 0) {
      displayContent = item.carouselUrls[currentSlide];
  }

  // Helper to check if content is ready to display
  const isContentReady = displayContent && (
    displayContent.startsWith('data:') || 
    displayContent.startsWith('blob:') || 
    displayContent.startsWith('http') ||
    displayContent.startsWith('/api/storage/')
  );

  return (
    <div className="bg-white border-4 border-black shadow-neo-lg p-0 flex flex-col max-w-sm w-full animate-fade-in-up">
      {/* Header */}
      <div className="border-b-4 border-black bg-neo-pink p-2 flex justify-between items-center relative overflow-hidden group/header">
        <h3 className="font-display font-bold text-sm truncate max-w-[60%] z-10 relative">{item.title}</h3>
        <div className="flex items-center gap-2 z-10 relative">
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`${isContentReady ? 'opacity-0 group-hover/header:opacity-100' : 'opacity-100'} transition-opacity p-1 hover:bg-red-500 hover:text-white rounded text-red-600`}
              title="Delete item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {item.meta?.archetype && (
            <div className="text-[9px] uppercase font-bold text-black/60 text-right">
              {item.meta.archetype}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 p-1 opacity-10 font-black text-4xl pointer-events-none">
          {item.type === 'video' ? 'VIDEO' : (item.type === 'carousel' ? 'ALBUM' : 'IMG')}
        </div>
      </div>
      
      {/* Media Content */}
      <div className="relative group bg-gray-100 min-h-[200px] flex items-center justify-center overflow-hidden">
        {(item.type === 'image' || item.type === 'carousel') && (
           <div 
             className="cursor-zoom-in relative w-full h-full flex items-center justify-center bg-gray-200"
             onClick={() => onExpand && onExpand(item)}
           >
             {isContentReady ? (
                <img 
                  src={displayContent} 
                  alt={item.title} 
                  className="w-full h-auto object-contain max-h-[400px] transition-transform duration-300 group-hover:scale-105" 
                />
             ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse">
                   <div className="w-8 h-8 bg-gray-300 rounded-full mb-2"></div>
                   <span className="text-xs font-bold text-gray-400">
                     {item.type === 'carousel' ? 'Generating Slides...' : 'Generating Image...'}
                   </span>
                </div>
             )}
             
             {isContentReady && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="bg-white border-2 border-black px-3 py-1 text-xs font-bold shadow-neo-sm">View Full</span>
                </div>
             )}

             {/* Carousel Controls */}
             {item.type === 'carousel' && item.carouselUrls && item.carouselUrls.length > 1 && (
               <>
                 <button 
                   onClick={handlePrevSlide}
                   className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border-2 border-black w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                 >
                   ←
                 </button>
                 <button 
                   onClick={handleNextSlide}
                   className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border-2 border-black w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                 >
                   →
                 </button>
                 <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none z-20">
                    {item.carouselUrls.map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full border border-black ${i === currentSlide ? 'bg-neo-pink' : 'bg-white'}`}></div>
                    ))}
                 </div>
                 <div className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-20">
                    {currentSlide + 1}/{item.carouselUrls.length}
                 </div>
               </>
             )}
           </div>
        )}
        
        {item.type === 'video' && (
          <div className="w-full h-full flex items-center justify-center cursor-zoom-in" onClick={() => onExpand && onExpand(item)}>
            {item.content.startsWith('blob:') ? (
               <video src={item.content} controls className="w-full h-auto max-h-[400px]" onClick={e => e.stopPropagation()} />
            ) : (
               <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse">
                   <div className="w-8 h-8 bg-gray-300 rounded-full mb-2"></div>
                   <span className="text-xs font-bold text-gray-400">Rendering Video...</span>
                   <span className="text-[10px] text-gray-400 mt-1">(Takes ~1-2 min)</span>
               </div>
            )}
          </div>
        )}

        {/* Labels / Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none z-10">
          {item.meta?.aspectRatio && (
             <span className="bg-neo-lime border-2 border-black px-1 text-[10px] font-bold shadow-neo-sm">
               {item.meta.aspectRatio}
             </span>
          )}
          {item.meta?.resolution && (
             <span className="bg-neo-cyan border-2 border-black px-1 text-[10px] font-bold shadow-neo-sm">
               {item.meta.resolution}
             </span>
          )}
        </div>
      </div>
      
      {/* Caption & Actions Section */}
      <div className="border-t-4 border-black bg-white p-3 flex flex-col gap-3">
         {item.meta?.hook && (
            <div className="bg-neo-yellow/30 border-l-4 border-neo-yellow p-2 text-xs">
               <span className="font-bold block text-[10px] uppercase text-gray-500">Hook Strategy</span>
               "{item.meta.hook}"
            </div>
         )}

         {item.meta?.caption && (
           <div className="relative group/caption">
              <div className="text-xs font-medium text-gray-600 line-clamp-3 bg-gray-50 p-2 rounded-sm border border-gray-100 italic">
                 {item.meta.caption}
              </div>
              <button 
                onClick={copyCaption}
                className="mt-2 w-full text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 py-1 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                {copied ? '✅ Copied!' : '📄 Copy Caption'}
              </button>
           </div>
         )}
         
         <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-1">
           <span className="text-[10px] font-bold text-gray-400 uppercase">{item.type} Generated</span>
           <button 
            onClick={handleDownload}
            className="text-xs font-bold hover:underline hover:text-neo-pink transition-colors"
           >
            Download
           </button>
         </div>
      </div>
    </div>
  );
};

export default CanvasItemCard;
