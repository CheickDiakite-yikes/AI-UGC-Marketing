'use client';

import React from 'react';
import { ProjectAsset } from '../types';

interface SourcePreviewModalProps {
  asset: ProjectAsset;
  onClose: () => void;
}

type ParseStatus = 'error' | 'processing' | 'ready';

function getParseStatus(asset: ProjectAsset): ParseStatus {
  if (asset.type === 'pdf' || asset.type === 'text' || asset.type === 'link') {
    if (!asset.extractedText || asset.extractedText.trim().length === 0) {
      return 'processing';
    }
    if (asset.extractedText.length < 50) {
      return 'error';
    }
    return 'ready';
  }
  return 'ready';
}

function getStatusColor(status: ParseStatus): string {
  switch (status) {
    case 'error': return 'bg-red-500';
    case 'processing': return 'bg-yellow-500';
    case 'ready': return 'bg-green-500';
  }
}

function getStatusLabel(status: ParseStatus): string {
  switch (status) {
    case 'error': return 'Parse Failed';
    case 'processing': return 'Processing';
    case 'ready': return 'Ready';
  }
}

const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({ asset, onClose }) => {
  const status = getParseStatus(asset);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  
  const previewContent = asset.extractedText || '';
  const charCount = previewContent.length;
  const wordCount = previewContent.split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white border-4 border-black shadow-neo w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-neo-yellow border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${statusColor} border-2 border-black`}></div>
            <div>
              <h2 className="font-black text-lg">{asset.name}</h2>
              <p className="text-xs font-bold text-gray-600 uppercase">{asset.type} - {statusLabel}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center font-black hover:bg-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 border-b-2 border-black bg-gray-50">
          <div className="flex gap-4 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Characters:</span>
              <span className={charCount > 0 ? 'text-green-600' : 'text-red-600'}>{charCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Words:</span>
              <span className={wordCount > 0 ? 'text-green-600' : 'text-red-600'}>{wordCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              <span className={`flex items-center gap-1 ${status === 'ready' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Parsed Content Preview</label>
            {status === 'ready' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 font-bold border border-green-300">
                AI has context
              </span>
            )}
          </div>
          
          {previewContent.length > 0 ? (
            <div className="bg-gray-100 border-2 border-black p-3 font-mono text-xs leading-relaxed max-h-[300px] overflow-auto whitespace-pre-wrap">
              {previewContent.slice(0, 3000)}
              {previewContent.length > 3000 && (
                <span className="text-gray-500 italic">
                  {'\n\n'}... [{(previewContent.length - 3000).toLocaleString()} more characters]
                </span>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-300 p-4 text-center">
              <p className="text-red-600 font-bold">No content extracted</p>
              <p className="text-xs text-red-500 mt-1">
                {asset.type === 'pdf' ? 'PDF extraction may have failed. Try re-uploading the file.' : 
                 asset.type === 'link' ? 'Website content could not be scraped.' :
                 'Content is still being processed.'}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-100 border-t-2 border-black flex justify-end">
          <button
            onClick={onClose}
            className="bg-neo-cyan border-2 border-black px-4 py-2 font-bold text-sm hover:translate-y-[1px] hover:shadow-none transition-all shadow-neo-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourcePreviewModal;
export { getParseStatus, getStatusColor, getStatusLabel };
export type { ParseStatus };
