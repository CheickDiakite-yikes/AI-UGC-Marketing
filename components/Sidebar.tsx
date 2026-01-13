'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ProjectAsset, BrandIdentity, AvatarIdentity, UsageStats } from '../types';
import { logout } from '../app/actions/authActions';
import { scrapeWebsiteAction, reExtractPdfAction } from '../app/actions/boardActions';

interface SidebarProps {
  assets: ProjectAsset[];
  brandIdentity: BrandIdentity | null;
  avatarIdentity: AvatarIdentity | null;
  onAddAsset: (asset: ProjectAsset) => void;
  onDeleteAsset?: (assetId: string) => void;
  onEditBrand: () => void;
  onEditAvatar: () => void;
  onStartCapture: () => void;
  onClose?: () => void;
  onExitApp?: () => void;
  usageStats?: UsageStats;
  boardId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  assets,
  brandIdentity,
  avatarIdentity,
  onAddAsset,
  onDeleteAsset,
  onEditBrand,
  onEditAvatar,
  onStartCapture,
  onClose,
  onExitApp,
  usageStats,
  boardId
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isScrapingLink, setIsScrapingLink] = useState(false);
  const [extractingAssets, setExtractingAssets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAndExtractPdfs = async () => {
      const pdfsNeedingExtraction = assets.filter(
        asset => asset.type === 'pdf' && (!asset.extractedText || asset.extractedText.trim().length === 0)
      );
      
      for (const asset of pdfsNeedingExtraction) {
        if (extractingAssets.has(asset.id)) continue;
        
        setExtractingAssets(prev => new Set(prev).add(asset.id));
        
        try {
          const result = await reExtractPdfAction(asset.id);
          if (result.success && result.extractedText) {
            const updatedAsset: ProjectAsset = {
              ...asset,
              extractedText: result.extractedText,
              status: 'ready'
            };
            onAddAsset(updatedAsset);
          }
        } catch (error) {
          console.error(`Failed to re-extract PDF ${asset.name}:`, error);
        } finally {
          setExtractingAssets(prev => {
            const newSet = new Set(prev);
            newSet.delete(asset.id);
            return newSet;
          });
        }
      }
    };
    
    if (assets.length > 0) {
      checkAndExtractPdfs();
    }
  }, [assets]);

  const ALLOWED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/heic,image/heif";
  const ALLOWED_DOC_TYPES = ".pdf,text/plain";

  // --- PRECISE UNIT ECONOMICS (Ref: Oct 2025 Pricing) ---
  // Nano Banana Pro: $0.15 per 4K image
  const COST_PER_IMAGE = 0.15;
  // Veo 3.1 Fast: $0.15 per second (Average marketing clip = 5 seconds)
  const COST_PER_VIDEO = 0.75;

  // Market Value Equivalents (Agency Proxy)
  const VALUE_PER_IMAGE = 75.00;  // Professional customized creative
  const VALUE_PER_VIDEO = 350.00; // High-fidelity social video motion

  const totalCost = usageStats ? (usageStats.imagesGenerated * COST_PER_IMAGE) + (usageStats.videosGenerated * COST_PER_VIDEO) : 0;
  const totalValue = usageStats ? (usageStats.imagesGenerated * VALUE_PER_IMAGE) + (usageStats.videosGenerated * VALUE_PER_VIDEO) : 0;
  const savings = totalValue - totalCost;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'logo' | 'avatar' | 'general') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/svg+xml') {
      alert("SVG files are not supported for AI analysis. Please upload a PNG or JPEG.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];

      let type: ProjectAsset['type'] = 'pdf';
      if (category === 'logo') type = 'logo';
      else if (category === 'avatar') type = 'avatar';
      else if (file.type.startsWith('image/')) type = 'image';
      else if (file.type === 'text/plain') type = 'text';

      let extractedText: string | undefined;
      
      if (file.type === 'application/pdf') {
        try {
          const response = await fetch('/api/extract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Content: base64 })
          });
          
          if (response.ok) {
            const data = await response.json();
            extractedText = data.text;
          }
        } catch (error) {
          console.error('Failed to extract PDF text:', error);
        }
      }

      const newAsset: ProjectAsset = {
        id: Date.now().toString(),
        type: type,
        name: file.name,
        content: base64,
        mimeType: file.type,
        extractedText
      };
      onAddAsset(newAsset);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddLink = async () => {
    if (!boardId || !linkUrl.trim()) return;
    
    setIsScrapingLink(true);
    try {
      const result = await scrapeWebsiteAction(boardId, linkUrl.trim());
      if (result.success && result.asset) {
        onAddAsset(result.asset as ProjectAsset);
        setLinkUrl('');
        setShowLinkModal(false);
      } else {
        alert(result.error || 'Failed to scrape website');
      }
    } catch (error) {
      alert('Failed to scrape website. Please try again.');
    } finally {
      setIsScrapingLink(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-neo-yellow border-r-4 border-black shadow-neo md:shadow-none overflow-hidden">

      {/* Header / Mobile Close */}
      <div className="p-3 border-b-4 border-black flex justify-between items-start bg-neo-yellow sticky top-0 z-10">
        <div
          onClick={onExitApp}
          className="cursor-pointer hover:opacity-70 transition-opacity"
          title="Back to Landing Page"
        >
          <h1 className="font-display font-bold text-2xl mb-0.5 text-black leading-tight">
            Predi<br />AI
          </h1>
          <p className="font-sans text-[10px] font-medium bg-black text-white inline-block px-2 py-0.5">
            Marketing OS
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 bg-white border-2 border-black shadow-neo-sm active:translate-y-1 active:shadow-none transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="mb-4">
          <h2 className="font-display font-bold text-base border-b-2 border-black mb-3 pb-1">Context Engine</h2>

          {/* Brand Identity Section */}
          <div className="mb-4">
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block text-gray-700">BRAND IDENTITY</label>
            {brandIdentity ? (
              <div className="bg-white border-2 border-black shadow-neo-sm p-2.5 mb-2 animate-fade-in-up">
                <div className="flex gap-1.5 mb-2">
                  {brandIdentity.colors.map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-black shadow-sm" style={{ backgroundColor: c }}></div>
                  ))}
                </div>
                <p className="text-xs text-gray-800 font-bold mb-2 truncate border-b border-gray-200 pb-1.5">{brandIdentity.vibe}</p>
                <button
                  onClick={onEditBrand}
                  className="w-full bg-neo-pink border-2 border-black py-1.5 text-xs font-bold hover:bg-black hover:text-white transition-all"
                >
                  Edit DNA
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className="w-full bg-white border-2 border-black shadow-neo-sm p-3 font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Upload Logo
              </button>
            )}
            <input type="file" ref={logoInputRef} className="hidden" accept={ALLOWED_IMAGE_TYPES} onChange={(e) => handleFileUpload(e, 'logo')} />
          </div>

          {/* Avatar Identity Section */}
          <div className="mb-4">
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block text-gray-700">AVATAR / SPOKESPERSON</label>
            {avatarIdentity ? (
              <div className="bg-white border-2 border-black shadow-neo-sm p-2.5 mb-2 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  {avatarIdentity.referenceImages && avatarIdentity.referenceImages.length > 0 && (
                    <img src={`data:image/png;base64,${avatarIdentity.referenceImages[0]}`} className="w-10 h-10 border-2 border-black object-cover" alt="Avatar" />
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate">{avatarIdentity.name || 'Spokesperson'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Ready for Ads</p>
                  </div>
                </div>
                <button
                  onClick={onEditAvatar}
                  className="w-full bg-neo-cyan border-2 border-black py-1.5 text-xs font-bold hover:bg-black hover:text-white transition-all"
                >
                  Manage Spokesperson
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex-1 bg-white border-2 border-black shadow-neo-sm p-2.5 font-bold text-xs hover:translate-y-[1px] hover:shadow-none transition-all flex flex-col items-center gap-0.5"
                >
                  <span className="text-lg">📁</span>
                  Upload
                </button>
                <button
                  onClick={onStartCapture}
                  className="flex-1 bg-white border-2 border-black shadow-neo-sm p-2.5 font-bold text-xs hover:translate-y-[1px] hover:shadow-none transition-all flex flex-col items-center gap-0.5"
                >
                  <span className="text-lg">📸</span>
                  Selfie
                </button>
              </div>
            )}
            <input type="file" ref={avatarInputRef} className="hidden" accept={ALLOWED_IMAGE_TYPES} onChange={(e) => handleFileUpload(e, 'avatar')} />
          </div>

          {/* General Files Section */}
          <div className="mb-4">
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block text-gray-700">SOURCES & DOCS</label>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-white border-2 border-black shadow-neo-sm p-2.5 font-bold hover:translate-y-[1px] hover:shadow-none transition-all flex flex-col items-center gap-0.5 text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Upload Files
              </button>
              <button
                onClick={() => setShowLinkModal(true)}
                className="flex-1 bg-white border-2 border-black shadow-neo-sm p-2.5 font-bold hover:translate-y-[1px] hover:shadow-none transition-all flex flex-col items-center gap-0.5 text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                Add Link
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept={`${ALLOWED_IMAGE_TYPES},${ALLOWED_DOC_TYPES}`} onChange={(e) => handleFileUpload(e, 'general')} />
          </div>


          <div className="space-y-2">
            {assets.map((asset) => {
              const isExtracting = extractingAssets.has(asset.id);
              const needsExtraction = asset.type === 'pdf' && (!asset.extractedText || asset.extractedText.trim().length === 0);
              
              return (
                <div key={asset.id} className={`bg-white border-2 border-black p-1.5 shadow-neo-sm flex items-center justify-between group active:scale-[0.98] transition-transform ${needsExtraction && !isExtracting ? 'border-yellow-500' : ''}`}>
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <div className={`w-8 h-8 flex-shrink-0 border-2 border-black flex items-center justify-center font-bold text-[9px] ${asset.type === 'logo' ? 'bg-neo-pink' : (asset.type === 'avatar' ? 'bg-neo-cyan' : (asset.type === 'link' ? 'bg-orange-300' : 'bg-neo-lime'))}`}>
                      {asset.type === 'logo' ? 'LOGO' : (asset.type === 'avatar' ? 'AVTR' : (asset.type === 'image' ? 'IMG' : (asset.type === 'link' ? 'LINK' : 'DOC')))}
                    </div>
                    <div className="flex flex-col overflow-hidden flex-1 pr-1">
                      <span className="truncate text-xs font-bold">{asset.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] uppercase text-gray-500 font-bold">{asset.type}</span>
                        {isExtracting ? (
                          <span className="text-[9px] font-bold text-blue-600 ml-auto animate-pulse flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Extracting...
                          </span>
                        ) : needsExtraction ? (
                          <span className="text-[9px] font-bold text-yellow-600 ml-auto">⚠️ Needs extraction</span>
                        ) : asset.status === 'digesting' ? (
                          <span className="text-[9px] font-bold text-yellow-600 ml-auto animate-pulse">Digesting...</span>
                        ) : (
                          <span className="text-[9px] font-bold text-green-600 ml-auto">Ready</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {onDeleteAsset && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${asset.name}" from your context?`)) {
                          onDeleteAsset(asset.id);
                        }
                      }}
                      className="ml-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Usage & Economics Footer */}
      <div className="mt-auto p-3 border-t-4 border-black bg-neo-black">
        <div className="text-white">
          {/* Quota Row */}
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <div className="flex justify-between text-[9px] mb-0.5">
                <span className="text-gray-400">IMAGES</span>
                <span className="text-white font-bold">{usageStats?.imagesGenerated || 0}/20</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full">
                <div className="bg-neo-pink h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((usageStats?.imagesGenerated || 0) / 20) * 100)}%` }}></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[9px] mb-0.5">
                <span className="text-gray-400">VIDEOS</span>
                <span className="text-white font-bold">{usageStats?.videosGenerated || 0}/5</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full">
                <div className="bg-neo-cyan h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((usageStats?.videosGenerated || 0) / 5) * 100)}%` }}></div>
              </div>
            </div>
          </div>
          {/* Economics Row */}
          <div className="flex justify-between items-center text-[10px] border-t border-white/20 pt-2">
            <div>
              <span className="text-gray-400">Value: </span>
              <span className="text-neo-lime font-bold">${totalValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Cost: </span>
              <span className="font-bold">${totalCost.toFixed(2)}</span>
            </div>
            <div className="bg-neo-lime text-black px-2 py-0.5 font-black text-[9px] uppercase">
              +${savings.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* User / Logout */}
      <div className="p-3 bg-black text-white border-t border-white/20">
        <button
          onClick={() => logout()}
          className="w-full text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-400 flex items-center gap-2 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Disconnect Session
        </button>
      </div>

      {/* Link URL Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black shadow-neo p-4 w-full max-w-md">
            <h3 className="font-display font-bold text-lg mb-3">Add Website Link</h3>
            <p className="text-xs text-gray-600 mb-3">Enter a URL to scrape its content for AI context.</p>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border-2 border-black p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neo-pink"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && linkUrl.trim()) {
                  handleAddLink();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                }}
                className="flex-1 border-2 border-black py-2 text-sm font-bold hover:bg-gray-100 transition-colors"
                disabled={isScrapingLink}
              >
                Cancel
              </button>
              <button
                onClick={handleAddLink}
                disabled={!linkUrl.trim() || isScrapingLink}
                className="flex-1 bg-neo-pink border-2 border-black py-2 text-sm font-bold hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScrapingLink ? 'Scraping...' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
