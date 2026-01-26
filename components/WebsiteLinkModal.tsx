'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExtractedBrandData } from '@/types';

type ModalState = 'input' | 'analyzing' | 'confirmation';

interface WebsiteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
  onAnalyze: (url: string, logoFile?: File) => Promise<{ success: boolean; data?: ExtractedBrandData; error?: string; logoUrl?: string }>;
  onConfirm: (url: string, data: ExtractedBrandData, logoUrl?: string) => Promise<void>;
  isLoading?: boolean;
}

const PROGRESS_MESSAGES = [
  'Fetching website...',
  'Reading content...',
  'Analyzing brand...',
  'Extracting info...',
  'Almost there...',
];

const WebsiteLinkModal: React.FC<WebsiteLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onAnalyze,
  onConfirm,
  isLoading = false,
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState<ModalState>('input');
  const [progressIndex, setProgressIndex] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedBrandData | null>(null);
  const [editedCompanyName, setEditedCompanyName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalState !== 'analyzing') return;
    
    const interval = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [modalState]);

  useEffect(() => {
    if (!isOpen) {
      setModalState('input');
      setProgressIndex(0);
      setExtractedData(null);
      setError('');
      setLogoFile(null);
      setLogoPreview(null);
      setLogoUrl(null);
    }
  }, [isOpen]);

  const handleLogoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be under 5MB');
      return;
    }
    setLogoFile(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoSelect(file);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setError('Please enter your website URL');
      return false;
    }
    let testUrl = input.trim();
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'https://' + testUrl;
    }
    try {
      new URL(testUrl);
      setError('');
      return true;
    } catch {
      setError('Please enter a valid URL');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasUrl = url.trim().length > 0;
    const hasLogo = logoFile !== null;
    
    if (!hasUrl && !hasLogo) {
      setError('Please enter a website URL or upload your logo');
      return;
    }
    
    let finalUrl = '';
    if (hasUrl) {
      if (!validateUrl(url)) return;
      finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
    }
    
    setModalState('analyzing');
    setProgressIndex(0);
    setError('');
    
    try {
      const result = await onAnalyze(finalUrl, logoFile || undefined);
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        setEditedCompanyName(result.data.companyName);
        setEditedDescription(result.data.description);
        if (result.logoUrl) {
          setLogoUrl(result.logoUrl);
        }
        setModalState('confirmation');
      } else {
        setError(result.error || 'Failed to analyze. You can try again or skip.');
        setModalState('input');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setModalState('input');
    }
  };

  const handleConfirm = async () => {
    if (!extractedData) return;
    
    setIsConfirming(true);
    try {
      const finalData: ExtractedBrandData = {
        ...extractedData,
        companyName: editedCompanyName || extractedData.companyName,
        description: editedDescription || extractedData.description,
      };
      
      let finalUrl = url.trim();
      if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      
      await onConfirm(finalUrl, finalData, logoUrl || undefined);
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUseDifferentUrl = () => {
    setModalState('input');
    setExtractedData(null);
    setError('');
  };

  const handleSkip = () => {
    onClose();
  };

  const renderInputState = () => (
    <>
      <div className="text-center mb-6">
        <div className="inline-block bg-neo-pink border-2 border-black px-3 py-1 mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest">Quick Setup</span>
        </div>
        <h2 className="font-display font-black text-2xl md:text-3xl mb-2">
          Link to Campaign
        </h2>
        <p className="text-sm text-gray-600">
          Share your website or logo and we'll instantly understand your brand.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest mb-2">
            Upload Your Logo <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoSelect(file);
            }}
            className="hidden"
          />
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] border-3 border-black bg-white flex items-center justify-center overflow-hidden">
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              </div>
              <button
                type="button"
                onClick={handleLogoRemove}
                className="bg-white border-2 border-black px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-pink transition-all"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              className={`w-full h-[100px] border-3 border-dashed ${isDragging ? 'border-neo-pink bg-neo-pink/10' : 'border-black'} flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleLogoDrop}
            >
              <div className="w-10 h-10 border-2 border-black bg-gray-100 flex items-center justify-center mb-2">
                <span className="text-lg">📷</span>
              </div>
              <p className="text-xs font-bold text-gray-600">Drop logo or click to upload</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-xs font-bold text-gray-400 uppercase">and/or</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        <div>
          <label 
            htmlFor="website-url" 
            className="block text-xs font-black uppercase tracking-widest mb-2"
          >
            Your Website <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="website-url"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError('');
            }}
            placeholder="https://yourcompany.com"
            className="w-full bg-white border-3 border-black px-4 py-3 font-bold text-base focus:outline-none focus:ring-2 focus:ring-neo-pink placeholder:text-gray-400"
            disabled={isLoading}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Include the full URL with https://
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-600 font-bold">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neo-pink border-3 border-black px-6 py-3 font-black uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Analyze My Brand'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full bg-white border-2 border-black px-6 py-2 font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </form>

      <p className="text-center text-[10px] text-gray-500 mt-4">
        You can always add more brand details in your Company settings.
      </p>
    </>
  );

  const renderAnalyzingState = () => (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-neo-pink border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-neo-lime border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          <div className="absolute inset-4 border-4 border-neo-cyan border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
        </div>
      </div>
      
      <h2 className="font-display font-black text-xl md:text-2xl mb-2">
        Analyzing Your Brand
      </h2>
      
      <div className="h-6 flex items-center justify-center">
        <p className="text-sm text-gray-600 animate-pulse">
          {PROGRESS_MESSAGES[progressIndex]}
        </p>
      </div>
      
      <div className="mt-6 flex justify-center gap-1">
        {PROGRESS_MESSAGES.slice(0, 4).map((_, idx) => (
          <div 
            key={idx} 
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx <= progressIndex ? 'bg-neo-pink' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      <p className="text-[10px] text-gray-400 mt-6">
        This usually takes 10-20 seconds
      </p>
    </div>
  );

  const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('twitter') || p.includes('x')) return '𝕏';
    if (p.includes('linkedin')) return 'in';
    if (p.includes('facebook')) return 'f';
    if (p.includes('instagram')) return '📷';
    if (p.includes('youtube')) return '▶';
    if (p.includes('tiktok')) return '♪';
    if (p.includes('github')) return '⌘';
    return '🔗';
  };

  const renderConfirmationState = () => {
    if (!extractedData) return null;
    
    const hasExtras = extractedData.tagline || 
      (extractedData.brandColors && extractedData.brandColors.length > 0) ||
      (extractedData.fonts && extractedData.fonts.length > 0) ||
      (extractedData.brandFeel && extractedData.brandFeel.length > 0) ||
      (extractedData.socialLinks && extractedData.socialLinks.length > 0) ||
      extractedData.foundedYear || extractedData.teamSize;
    
    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="inline-block bg-neo-lime border-2 border-black px-3 py-1 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest">✓ Brand Detected</span>
          </div>
          <h2 className="font-display font-black text-xl md:text-2xl">
            Confirm Your Brand
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-gray-600">
              Company Name
            </label>
            <input
              type="text"
              value={editedCompanyName}
              onChange={(e) => setEditedCompanyName(e.target.value)}
              className="w-full bg-white border-2 border-black px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-neo-pink"
            />
            {extractedData.tagline && (
              <p className="mt-1 text-xs italic text-gray-600">"{extractedData.tagline}"</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-gray-600">
              Description
            </label>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={2}
              className="w-full bg-white border-2 border-black px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-neo-pink resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border-2 border-black p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Industry</p>
              <p className="text-sm font-bold truncate">{extractedData.industry}</p>
            </div>
            <div className="bg-gray-50 border-2 border-black p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Audience</p>
              <p className="text-sm font-bold truncate">{extractedData.targetAudience}</p>
            </div>
          </div>

          <div className="bg-gray-50 border-2 border-black p-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Key Offerings</p>
            <div className="flex flex-wrap gap-1">
              {extractedData.keyOfferings.slice(0, 5).map((offering, idx) => (
                <span 
                  key={idx} 
                  className="inline-block bg-neo-cyan border border-black px-2 py-0.5 text-[10px] font-bold"
                >
                  {offering}
                </span>
              ))}
            </div>
          </div>

          {hasExtras && (
            <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Additional Info Detected</p>
              
              {extractedData.brandColors && extractedData.brandColors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500">Colors:</span>
                  <div className="flex gap-1">
                    {extractedData.brandColors.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border-2 border-black"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {extractedData.fonts && extractedData.fonts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500">Fonts:</span>
                  <div className="flex gap-1 flex-wrap">
                    {extractedData.fonts.map((font, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-100 border border-black text-[10px] font-bold"
                      >
                        {font}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.brandFeel && extractedData.brandFeel.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500">Brand Feel:</span>
                  <div className="flex gap-1 flex-wrap">
                    {extractedData.brandFeel.map((feel, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-neo-lime border border-black text-[10px] font-bold"
                      >
                        {feel}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.socialLinks && extractedData.socialLinks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500">Social:</span>
                  {extractedData.socialLinks.slice(0, 5).map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-6 h-6 bg-black text-white text-[10px] font-bold hover:bg-neo-pink transition-colors"
                      title={link.platform}
                    >
                      {getSocialIcon(link.platform)}
                    </a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-[10px]">
                {extractedData.foundedYear && (
                  <span className="text-gray-600">
                    <span className="font-bold">Founded:</span> {extractedData.foundedYear}
                  </span>
                )}
                {extractedData.teamSize && (
                  <span className="text-gray-600">
                    <span className="font-bold">Team:</span> {extractedData.teamSize}
                  </span>
                )}
                {extractedData.contactEmail && (
                  <span className="text-gray-600">
                    <span className="font-bold">Email:</span> {extractedData.contactEmail}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 font-bold text-center">{error}</p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full bg-neo-pink border-3 border-black px-6 py-3 font-black uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? 'Saving...' : 'Confirm & Start Creating'}
          </button>
          <button
            type="button"
            onClick={handleUseDifferentUrl}
            disabled={isConfirming}
            className="w-full bg-white border-2 border-black px-6 py-2 font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Use Different URL
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={modalState === 'analyzing' ? undefined : handleSkip}
      />
      
      <div className="relative bg-white border-4 border-black shadow-neo p-6 md:p-8 w-full max-w-md animate-fade-in-up">
        {modalState === 'input' && renderInputState()}
        {modalState === 'analyzing' && renderAnalyzingState()}
        {modalState === 'confirmation' && renderConfirmationState()}
      </div>
    </div>
  );
};

export default WebsiteLinkModal;
