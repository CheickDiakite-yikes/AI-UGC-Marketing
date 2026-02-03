'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { ShowcaseItem } from '../types';
import { getShowcaseItemsAction } from '../app/actions/showcaseActions';

const MarqueeVideo = ({ src, isHovered }: { src: string; isHovered: boolean }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isHovered && isLoaded) {
      video.play().catch(() => null);
    } else {
      video.pause();
      if (isLoaded) {
        video.currentTime = 0;
      }
    }
  }, [isHovered, isLoaded]);

  const handleLoadedData = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-100">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neo-cyan/30 to-neo-pink/30">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
      {isInView && (
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          muted
          playsInline
          loop
          preload="auto"
          onLoadedData={handleLoadedData}
        />
      )}
    </div>
  );
};

const CarouselPreview = ({ urls, isHovered }: { urls: string[]; isHovered: boolean }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHovered && urls.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % urls.length);
      }, 1500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentIndex(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, urls.length]);

  return (
    <div className="relative w-full h-full">
      <img 
        src={urls[currentIndex]} 
        alt="Carousel" 
        className="w-full h-full object-cover" 
        loading="lazy"
        decoding="async"
      />
      {urls.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {urls.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ShowcaseMarquee: React.FC = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    getShowcaseItemsAction()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    setIsPaused(true);
    setHoveredId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    setHoveredId(null);
  }, []);

  if (loading) {
    return (
      <div className="w-full py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-neo-pink border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const duplicatedItems = [...items, ...items];

  return (
    <section className="w-full py-12 md:py-16 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Made with Predi AI
            </p>
            <h2 className="font-display font-black text-2xl md:text-3xl mt-1">
              See what's possible
            </h2>
          </div>
          <Link
            href="/showcase"
            className="hidden sm:flex items-center gap-2 bg-white border-2 border-black px-4 py-2 font-bold text-sm shadow-neo hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full"
        style={{ WebkitMaskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)' }}
      >
        <div
          className={`flex gap-4 md:gap-6 ${isPaused ? '' : 'animate-marquee'}`}
          style={{
            width: 'max-content',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {duplicatedItems.map((item, index) => {
            const isHovered = hoveredId === `${item.id}-${index}`;
            const aspectClass = item.aspectRatio?.includes('9:16') || item.aspectRatio?.includes('9/16')
              ? 'aspect-[9/16] w-40 md:w-52'
              : 'aspect-square w-48 md:w-64';

            return (
              <Link
                key={`${item.id}-${index}`}
                href="/showcase"
                className={`flex-shrink-0 ${aspectClass} bg-white border-4 border-black shadow-neo overflow-hidden transform transition-all duration-300 ${
                  isHovered ? 'scale-105 z-10' : 'hover:scale-[1.02]'
                }`}
                onMouseEnter={() => handleMouseEnter(`${item.id}-${index}`)}
                onMouseLeave={handleMouseLeave}
                onTouchStart={() => handleMouseEnter(`${item.id}-${index}`)}
                onTouchEnd={handleMouseLeave}
              >
                {item.type === 'video' && item.previewUrl && (
                  <MarqueeVideo src={item.previewUrl} isHovered={isHovered} />
                )}
                {item.type === 'image' && item.previewUrl && (
                  <img 
                    src={item.previewUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {item.type === 'carousel' && item.mediaUrls.length > 0 && (
                  <CarouselPreview urls={item.mediaUrls} isHovered={isHovered} />
                )}
                {isHovered && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <div>
                      <p className="text-white font-bold text-sm line-clamp-1">{item.title}</p>
                      <p className="text-white/70 text-xs uppercase">{item.type}</p>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 sm:hidden">
        <Link
          href="/showcase"
          className="flex items-center justify-center gap-2 w-full bg-neo-black text-white px-4 py-3 font-bold text-sm border-2 border-black shadow-neo hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          Explore Full Showcase
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        @media (max-width: 768px) {
          .animate-marquee {
            animation-duration: 40s;
          }
        }
      `}</style>
    </section>
  );
};

export default ShowcaseMarquee;
