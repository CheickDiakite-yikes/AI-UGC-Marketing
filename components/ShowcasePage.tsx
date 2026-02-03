import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ShowcaseItem } from '../types';
import { getShowcaseItemsAction } from '../app/actions/showcaseActions';

interface Props {
  onBack: () => void;
}

type FilterId = 'all' | 'video' | 'image' | 'carousel';

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'image', label: 'Images' },
  { id: 'carousel', label: 'Carousels' },
];

const VIDEO_POSTER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%2380F0F0'/><stop offset='100%' stop-color='%23FF90E8'/></linearGradient></defs><rect width='400' height='300' fill='url(%23g)'/><circle cx='200' cy='150' r='40' fill='%23000000' fill-opacity='0.7'/><polygon points='190,135 190,165 218,150' fill='white'/></svg>";

const VideoPreview = ({ src, className }: { src: string; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canAutoPlay, setCanAutoPlay] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as any)?.connection?.saveData;
    setCanAutoPlay(!prefersReducedMotion && !saveData);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canAutoPlay) return;
    let observer: IntersectionObserver | null = null;
    const handle = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video.play().catch(() => null);
        } else {
          video.pause();
        }
      });
    };
    observer = new IntersectionObserver(handle, { threshold: 0.35 });
    observer.observe(video);
    return () => observer?.disconnect();
  }, [canAutoPlay]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      loop
      preload="metadata"
      poster={VIDEO_POSTER}
    />
  );
};

const ShowcasePage: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);

  useEffect(() => {
    let mounted = true;
    getShowcaseItemsAction()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  const stats = useMemo(() => {
    const counts = { video: 0, image: 0, carousel: 0 };
    items.forEach((item) => {
      if (item.type in counts) {
        counts[item.type] += 1;
      }
    });
    return counts;
  }, [items]);

  const featured = items[0] || null;

  const closeModal = () => setSelectedItem(null);

  const formatAspectRatio = (ratio?: string | null) => {
    if (!ratio) return null;
    const normalized = ratio.trim();
    if (normalized.includes(':')) {
      const [w, h] = normalized.split(':');
      const width = Number(w);
      const height = Number(h);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return `${width} / ${height}`;
      }
    }
    return null;
  };

  const getPreviewStyle = (item: ShowcaseItem) => {
    const parsed = formatAspectRatio(item.aspectRatio);
    if (parsed) {
      return { aspectRatio: parsed };
    }
    if (item.type === 'video') return { aspectRatio: '16 / 9' };
    if (item.type === 'image') return { aspectRatio: '1 / 1' };
    if (item.type === 'carousel') return { aspectRatio: '1 / 1' };
    return { aspectRatio: '4 / 3' };
  };

  return (
    <div className="w-full h-screen overflow-y-auto bg-white font-sans text-neo-black relative overflow-x-hidden selection:bg-neo-yellow selection:text-black custom-scrollbar scroll-smooth">
      <div className="absolute -top-24 left-12 w-72 h-72 bg-neo-cyan/30 blur-3xl animate-float"></div>
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-neo-pink/30 blur-3xl animate-pulse"></div>

      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-4 border-black p-4 flex justify-between items-center">
        <div className="flex items-center cursor-pointer" onClick={onBack}>
          <img src="/predi-cloud-logo.png" alt="Predi" className="h-12 w-auto object-contain" />
        </div>
        <button
          onClick={onBack}
          className="bg-white border-2 border-black shadow-neo px-4 py-2 font-bold hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Community Showcase</p>
            <h1 className="font-display font-black text-4xl sm:text-5xl md:text-7xl leading-none mt-3 break-words">
              Campaigns that feel
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neo-pink to-neo-cyan break-words">
                impossible.
              </span>
            </h1>
            <p className="mt-4 text-lg md:text-xl font-medium text-gray-700 max-w-xl">
              A curated gallery of the most-loved Predi AI outputs. Every asset here was favored and
              battle-tested by real teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { label: 'Videos', value: stats.video },
                { label: 'Images', value: stats.image },
                { label: 'Carousels', value: stats.carousel },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border-2 border-black px-4 py-2 shadow-neo-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</div>
                  <div className="text-2xl font-black">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-neo-lime border-4 border-black shadow-neo animate-wiggle"></div>
            <div className="bg-black border-4 border-black shadow-neo-lg p-4 relative max-w-full">
              <div className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Featured Drop
              </div>
              {featured?.previewUrl ? (
                <button
                  type="button"
                  onClick={() => setSelectedItem(featured)}
                  className="mt-6 w-full bg-white border-2 border-black overflow-hidden"
                  style={getPreviewStyle(featured)}
                >
                  {featured.type === 'video' ? (
                    <VideoPreview
                      src={featured.previewUrl}
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img src={featured.previewUrl} alt={featured.title} className="w-full h-full object-contain bg-white" />
                  )}
                </button>
              ) : (
                <div className="mt-6 w-full bg-gray-100 border-2 border-black flex items-center justify-center text-sm font-bold text-gray-500" style={{ aspectRatio: '4 / 3' }}>
                  No showcase items yet.
                </div>
              )}
              {featured && (
                <div className="mt-4">
                  <div className="text-white text-lg font-black">{featured.title}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">{featured.type}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 border-2 border-black font-bold text-xs uppercase tracking-widest transition-all ${
                activeFilter === filter.id
                  ? 'bg-neo-black text-white shadow-neo'
                  : 'bg-white text-gray-700 hover:bg-neo-yellow'
              }`}
            >
              {filter.label}
            </button>
          ))}
          <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-gray-500">
            {loading ? 'Loading showcase...' : `${filteredItems.length} items`}
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {loading && (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="border-4 border-black bg-white/70 p-4 shadow-neo-sm animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 border-2 border-black"></div>
                <div className="mt-3 h-4 bg-gray-200 w-3/4"></div>
                <div className="mt-2 h-3 bg-gray-100 w-1/2"></div>
              </div>
            ))
          )}
          {!loading && filteredItems.map((item, idx) => {
            const isWide = idx % 7 === 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={`group text-left border-4 border-black bg-white shadow-neo-lg p-4 transition-transform hover:-translate-y-1 animate-fade-in-up ${
                  isWide ? 'sm:col-span-2' : ''
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="relative border-2 border-black overflow-hidden bg-gray-100" style={getPreviewStyle(item)}>
                  {item.previewUrl ? (
                    item.type === 'video' ? (
                      <VideoPreview
                        src={item.previewUrl}
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <img src={item.previewUrl} alt={item.title} className="w-full h-full object-contain bg-white" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gray-200"></div>
                  )}
                  <div className="absolute top-2 left-2 bg-neo-yellow text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 border-2 border-black">
                    {item.type}
                  </div>
                  {item.type === 'carousel' && (
                    <div className="absolute bottom-2 right-2 bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 border-2 border-black">
                      {item.mediaUrls.length} slides
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-black truncate">{item.title}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">
                    {item.boardName || 'Community Favorite'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {!loading && filteredItems.length === 0 && (
          <div className="mt-8 border-4 border-black bg-white p-6 shadow-neo text-center">
            <div className="text-sm font-black">No showcase items yet.</div>
            <div className="text-xs text-gray-500 mt-2">Favorite content from the admin account to feature it here.</div>
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeModal}>
          <div
            className="relative bg-white border-4 border-black shadow-neo-lg max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute -top-4 -right-4 w-10 h-10 bg-neo-yellow border-2 border-black font-black"
              aria-label="Close showcase item"
            >
              X
            </button>
            <div className="p-4 border-b-2 border-black">
              <div className="text-xs font-black uppercase tracking-widest text-gray-500">{selectedItem.type}</div>
              <div className="text-2xl font-black">{selectedItem.title}</div>
              {selectedItem.boardName && (
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">
                  {selectedItem.boardName}
                </div>
              )}
            </div>
            <div className="bg-black">
              {selectedItem.type === 'video' && selectedItem.previewUrl && (
                <video
                  src={selectedItem.previewUrl}
                  className="w-full max-h-[70vh] object-contain bg-black"
                  controls
                  playsInline
                />
              )}
              {selectedItem.type === 'image' && selectedItem.previewUrl && (
                <img
                  src={selectedItem.previewUrl}
                  alt={selectedItem.title}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              )}
              {selectedItem.type === 'carousel' && (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory p-6 bg-black scroll-smooth">
                  {selectedItem.mediaUrls.map((url, idx) => (
                    <div key={`${selectedItem.id}-slide-${idx}`} className="snap-center min-w-[70%]">
                      <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-auto border-2 border-white/30" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedItem.type === 'carousel' && (
              <div className="p-4 border-t-2 border-black text-xs font-bold text-gray-700">
                Swipe horizontally to browse the carousel.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowcasePage;
