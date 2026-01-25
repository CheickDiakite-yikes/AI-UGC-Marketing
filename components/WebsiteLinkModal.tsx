'use client';

import React, { useState } from 'react';

interface WebsiteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
  isLoading?: boolean;
}

const WebsiteLinkModal: React.FC<WebsiteLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

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
    if (!validateUrl(url)) return;
    
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    await onSubmit(finalUrl);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      <div className="relative bg-white border-4 border-black shadow-neo p-6 md:p-8 w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="inline-block bg-neo-pink border-2 border-black px-3 py-1 mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest">Quick Setup</span>
          </div>
          <h2 className="font-display font-black text-2xl md:text-3xl mb-2">
            Link to Campaign
          </h2>
          <p className="text-sm text-gray-600">
            Share your website and we'll instantly understand your brand.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="website-url" 
              className="block text-xs font-black uppercase tracking-widest mb-2"
            >
              Your Website
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
              autoFocus
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Include the full URL with https://
            </p>
            {error && (
              <p className="text-xs text-red-600 font-bold mt-1">{error}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neo-pink border-3 border-black px-6 py-3 font-black uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Start Creating'}
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
      </div>
    </div>
  );
};

export default WebsiteLinkModal;
