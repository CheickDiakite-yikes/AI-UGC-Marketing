
import React, { useState } from 'react';
import { CanvasItem } from '../types';

interface Props {
  item: CanvasItem;
  onClose: () => void;
}

const LightboxModal: React.FC<Props> = ({ item, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const displayContent = (item.type === 'carousel' && item.carouselUrls) 
    ? item.carouselUrls[currentSlide] 
    : item.content;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = displayContent;
    const ext = item.type === 'video' ? 'mp4' : 'png';
    const filename = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.${ext}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in-up" onClick={onClose}>
      <div className="relative w-full max-w-6xl max-h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        
        {/* Content Container */}
        <div className="relative bg-transparent flex items-center justify-center w-full h-full max-h-[80vh] mb-4">
            {item.type === 'video' ? (
                 <video src={item.content} controls autoPlay className="max-w-full max-h-full border-4 border-white shadow-2xl" />
            ) : (
                 <img src={displayContent} alt={item.title} className="max-w-full max-h-full object-contain border-4 border-white shadow-2xl bg-white" />
            )}
            
            {/* Carousel Navigation */}
            {item.type === 'carousel' && item.carouselUrls && item.carouselUrls.length > 1 && (
                <>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(prev => (prev - 1 + item.carouselUrls!.length) % item.carouselUrls!.length);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white text-white hover:text-black border-2 border-white w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
                    >
                        ←
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(prev => (prev + 1) % item.carouselUrls!.length);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white text-white hover:text-black border-2 border-white w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
                    >
                        →
                    </button>
                    <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-2">
                        {item.carouselUrls.map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full border border-white ${i === currentSlide ? 'bg-neo-pink' : 'bg-transparent'}`}></div>
                        ))}
                    </div>
                </>
            )}
        </div>

        {/* Action Bar */}
        <div className="flex gap-4 z-50 mt-4">
            <button onClick={handleDownload} className="bg-neo-pink text-black border-2 border-white px-6 py-2 font-bold hover:bg-white transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                DOWNLOAD {item.type === 'carousel' ? 'SLIDE' : 'ASSET'}
            </button>
            <button onClick={onClose} className="bg-transparent text-white border-2 border-white px-6 py-2 font-bold hover:bg-white hover:text-black transition-colors">
                CLOSE
            </button>
        </div>
      </div>
    </div>
  );
}

export default LightboxModal;
