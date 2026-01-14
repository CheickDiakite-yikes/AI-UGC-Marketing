
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  processingStatus?: string;
  hasAssets: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing, processingStatus, hasAssets }) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsOpen(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isProcessing, processingStatus, isOpen]);

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

  const SMART_CHIPS = [
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
      label: "🚀 Product Launch", 
      prompt: "Propose a '3-Phase Launch Pack': 1. Teaser (Image), 2. Big Reveal (Video), 3. Features Highlight (Carousel). Ground this in the USPs found in my uploaded assets.",
      color: "bg-neo-yellow"
    },
    { 
      label: "🎯 Persona Map", 
      prompt: "Identify the top 3 high-value target personas from my source documents. For each, draft a specific messaging hook and a 'Persona-Deep Pack' concept.",
      color: "bg-neo-cyan"
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
      
      <div className="bg-white/60 border-b border-white/20 p-4 flex items-center justify-between backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neo-pink to-neo-cyan flex items-center justify-center border-2 border-white shadow-sm">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-900 leading-none">Marketing Agent</h3>
            <p className="text-[10px] text-gray-700 font-bold uppercase mt-1">Real-Time Search Enabled</p>
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
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
            <div 
              className={`max-w-[90%] p-3 md:p-4 rounded-2xl border shadow-sm backdrop-blur-sm text-sm md:text-base font-medium leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-neo-black text-white rounded-br-none border-black/20' 
                : 'bg-white/90 text-gray-900 rounded-bl-none border-white/60'
              }`}
            >
              {msg.role === 'user' ? (
                msg.text
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
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            
            {msg.groundingLinks && msg.groundingLinks.length > 0 && (
               <div className="mt-2 ml-1 max-w-[90%] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neo-cyan animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trend Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingLinks.map((link, idx) => (
                       <a 
                         key={idx} 
                         href={link.url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-[10px] bg-white border-2 border-black px-2 py-1 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all truncate max-w-[200px] font-bold"
                       >
                         ↗ {link.title}
                       </a>
                    ))}
                  </div>
               </div>
            )}
          </div>
        ))}
        
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
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none mask-fade-right">
           {SMART_CHIPS.map((chip, i) => (
             <button
               key={i}
               onClick={() => handleChipClick(chip.prompt)}
               className={`${chip.color} border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 animate-pop-in`}
               style={{ animationDelay: `${i * 100}ms` }}
             >
               {chip.label}
             </button>
           ))}
        </div>
      )}

      <div className="p-4 bg-white/60 border-t border-white/20 backdrop-blur-md flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scan trends or generate campaigns..."
            className="w-full bg-white/80 border-2 border-transparent focus:border-neo-pink rounded-xl py-4 pl-4 pr-14 text-base text-gray-800 placeholder-gray-500 outline-none transition-all shadow-inner"
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
