
import React, { useState } from 'react';
import { CanvasItem } from '../types';

interface Props {
  item: CanvasItem;
  onExpand?: (item: CanvasItem) => void;
  onDelete?: (itemId: string) => void;
  onToggleFavorite?: (itemId: string, nextState: boolean) => void;
  variant?: 'classic' | 'canvas';
}

const CanvasItemCard: React.FC<Props> = ({ item, onExpand, onDelete, onToggleFavorite, variant = 'classic' }) => {
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const isFavorite = Boolean(item.isFavorite);
  const isCanvas = variant === 'canvas';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${item.title}"? This action cannot be undone.`)) {
      onDelete?.(item.id);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(item.id, !isFavorite);
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
  const pendingStatus = !isContentReady ? (item.meta?.status || 'queued') : null;
  const pendingLabel = pendingStatus === 'processing' ? 'Processing' : pendingStatus === 'failed' ? 'Failed' : 'Queued';
  const sceneCount = typeof item.meta?.sceneCount === 'number' ? Math.max(1, item.meta.sceneCount) : 1;
  const totalDurationSeconds = typeof item.meta?.totalDurationSeconds === 'number'
    ? Math.max(1, item.meta.totalDurationSeconds)
    : sceneCount > 1 ? sceneCount * 8 : undefined;
  const isLongVideo = item.type === 'video' && !item.meta?.isScene && (item.meta?.isLongVideo || sceneCount > 1);
  const containerClass = isCanvas
    ? 'rounded-2xl overflow-hidden border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.16)]'
    : 'bg-white border-4 border-black shadow-neo-lg';
  const headerClass = isCanvas
    ? 'border-b border-white/60 bg-white/40'
    : 'border-b-4 border-black bg-neo-pink';
  const favoriteButtonClass = isCanvas
    ? 'p-1 border border-black/10 rounded bg-white/70 text-gray-700 hover:bg-white transition-colors'
    : `p-1 border-2 border-black rounded transition-colors ${isFavorite ? 'bg-neo-lime text-black' : 'bg-white text-black hover:bg-neo-lime'}`;
  const deleteButtonClass = isCanvas
    ? 'p-1 rounded text-gray-400 hover:text-black transition-colors'
    : `${isContentReady ? 'opacity-0 group-hover/header:opacity-100' : 'opacity-100'} transition-opacity p-1 hover:bg-red-500 hover:text-white rounded text-red-600`;
  const badgeClass = isCanvas
    ? 'bg-white/70 border border-black/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-600 rounded-full'
    : 'bg-white/80 border border-black px-1 py-0.5 text-[9px] font-bold rounded';
  const contentPanelClass = isCanvas
    ? 'border-t border-white/60 bg-white/40'
    : 'border-t-4 border-black bg-white';

  return (
    <div className={`${containerClass} p-0 flex flex-col max-w-sm w-full animate-fade-in-up`}>
      {/* Header */}
      <div className={`${headerClass} p-2 flex justify-between items-center relative overflow-hidden group/header`}>
        <h3 className={`font-display font-bold text-sm truncate max-w-[60%] z-10 relative ${isCanvas ? 'text-gray-800' : ''}`}>{item.title}</h3>
        <div className="flex items-center gap-2 z-10 relative">
          {isLongVideo && (
            <div className={badgeClass}>
              Long {sceneCount} scenes
            </div>
          )}
          {onToggleFavorite && isContentReady && (
            <button
              onClick={handleToggleFavorite}
              className={favoriteButtonClass}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill={isFavorite ? 'currentColor' : 'none'}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a1 1 0 011.04 0l2.63 1.62 3.01.1a1 1 0 01.88 1.45l-1.05 2.83 1.82 2.35a1 1 0 01-.53 1.58l-2.93.82-1.68 2.52a1 1 0 01-1.66 0l-1.68-2.52-2.93-.82a1 1 0 01-.53-1.58l1.82-2.35-1.05-2.83a1 1 0 01.88-1.45l3.01-.1 2.63-1.62z" />
              </svg>
            </button>
          )}
          {onDelete && isContentReady && (
            <button
              onClick={handleDelete}
              className={deleteButtonClass}
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
      <div className={`relative group min-h-[200px] flex items-center justify-center overflow-hidden ${isCanvas ? 'bg-white/30' : 'bg-gray-100'}`}>
        {!isContentReady && (
          <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded ${isCanvas ? 'bg-black/70 text-white border border-white/30' : 'bg-black text-white border border-white/30'}`}>
            {pendingLabel}
          </div>
        )}
        {(item.type === 'image' || item.type === 'carousel') && (
           <div 
             className={`cursor-zoom-in relative w-full h-full flex items-center justify-center ${isCanvas ? 'bg-white/60' : 'bg-gray-200'}`}
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
                  <span className={`px-3 py-1 text-xs font-bold shadow-sm ${isCanvas ? 'bg-white/80 border border-black/10 rounded-full' : 'bg-white border-2 border-black shadow-neo-sm'}`}>View Full</span>
                </div>
             )}

             {/* Carousel Controls */}
             {item.type === 'carousel' && item.carouselUrls && item.carouselUrls.length > 1 && (
               <>
                 <button 
                   onClick={handlePrevSlide}
                   className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isCanvas ? 'bg-white/80 border border-black/10 hover:bg-white' : 'bg-white/80 hover:bg-white border-2 border-black'}`}
                 >
                   ←
                 </button>
                 <button 
                   onClick={handleNextSlide}
                   className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isCanvas ? 'bg-white/80 border border-black/10 hover:bg-white' : 'bg-white/80 hover:bg-white border-2 border-black'}`}
                 >
                   →
                 </button>
                 <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none z-20">
                    {item.carouselUrls.map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full border ${isCanvas ? 'border-black/20' : 'border-black'} ${i === currentSlide ? (isCanvas ? 'bg-black/40' : 'bg-neo-pink') : 'bg-white'}`}></div>
                    ))}
                 </div>
                 <div className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded z-20 ${isCanvas ? 'bg-black/70 text-white' : 'bg-black text-white'}`}>
                    {currentSlide + 1}/{item.carouselUrls.length}
                 </div>
               </>
             )}
           </div>
        )}
        
        {item.type === 'video' && (
          <div className="w-full h-full flex items-center justify-center cursor-zoom-in" onClick={() => onExpand && onExpand(item)}>
            {item.content && (item.content.startsWith('blob:') || item.content.startsWith('/api/storage/') || item.content.startsWith('data:') || item.content.startsWith('http')) ? (
               <video src={item.content} controls className="w-full h-auto max-h-[400px]" onClick={e => e.stopPropagation()} />
            ) : (
               <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse w-full gap-2">
                 <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                 <span className="text-xs font-bold text-gray-400">
                   {isLongVideo ? 'Rendering Long Video...' : 'Rendering Video...'}
                 </span>
                 {isLongVideo && (
                   <div className="flex flex-col items-center gap-2 text-[10px] text-gray-400">
                     <span>{sceneCount} scenes{totalDurationSeconds ? ` · ${totalDurationSeconds}s` : ''}</span>
                     <div className="flex items-center gap-1">
                       {Array.from({ length: Math.min(sceneCount, 5) }).map((_, index) => (
                         <span key={index} className="w-2 h-2 bg-gray-300 rounded-full"></span>
                       ))}
                       {sceneCount > 5 && <span className="text-[9px] text-gray-400">+{sceneCount - 5}</span>}
                     </div>
                   </div>
                 )}
                 <span className="text-[10px] text-gray-400 mt-1">(Takes ~1-2 min per scene)</span>
               </div>
            )}
          </div>
        )}

        {/* Labels / Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none z-10">
          {item.meta?.aspectRatio && (
             <span className={`${isCanvas ? 'bg-white/70 border border-black/10 text-gray-600' : 'bg-neo-lime border-2 border-black shadow-neo-sm'} px-1 text-[10px] font-bold rounded`}>
               {item.meta.aspectRatio}
             </span>
          )}
          {item.meta?.resolution && (
             <span className={`${isCanvas ? 'bg-white/70 border border-black/10 text-gray-600' : 'bg-neo-cyan border-2 border-black shadow-neo-sm'} px-1 text-[10px] font-bold rounded`}>
               {item.meta.resolution}
             </span>
          )}
        </div>
      </div>
      
      {/* Caption & Actions Section */}
      <div className={`${contentPanelClass} p-3 flex flex-col gap-3`}>
         {item.meta?.hook && (
            <div className={`p-2 text-xs ${isCanvas ? 'bg-white/70 border border-black/10 rounded-lg' : 'bg-neo-yellow/30 border-l-4 border-neo-yellow'}`}>
               <span className="font-bold block text-[10px] uppercase text-gray-500">Hook Strategy</span>
               "{item.meta.hook}"
            </div>
         )}

         {item.meta?.caption && (
           <div className="relative group/caption">
              <div className={`text-xs font-medium text-gray-600 line-clamp-3 italic ${isCanvas ? 'bg-white/70 p-3 rounded-lg border border-black/10' : 'bg-gray-50 p-2 rounded-sm border border-gray-100'}`}>
                 {item.meta.caption}
              </div>
              <button 
                onClick={copyCaption}
                className={`mt-2 w-full text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 py-1 transition-colors ${isCanvas ? 'rounded-lg border border-black/10 bg-white/70 hover:bg-white' : 'hover:bg-gray-100 border border-gray-200'}`}
              >
                {copied ? '✅ Copied!' : '📄 Copy Caption'}
              </button>
           </div>
         )}
         
         <div className={`flex justify-between items-center pt-2 mt-1 ${isCanvas ? 'border-t border-white/60' : 'border-t border-gray-100'}`}>
           <span className="text-[10px] font-bold text-gray-400 uppercase">{item.type} Generated</span>
           <button 
            onClick={handleDownload}
            className={`text-xs font-bold transition-colors ${isCanvas ? 'text-gray-600 hover:text-gray-900' : 'hover:underline hover:text-neo-pink'}`}
           >
            Download
           </button>
         </div>
      </div>
    </div>
  );
};

export default CanvasItemCard;
