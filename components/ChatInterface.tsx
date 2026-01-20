
import React, { useState, useEffect, useRef } from 'react';
import { CanvasItem, ChatMessage, ProjectAsset, StoryboardRecord, VideoReferenceMode, VideoReferenceRole, VideoReferenceSelection } from '../types';
import ReactMarkdown from 'react-markdown';
import StoryboardReferenceKit from './StoryboardReferenceKit';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onDismissResearch?: (messageId: string) => void;
  onStoryboardAction?: (storyboardId: string, action: 'approve' | 'cancel') => void;
  onStoryboardEdit?: (storyboardId: string) => void;
  onUpdateStoryboardReferences?: (storyboardId: string, selections: VideoReferenceSelection[], mode: VideoReferenceMode) => void;
  onUploadStoryboardReference?: (file: File, role: VideoReferenceRole, options?: { applyAvatarIdentity?: boolean }) => Promise<string | null>;
  onUploadAvatar?: (files: File[]) => void;
  onCreateAvatar?: (prompt: string) => void;
  draftMessage?: { id: string; text: string } | null;
  isProcessing: boolean;
  processingStatus?: string;
  hasAssets: boolean;
  assets: ProjectAsset[];
  storyboards?: StoryboardRecord[];
  pendingItems?: CanvasItem[];
  hasAvatar: boolean;
  avatarBusy?: boolean;
  videoQualityMode: boolean;
  onToggleVideoQuality: () => void;
  ahaPackAvailable: boolean;
}

// Helper to format long URLs into readable short versions
const formatUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    // Get first meaningful path segment
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && pathParts[0].length < 30) {
      return `${hostname}/${pathParts[0]}...`;
    }
    return hostname;
  } catch {
    // Fallback for malformed URLs
    if (url.length > 40) {
      return url.slice(0, 35) + '...';
    }
    return url;
  }
};

type IdeaOption = {
  title: string;
  summary: string;
  raw: string;
  prompt: string;
};

const extractIdeaOptions = (text: string): { cleanedText: string; ideas: IdeaOption[] } => {
  const marker = /(?:^|\n)\s*IDEA OPTIONS\s*:?\s*\n/i;
  const match = text.match(marker);
  if (!match || match.index === undefined) {
    return { cleanedText: text, ideas: [] };
  }

  const cleanedText = text.slice(0, match.index).trimEnd();
  const ideaBlock = text.slice(match.index + match[0].length);
  const lines = ideaBlock.split('\n');
  const ideas: IdeaOption[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (ideas.length > 0) break;
      continue;
    }
    const lineMatch = trimmed.match(/^(\d+)[\).]\s*(.+)$/);
    if (!lineMatch) {
      if (ideas.length > 0) break;
      continue;
    }

    const content = lineMatch[2].trim();
    if (!content) continue;
    const parts = content.split(/\s+-\s+|\s+:\s+/);
    const title = parts[0]?.trim() || content;
    const summary = parts.slice(1).join(' - ').trim();
    ideas.push({
      title,
      summary,
      raw: content,
      prompt: `Run with this idea: ${content}. Build the campaign and generate assets.`
    });
    if (ideas.length >= 5) break;
  }

  return { cleanedText: cleanedText || text, ideas };
};

interface Chip {
  label: string;
  prompt: string;
  color: string;
  tour?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onDismissResearch,
  onStoryboardAction,
  onStoryboardEdit,
  onUpdateStoryboardReferences,
  onUploadStoryboardReference,
  onUploadAvatar,
  onCreateAvatar,
  draftMessage,
  isProcessing,
  processingStatus,
  hasAssets,
  assets,
  storyboards,
  pendingItems,
  hasAvatar,
  avatarBusy,
  videoQualityMode,
  onToggleVideoQuality,
  ahaPackAvailable
}) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showAvatarComposer, setShowAvatarComposer] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isReferencePinnedOpen, setIsReferencePinnedOpen] = useState(true);
  const storyboardById = new Map((storyboards || []).map(storyboard => [storyboard.id, storyboard]));
  const pendingGenerations = (pendingItems || []).filter(item => item.type === 'image' || item.type === 'video' || item.type === 'carousel');
  const hasPendingGenerations = pendingGenerations.length > 0;
  const pendingStoryboards = (storyboards || []).filter(storyboard => storyboard.status === 'pending' || storyboard.status === 'processing');
  const pinnedStoryboard = pendingStoryboards.length > 0 ? pendingStoryboards[pendingStoryboards.length - 1] : null;
  const pinnedReferenceCount = pinnedStoryboard?.payload?.referenceSelections?.length || 0;
  const pinnedLabel = pinnedStoryboard?.payload?.title || pinnedStoryboard?.payload?.prompt || 'Long video storyboard';

  useEffect(() => {
    if (!hasPendingGenerations) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasPendingGenerations]);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (!draftMessage?.text) return;
    if (!isOpen) {
      setIsOpen(true);
    }
    setInput(draftMessage.text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [draftMessage?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isProcessing, processingStatus, isOpen]);

  useEffect(() => {
    if (pinnedStoryboard?.id) {
      setIsReferencePinnedOpen(true);
    }
  }, [pinnedStoryboard?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  const handleChipClick = (prompt: string) => {
    if (isProcessing) return;
    onSendMessage(prompt);
  };

  const latestStoryboardMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].storyboardId) return messages[i].id;
    }
    return null;
  })();

  const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getEstimatedSeconds = (item: CanvasItem) => {
    if (item.type === 'image') return 35;
    if (item.type === 'carousel') {
      const count = typeof item.meta?.slideCount === 'number'
        ? item.meta.slideCount
        : (item.carouselUrls?.length || 2);
      return Math.max(1, count) * 18;
    }
    if (item.type === 'video') {
      if (item.meta?.isLongVideo) {
        const scenes = typeof item.meta?.sceneCount === 'number' ? item.meta.sceneCount : 3;
        return Math.max(1, scenes) * 90;
      }
      return 90;
    }
    return 60;
  };

  const getProgressPercent = (item: CanvasItem) => {
    const status = item.meta?.status || 'queued';
    const estimate = getEstimatedSeconds(item);
    const queuedAt = item.meta?.queuedAt;
    const elapsed = queuedAt ? Math.max(0, (now - queuedAt) / 1000) : 0;
    const base = estimate > 0 ? Math.min(elapsed / estimate, 0.95) : 0.15;
    const floor = status === 'processing' ? 0.35 : 0.15;
    const cap = status === 'processing' ? 0.95 : 0.3;
    const progress = Math.min(cap, Math.max(floor, base));
    return Math.round(progress * 100);
  };

  const getGenerationLabel = (item: CanvasItem) => {
    if (item.type === 'image') return 'Image';
    if (item.type === 'carousel') return 'Carousel';
    if (item.type === 'video' && item.meta?.isLongVideo) return 'Long Video';
    return 'Video';
  };

  const handleAvatarUploadClick = () => {
    if (!onUploadAvatar || avatarBusy || isProcessing) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onUploadAvatar) {
      onUploadAvatar?.(files);
    }
    e.target.value = '';
  };

  const handleAvatarCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (avatarBusy || isProcessing) return;
    const trimmed = avatarPrompt.trim();
    if (!trimmed) return;
    onCreateAvatar?.(trimmed);
    setAvatarPrompt('');
    setShowAvatarComposer(false);
  };

  useEffect(() => {
    if (hasAvatar && showAvatarComposer) {
      setShowAvatarComposer(false);
    }
  }, [hasAvatar, showAvatarComposer]);

  const baseChips: Chip[] = [
    {
      label: "🔥 Trend Hijack",
      prompt: "Perform a 'Trend Discovery' search for my niche. For each trend found, map it to 3 specific target personas and propose platform-specific angles (TikTok vs IG vs FB). Include Viral Potential scores.",
      color: "bg-neo-lime"
    },
    {
      label: "🎥 UGC Viral Pack",
      prompt: "Generate a 'UGC Creator Pack' (scripts + visual hooks) for 5 high-energy TikToks/Reels. Ensure the tone is raw, mobile-native, and uses current social hooks.",
      color: "bg-neo-pink"
    },
    {
      label: "⚡ Conversion Engine",
      prompt: "Generate a 'Conversion Engine Pack' with 2 direct-response videos, 2 static ads, and 1 offer carousel. Focus on urgency, proof, and a clear CTA.",
      color: "bg-neo-cyan"
    },
    {
      label: "🧠 Proof & Trust",
      prompt: "Generate a 'Proof & Trust Pack' with 1 testimonial-style video, 1 before/after image, and 1 carousel that highlights proof points. Keep it credible and grounded.",
      color: "bg-white"
    },
    {
      label: "🧪 Offer Test",
      prompt: "Generate an 'Offer Test Pack' with 3 variations of the same offer. Include 2 videos and 1 image, each with a distinct hook angle.",
      color: "bg-neo-yellow"
    },
    {
      label: "🚀 Product Launch",
      prompt: "Propose a '3-Phase Launch Pack': 1. Teaser (Image), 2. Big Reveal (Video), 3. Features Highlight (Carousel). Ground this in the USPs found in my uploaded assets.",
      color: "bg-neo-yellow",
      tour: "product-launch-chip"
    },
    {
      label: "📅 Seasonal Blitz",
      prompt: "Identify the next major holiday or industry event. Generate a 'Seasonal Pack' with 5 assets that creatively bridge my product benefits to that specific occasion.",
      color: "bg-white"
    },
    {
      label: "♻️ Asset Remix",
      prompt: "Analyze my uploaded assets and propose a 'Multi-Channel Remix Pack'. 1 aesthetic IG post, 1 direct-response FB ad, and 1 lo-fi TikTok concept based on one core USP.",
      color: "bg-neo-yellow"
    }
  ];

  const ahaChip: Chip = {
    label: "✨ Aha Pack (Free)",
    prompt: "Generate an 'Aha Pack' as a generate_campaign_pack with exactly 3 items: 1 image post, 1 carousel with 2 slides, and 1 HQ video. Use qualityMode: true for the video and keep the pack outcome-driven.",
    color: "bg-neo-pink"
  };

  const SMART_CHIPS: Chip[] = ahaPackAvailable ? [ahaChip, ...baseChips] : baseChips;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 md:w-16 md:h-16 rounded-full bg-neo-black text-white border-2 border-white shadow-neo-lg flex items-center justify-center hover:scale-110 transition-transform animate-bounce-in"
      >
        <span className="text-2xl md:text-3xl">✨</span>
        {isProcessing && (
           <span className="absolute top-0 right-0 w-4 h-4 bg-neo-pink rounded-full border-2 border-black animate-pulse"></span>
        )}
      </button>
    );
  }

  return (
    <div className={`
      fixed z-30 flex flex-col bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl transition-all duration-300
      inset-x-0 top-16 bottom-0
      md:z-50 md:inset-auto md:top-auto md:bottom-6 md:right-6 md:w-96 md:h-[650px] md:rounded-2xl md:border-2 md:border-white/50
    `}>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAvatarFiles}
      />
      
      <div className="bg-white/60 border-b border-white/20 p-4 flex items-center justify-between backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neo-pink to-neo-cyan flex items-center justify-center border-2 border-white shadow-sm">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-900 leading-none">Marketing Agent</h3>
            <p className="text-[10px] text-gray-700 font-bold uppercase mt-1">Real-Time Search Enabled</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-600">Quality Mode</span>
              <button
                type="button"
                onClick={onToggleVideoQuality}
                aria-pressed={videoQualityMode}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border-2 transition-all ${
                  videoQualityMode
                    ? 'bg-neo-black text-white border-black'
                    : 'bg-white/70 text-gray-700 border-black/30'
                }`}
              >
                {videoQualityMode ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-black/10 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-black/20 bg-white/20">
        {hasPendingGenerations && (
          <div className="border-2 border-black bg-white/90 p-3 rounded-xl shadow-neo-sm animate-fade-in-up">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Generation Queue</span>
              <span className="text-[10px] font-bold text-gray-600">{pendingGenerations.length} active</span>
            </div>
            <div className="mt-2 space-y-3">
              {pendingGenerations.map((item) => {
                const status = item.meta?.status === 'processing' ? 'Rendering' : 'Queued';
                const progress = getProgressPercent(item);
                const estimate = getEstimatedSeconds(item);
                const queuedAt = item.meta?.queuedAt;
                const elapsedSeconds = queuedAt ? Math.max(0, Math.round((now - queuedAt) / 1000)) : null;
                const remainingSeconds = elapsedSeconds !== null ? Math.max(0, Math.round(estimate - elapsedSeconds)) : null;
                const etaLabel = remainingSeconds !== null
                  ? `ETA ~${formatDuration(remainingSeconds)}`
                  : `ETA ~${formatDuration(estimate)}`;
                const elapsedLabel = elapsedSeconds !== null ? `Elapsed ${formatDuration(elapsedSeconds)}` : '';
                const sceneLabel = item.meta?.sceneCount ? `${item.meta.sceneCount} scenes` : '';
                return (
                  <div key={`pending-${item.id}`} className="border border-black/20 rounded-lg p-2 bg-white/80">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      <span>{getGenerationLabel(item)}</span>
                      <span>{status}</span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-gray-800 truncate">
                      {item.title || 'Generation in progress'}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-gray-500">
                      <span>{etaLabel}</span>
                      <span>{sceneLabel || elapsedLabel}</span>
                    </div>
                    <div className="mt-1 h-2 w-full border border-black/40 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${status === 'Rendering' ? 'bg-neo-cyan' : 'bg-gray-400'} transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const storyboard = msg.storyboardId ? storyboardById.get(msg.storyboardId) : null;
          const ideaPayload = msg.role === 'model' ? extractIdeaOptions(msg.text) : { cleanedText: msg.text, ideas: [] };
          const displayText = msg.role === 'model' ? ideaPayload.cleanedText : msg.text;
          const ideaOptions = ideaPayload.ideas;
          return (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
            <div 
              className={`max-w-[90%] p-3 md:p-4 rounded-2xl border shadow-sm backdrop-blur-sm text-sm md:text-base font-medium leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-neo-black text-white rounded-br-none border-black/20' 
                : 'bg-white/90 text-gray-900 rounded-bl-none border-white/60'
              }`}
            >
              {msg.role === 'user' ? (
                displayText
              ) : (
                <div className="markdown-content overflow-hidden break-words">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="font-display font-bold text-lg md:text-xl mb-2 mt-3 border-b-2 border-neo-pink inline-block" {...props} />,
                      h2: ({node, ...props}) => <h2 className="font-display font-bold text-base md:text-lg mb-2 mt-3 text-neo-black" {...props} />,
                      h3: ({node, ...props}) => <h3 className="font-display font-bold text-sm mb-1 mt-2 text-gray-700 uppercase tracking-wide" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2 pl-2" {...props} />,
                      li: ({node, ...props}) => <li className="pl-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold bg-neo-yellow/30 px-1 rounded-sm text-black border-b border-neo-yellow" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-neo-cyan pl-3 my-2 italic text-gray-600 bg-white/50 py-2 rounded-r" {...props} />,
                      code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-neo-pink font-bold break-all" {...props} />,
                      a: ({node, ...props}) => <a className="text-neo-pink underline break-all hover:text-neo-cyan transition-colors" {...props} />,
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full border-2 border-black divide-y divide-black" {...props} /></div>,
                      th: ({node, ...props}) => <th className="bg-gray-100 p-2 text-left font-bold text-xs border-r border-black" {...props} />,
                      td: ({node, ...props}) => <td className="p-2 text-xs border-r border-black" {...props} />
                    }}
                  >
                    {displayText}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            
            {msg.groundingLinks && msg.groundingLinks.length > 0 && (
               <div className="mt-2 ml-1 max-w-[90%] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neo-cyan animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingLinks.map((link, idx) => (
                       <a 
                         key={idx} 
                         href={link.url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         title={link.url}
                         className="text-[10px] bg-white border-2 border-black px-2 py-1 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold inline-flex items-center gap-1"
                       >
                         <span className="text-neo-cyan">↗</span>
                         <span className="max-w-[150px] truncate">{link.title || formatUrl(link.url)}</span>
                       </a>
                    ))}
                  </div>
               </div>
            )}

            {ideaOptions.length > 0 && !msg.researchDismissed && (
              <div className="mt-3 ml-1 max-w-[90%] flex flex-col gap-2 animate-fade-in-up">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Idea Options</span>
                <div className="grid gap-2">
                  {ideaOptions.map((idea, idx) => (
                    <button
                      key={`${msg.id}-idea-${idx}`}
                      onClick={() => {
                        console.log('[RESEARCH] Idea selected', { messageId: msg.id, idea: idea.raw });
                        onSendMessage(idea.prompt);
                      }}
                      disabled={isProcessing}
                      className="text-left text-xs bg-white border-2 border-black px-3 py-2 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold disabled:opacity-50"
                    >
                      <div className="text-[11px] font-black text-gray-900">
                        {idea.title || `Idea ${idx + 1}`}
                      </div>
                      {idea.summary && (
                        <div className="text-[10px] font-medium text-gray-600 mt-1">
                          {idea.summary}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Response buttons for research results */}
            {msg.role === 'model' && (msg.isResearchResult || (msg.groundingLinks && msg.groundingLinks.length > 0)) && !msg.researchDismissed && (
              <div className="mt-3 ml-1 max-w-[90%] flex flex-col gap-2 animate-fade-in-up">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quick Actions</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onSendMessage("Generate the campaign now based on this research")}
                    disabled={isProcessing}
                    className="text-xs bg-neo-lime border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>🚀</span> Generate Now
                  </button>
                  <button
                    onClick={() => onSendMessage("Expand this research further with more details and examples")}
                    disabled={isProcessing}
                    className="text-xs bg-neo-cyan border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>🔍</span> Expand Research
                  </button>
                  <button
                    onClick={() => onDismissResearch?.(msg.id)}
                    disabled={isProcessing}
                    className="text-xs bg-white border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold text-gray-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>✕</span> Dismiss
                  </button>
                </div>
              </div>
            )}

            {msg.storyboardId && (
              <div className="mt-3 ml-1 max-w-[90%] flex flex-col gap-2 animate-fade-in-up">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Storyboard</span>
                {msg.storyboardStatus && msg.storyboardStatus !== 'pending' ? (
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    msg.storyboardStatus === 'approved' ? 'text-neo-lime' :
                    msg.storyboardStatus === 'cancelled' ? 'text-gray-500' : 'text-gray-600'
                  }`}>
                    {msg.storyboardStatus === 'approved' ? 'Approved' :
                      msg.storyboardStatus === 'cancelled' ? 'Cancelled' : 'Processing'}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onStoryboardEdit?.(msg.storyboardId as string)}
                      disabled={isProcessing || msg.storyboardStatus === 'processing'}
                      className="text-xs bg-white border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold text-gray-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>✏️</span> Edit
                    </button>
                    <button
                      onClick={() => onStoryboardAction?.(msg.storyboardId as string, 'approve')}
                      disabled={isProcessing || msg.storyboardStatus === 'processing'}
                      className="text-xs bg-neo-lime border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>✅</span> Approve
                    </button>
                    <button
                      onClick={() => onStoryboardAction?.(msg.storyboardId as string, 'cancel')}
                      disabled={isProcessing || msg.storyboardStatus === 'processing'}
                      className="text-xs bg-white border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold text-gray-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>✕</span> Cancel
                    </button>
                  </div>
                )}
                {!hasAvatar && (!msg.storyboardStatus || msg.storyboardStatus === 'pending') && (
                  <div className="border-2 border-black bg-white/80 rounded-xl p-3 shadow-neo-sm">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Character Consistency</div>
                    <p className="mt-1 text-xs font-bold text-gray-700">
                      If this long video features a person, add an avatar or drop a face reference below to lock the character across scenes.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAvatarUploadClick}
                        disabled={avatarBusy || isProcessing || !onUploadAvatar}
                        className="text-xs bg-neo-cyan border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold disabled:opacity-50 flex items-center gap-1"
                      >
                        <span>📷</span> Upload Avatar
                      </button>
                      {onCreateAvatar && (
                        <button
                          type="button"
                          onClick={() => setShowAvatarComposer(prev => !prev)}
                          disabled={avatarBusy || isProcessing}
                          className="text-xs bg-neo-pink border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          <span>✨</span> Create AI Avatar
                        </button>
                      )}
                    </div>
                    {showAvatarComposer && onCreateAvatar && (
                      <form onSubmit={handleAvatarCreateSubmit} className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={avatarPrompt}
                          onChange={(e) => setAvatarPrompt(e.target.value)}
                          placeholder="Describe the person (age, vibe, style)..."
                          className="flex-1 bg-white border-2 border-black px-2 py-1.5 text-xs font-bold"
                          disabled={avatarBusy || isProcessing}
                        />
                        <button
                          type="submit"
                          disabled={avatarBusy || isProcessing || !avatarPrompt.trim()}
                          className="text-xs bg-neo-black text-white border-2 border-black px-3 py-1.5 font-bold disabled:opacity-50"
                        >
                          Generate
                        </button>
                      </form>
                    )}
                  </div>
                )}
                {storyboard && onUpdateStoryboardReferences && (!msg.storyboardStatus || msg.storyboardStatus === 'pending') && (
                  <div className="mt-3">
                    <StoryboardReferenceKit
                      storyboardId={storyboard.id}
                      assets={assets}
                      referenceSelections={storyboard.payload.referenceSelections}
                      referenceMode={storyboard.payload.referenceMode}
                      disabled={isProcessing || msg.storyboardStatus === 'processing'}
                      onChange={onUpdateStoryboardReferences}
                      onUploadReference={onUploadStoryboardReference}
                    />
                  </div>
                )}
              </div>
            )}

            {msg.jobType === 'generate_long_video' && msg.jobStatus && (msg.jobStatus === 'queued' || msg.jobStatus === 'processing') && (
              <div className="mt-2 ml-1 max-w-[90%] flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 animate-fade-in-up">
                <span className="w-2 h-2 bg-neo-cyan rounded-full animate-pulse"></span>
                <span>Long Video Rendering</span>
                {msg.jobMeta?.sceneCount && (
                  <span className="bg-white border border-black px-1 py-0.5 text-[9px] font-bold text-gray-600 rounded">
                    {msg.jobMeta.sceneCount} scenes{msg.jobMeta.totalDurationSeconds ? ` · ${msg.jobMeta.totalDurationSeconds}s` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        );
        })}
        
        {isProcessing && (
          <div className="flex justify-start animate-fade-in-up">
             <div className="bg-white/80 p-4 rounded-2xl rounded-bl-none flex flex-col gap-2 border border-white/60 min-w-[140px] shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-neo-pink rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-neo-lime rounded-full animate-bounce delay-100"></div>
                  <div className="w-2.5 h-2.5 bg-neo-cyan rounded-full animate-bounce delay-200"></div>
                </div>
                {processingStatus && (
                  <span className="text-xs font-bold text-gray-500 animate-pulse">{processingStatus}</span>
                )}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isProcessing && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none mask-fade-right" data-tour="chat-chips">
           {SMART_CHIPS.map((chip, i) => (
             <button
               key={i}
               onClick={() => handleChipClick(chip.prompt)}
               data-tour={chip.tour}
               className={`${chip.color} border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 animate-pop-in`}
               style={{ animationDelay: `${i * 100}ms` }}
             >
               {chip.label}
             </button>
           ))}
        </div>
      )}

      {pinnedStoryboard && onUpdateStoryboardReferences && (
        <div className="px-4 pb-3">
          <div className="border-2 border-black bg-white/90 rounded-xl shadow-neo-sm">
            <button
              type="button"
              onClick={() => setIsReferencePinnedOpen(prev => !prev)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pinned Reference Kit</div>
                <div className="text-xs font-bold text-gray-700 truncate">{pinnedLabel}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {pinnedReferenceCount} refs
                </span>
                <span className="text-xs font-black">{isReferencePinnedOpen ? '-' : '+'}</span>
              </div>
            </button>
            {isReferencePinnedOpen && (
              <div className="px-3 pb-3">
                <StoryboardReferenceKit
                  storyboardId={pinnedStoryboard.id}
                  assets={assets}
                  referenceSelections={pinnedStoryboard.payload.referenceSelections}
                  referenceMode={pinnedStoryboard.payload.referenceMode}
                  disabled={isProcessing || pinnedStoryboard.status === 'processing'}
                  onChange={onUpdateStoryboardReferences}
                  onUploadReference={onUploadStoryboardReference}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 bg-white/60 border-t border-white/20 backdrop-blur-md flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <button
            type="button"
            onClick={handleAvatarUploadClick}
            disabled={avatarBusy || isProcessing || !onUploadAvatar}
            title="Upload avatar"
            className="absolute left-2 top-2 bottom-2 aspect-square bg-white/80 border-2 border-black rounded-lg hover:bg-neo-cyan transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <span className="text-base">👤</span>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scan trends or generate campaigns..."
            ref={inputRef}
            data-tour="chat-input"
            className="w-full bg-white/80 border-2 border-transparent focus:border-neo-pink rounded-xl py-4 pl-12 pr-14 text-base text-gray-800 placeholder-gray-500 outline-none transition-all shadow-inner"
          />
          <button 
            type="submit"
            disabled={isProcessing}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-neo-black text-white rounded-lg hover:bg-neo-pink hover:text-black transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
