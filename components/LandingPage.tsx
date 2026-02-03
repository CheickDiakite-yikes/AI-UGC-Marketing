import React, { useEffect, useRef, useState, ReactNode } from 'react';
import ShowcaseMarquee from './ShowcaseMarquee';

interface Props {
  onLogin: () => void;
  onSignup: () => void;
  onNavigatePrivacy: () => void;
  onNavigateTerms: () => void;
  onNavigateAbout: () => void;
  onNavigateHowItWorks: () => void;
  onNavigateShowcase: () => void;
}

function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}

function useOnScreen(ref: React.RefObject<HTMLElement>, rootMargin = "0px") {
  const [isIntersecting, setIntersecting] = useState(false);
  
  useEffect(() => {
    // Check if element is already in view on mount
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const isAlreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (isAlreadyVisible) {
        setIntersecting(true);
        return;
      }
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
           setIntersecting(true);
           observer.disconnect(); 
        }
      },
      { rootMargin, threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return isIntersecting;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const hasMounted = useHasMounted();
  useEffect(() => {
    if (!hasMounted) return;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.min(1, Math.max(0, scrollProgress)));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMounted]);
  return progress;
}

function useElementScrollProgress(ref: React.RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0.5);
  const hasMounted = useHasMounted();
  useEffect(() => {
    if (!hasMounted) return;
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const start = windowHeight;
      const end = -elementHeight;
      const current = start - elementTop;
      const total = start - end;
      const prog = Math.min(1, Math.max(0, current / total));
      setProgress(prog);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ref, hasMounted]);
  return progress;
}

const Reveal = ({ children, delay = 0, className = "" }: { children?: ReactNode, delay?: number, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, "-50px");
  const hasMounted = useHasMounted();

  return (
    <div 
      ref={ref}
      className={`transition-all duration-1000 ease-out ${className} ${!hasMounted || isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const AssembleOnScroll = ({ children, className = "" }: { children: ReactNode[], className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useElementScrollProgress(ref);
  
  return (
    <div ref={ref} className={`relative ${className}`}>
      {React.Children.map(children, (child, index) => {
        const childProgress = Math.min(1, Math.max(0, (progress - index * 0.1) * 2));
        const translateY = (1 - childProgress) * 50;
        const opacity = childProgress;
        const rotate = (1 - childProgress) * (index % 2 === 0 ? -5 : 5);
        
        return (
          <div
            style={{
              transform: `translateY(${translateY}px) rotate(${rotate}deg)`,
              opacity,
              transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

const StoryBlock = ({ 
  step, 
  title, 
  description, 
  visual, 
  accentClass = "bg-neo-pink" 
}: { 
  step: number, 
  title: string, 
  description: string, 
  visual: ReactNode,
  accentClass?: string 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, "-100px");
  const hasMounted = useHasMounted();
  const isActive = !hasMounted || isVisible;
  
  return (
    <div 
      ref={ref}
      className="py-16 md:py-24"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
        <div className={`flex flex-col ${step % 2 === 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center`}>
          <div className="md:w-1/2">
            <div 
              className={`inline-block ${accentClass} border-4 border-black px-4 py-2 font-display font-black text-2xl md:text-4xl mb-4 shadow-neo transition-all duration-700`}
              style={{ 
                transform: isActive ? 'rotate(-2deg) scale(1) translateY(0)' : 'rotate(-8deg) scale(0.8) translateY(30px)',
                opacity: isActive ? 1 : 0
              }}
            >
              STEP {step}
            </div>
            <h3 
              className="font-display font-black text-3xl md:text-5xl mb-4 text-neo-black transition-all duration-700 delay-100"
              style={{
                transform: isActive ? 'translateX(0) translateY(0)' : 'translateX(-30px) translateY(20px)',
                opacity: isActive ? 1 : 0
              }}
            >
              {title}
            </h3>
            <p 
              className="text-lg md:text-xl font-medium text-gray-700 leading-relaxed transition-all duration-700 delay-200"
              style={{
                transform: isActive ? 'translateX(0) translateY(0)' : 'translateX(-20px) translateY(20px)',
                opacity: isActive ? 1 : 0
              }}
            >
              {description}
            </p>
          </div>
          <div 
            className="md:w-1/2 transition-all duration-700 delay-300"
            style={{
              transform: isActive ? 'scale(1) rotate(0deg) translateY(0)' : `scale(0.85) rotate(${step % 2 === 0 ? 5 : -5}deg) translateY(40px)`,
              opacity: isActive ? 1 : 0
            }}
          >
            {visual}
          </div>
        </div>
      </div>
    </div>
  );
};

const FloatingElement = ({ 
  children, 
  className = "",
  offsetX = 0,
  offsetY = 0,
  rotateRange = 5
}: { 
  children: ReactNode, 
  className?: string,
  offsetX?: number,
  offsetY?: number,
  rotateRange?: number
}) => {
  const scrollProgress = useScrollProgress();
  const translateX = Math.sin(scrollProgress * Math.PI * 2) * offsetX;
  const translateY = Math.cos(scrollProgress * Math.PI * 2) * offsetY;
  const rotate = Math.sin(scrollProgress * Math.PI * 4) * rotateRange;
  
  return (
    <div 
      className={className}
      style={{
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
        transition: 'transform 0.1s ease-out'
      }}
    >
      {children}
    </div>
  );
};

const LandingPage: React.FC<Props> = ({
  onLogin,
  onSignup,
  onNavigatePrivacy,
  onNavigateTerms,
  onNavigateAbout,
  onNavigateHowItWorks,
  onNavigateShowcase
}) => {
  const scrollProgress = useScrollProgress();
  
  return (
    <div className="w-full h-screen overflow-y-auto overflow-x-hidden bg-white custom-scrollbar relative selection:bg-neo-pink selection:text-black font-sans text-neo-black">
      
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime z-[100]"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div 
          className="absolute -top-20 -left-20 w-64 h-64 md:w-96 md:h-96 bg-neo-pink rounded-full blur-3xl"
          style={{ transform: `translate(${scrollProgress * 100}px, ${scrollProgress * 50}px)` }}
        />
        <div 
          className="absolute top-1/3 -right-20 w-72 h-72 md:w-[500px] md:h-[500px] bg-neo-cyan rounded-full blur-3xl"
          style={{ transform: `translate(${-scrollProgress * 80}px, ${scrollProgress * 30}px)` }}
        />
        <div 
          className="absolute bottom-0 left-1/3 w-64 h-64 md:w-80 md:h-80 bg-neo-yellow rounded-full blur-3xl"
          style={{ transform: `translate(${scrollProgress * 60}px, ${-scrollProgress * 40}px)` }}
        />
      </div>

      <nav className="sticky top-0 z-50 flex items-center justify-between p-4 md:p-6 md:px-12 max-w-7xl mx-auto bg-white/80 backdrop-blur-md border-b-2 border-transparent" style={{ borderColor: scrollProgress > 0.05 ? 'black' : 'transparent' }}>
        <div className="flex items-center gap-2 group cursor-pointer">
           <img 
             src="/predi-cloud-logo.png" 
             alt="Predi" 
             className="w-10 h-10 md:w-12 md:h-12 object-contain group-hover:scale-110 transition-transform duration-300"
           />
           <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-neo-black">Predi</h1>
        </div>
        <div className="flex gap-4">
          <button onClick={onLogin} className="hidden md:block font-bold hover:underline decoration-neo-pink underline-offset-4 decoration-2 text-neo-black">Log In</button>
          <button 
            onClick={onLogin}
            className="bg-neo-black text-white px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base font-bold border-2 border-transparent shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all hover:bg-neo-pink hover:text-black"
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="relative z-10 pt-10 md:pt-16 pb-16 md:pb-24 px-6 sm:px-8 md:px-16 lg:px-24 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        <Reveal delay={100}>
          <div className="inline-block bg-neo-lime border-2 border-black px-4 py-1.5 md:px-6 md:py-2 font-bold text-xs md:text-sm uppercase tracking-widest mb-6 md:mb-8 shadow-neo hover:rotate-2 transition-transform cursor-default animate-wiggle-slow">
             ⚡ BETA Now with Gemini 3 Pro
          </div>
        </Reveal>

        <Reveal delay={200}>
          <h1 className="font-display font-black text-[clamp(1.4rem,6.5vw,8rem)] leading-[1] mb-6 md:mb-8 text-neo-black drop-shadow-sm w-full px-2">
            <span className="inline-block animate-float-gentle">MARKETING</span> <br/>
            <span className="relative inline-block mt-1 md:mt-2 whitespace-nowrap">
               <span className="absolute inset-0 translate-x-[2px] translate-y-[2px] sm:translate-x-[3px] sm:translate-y-[3px] md:translate-x-[6px] md:translate-y-[6px] text-black opacity-100 select-none whitespace-nowrap" aria-hidden="true">ON AUTOPILOT.</span>
               <span 
                 className="relative z-10 text-transparent bg-clip-text animate-shimmer whitespace-nowrap" 
                 style={{ 
                   WebkitTextStroke: '1px black',
                   backgroundImage: 'linear-gradient(90deg, #FF90E8, #80F0F0, #FF90E8, #80F0F0)',
                   backgroundSize: '200% auto'
                 }}
               >ON AUTOPILOT.</span>
            </span>
          </h1>
        </Reveal>

        <Reveal delay={400}>
          <p className="font-sans text-lg md:text-2xl max-w-2xl mx-auto mb-6 leading-relaxed text-gray-900 font-medium px-2">
            The AI-native OS that turns your brand assets and decks into high-converting UGC, viral Reels, and performance ads for TikTok, Instagram, and beyond in seconds.
          </p>
        </Reveal>

        <Reveal delay={500}>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-neo-lime/30 via-neo-cyan/20 to-neo-lime/30 px-5 py-3 rounded-full border-2 border-neo-black/10 mb-8 md:mb-10 animate-pulse-soft backdrop-blur-sm">
            <span className="inline-block w-2 h-2 bg-neo-lime rounded-full animate-ping-slow"></span>
            <p className="font-sans text-base md:text-lg text-gray-700">
              <span className="font-bold text-neo-black">All you need is a link and a logo.</span>{' '}
              Predi does the rest in seconds.
            </p>
          </div>
        </Reveal>

        <Reveal delay={600}>
          <div className="flex flex-col md:flex-row gap-6 items-center w-full justify-center">
             <button 
               onClick={onLogin}
               className="bg-neo-pink text-black border-4 border-black px-8 py-4 md:px-10 md:py-5 text-lg md:text-xl font-bold shadow-neo-lg hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] hover:bg-neo-cyan transition-all w-full md:w-auto transform hover:-rotate-1 animate-glow-pulse"
             >
               Start Creating for Free
             </button>
             <div className="flex flex-col items-center md:items-start">
                <div className="flex -space-x-2 mb-1">
                   {[
                     { bg: 'bg-neo-pink', text: 'JD' },
                     { bg: 'bg-neo-cyan', text: 'AS' },
                     { bg: 'bg-neo-lime', text: 'MK' },
                     { bg: 'bg-neo-yellow', text: 'ER' }
                   ].map((user, i) => (
                     <div 
                       key={i} 
                       className={`w-8 h-8 rounded-full border-2 border-white ${user.bg} flex items-center justify-center text-[10px] font-bold animate-bounce-soft`}
                       style={{ animationDelay: `${i * 0.2}s` }}
                     >
                       {user.text}
                     </div>
                   ))}
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Join 3,500+ Marketers</p>
             </div>
          </div>
        </Reveal>

        <Reveal delay={800} className="w-full flex justify-center px-0 md:px-4">
          <div className="mt-12 md:mt-20 w-full max-w-6xl bg-neo-black p-1 md:p-2 rounded-xl transform rotate-1 hover:rotate-0 transition-transform duration-700 ease-out shadow-2xl relative">
             <FloatingElement className="absolute -top-6 -left-6 z-30 hidden md:block" offsetX={15} offsetY={10} rotateRange={8}>
               <div className="bg-neo-lime border-4 border-black p-3 shadow-neo font-display font-bold text-lg">
                 UPLOAD 📁
               </div>
             </FloatingElement>
             <FloatingElement className="absolute -top-4 -right-8 z-30 hidden md:block" offsetX={-20} offsetY={12} rotateRange={-6}>
               <div className="bg-neo-pink border-4 border-black p-3 shadow-neo font-display font-bold text-lg">
                 GENERATE ✨
               </div>
             </FloatingElement>
             <FloatingElement className="absolute -bottom-6 left-1/4 z-30 hidden md:block" offsetX={10} offsetY={-15} rotateRange={5}>
               <div className="bg-neo-cyan border-4 border-black p-3 shadow-neo font-display font-bold text-lg">
                 PUBLISH 🚀
               </div>
             </FloatingElement>
             
             <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-800 relative group aspect-video flex flex-col">
                <div className="w-full h-6 md:h-8 bg-gray-200 border-b-2 border-gray-300 flex items-center px-3 gap-2 z-10 shrink-0">
                   <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-400 border border-black/20"></div>
                   <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400 border border-black/20"></div>
                   <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-400 border border-black/20"></div>
                </div>
                
                <div className="flex-1 flex overflow-hidden bg-white">
                    <div className="hidden sm:flex w-1/4 border-r border-gray-200 bg-gray-50 p-3 flex-col gap-3">
                       <div className="h-4 w-1/2 bg-gray-300 rounded mb-2"></div>
                       <div className="h-8 w-full bg-neo-pink/20 border border-neo-pink rounded-md"></div>
                       <div className="h-8 w-full bg-white border border-gray-200 rounded-md"></div>
                       <div className="h-8 w-full bg-white border border-gray-200 rounded-md"></div>
                    </div>
                    <div className="flex-1 p-4 md:p-6 overflow-hidden relative">
                       <div className="flex justify-between items-center mb-6">
                          <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
                          <div className="h-8 w-24 bg-neo-black rounded"></div>
                       </div>
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="aspect-square bg-gray-100 border-2 border-gray-200 rounded-lg p-2 relative overflow-hidden group/card">
                             <div className="absolute inset-0 bg-neo-yellow/20 flex items-center justify-center text-4xl">👟</div>
                             <div className="absolute bottom-2 left-2 right-2 h-2 bg-gray-300 rounded"></div>
                          </div>
                          <div className="aspect-square bg-gray-100 border-2 border-gray-200 rounded-lg p-2 relative overflow-hidden">
                             <div className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center text-4xl">🧴</div>
                             <div className="absolute bottom-2 left-2 right-2 h-2 bg-gray-300 rounded"></div>
                          </div>
                          <div className="hidden lg:block aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-2 relative">
                             <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-4xl">+</div>
                          </div>
                       </div>
                       
                       <div className="absolute bottom-6 right-6 bg-neo-lime border-2 border-black p-2 md:p-3 shadow-neo-sm transform -rotate-3 z-20 hidden md:block">
                           <div className="text-[10px] md:text-xs font-bold text-black">VIDEO GENERATED ✅</div>
                       </div>
                    </div>
                </div>

                <div className="absolute top-1/4 -right-5 bg-white border-4 border-black p-4 shadow-neo-lg transform rotate-6 animate-wiggle z-20 hidden lg:block">
                   <div className="font-display font-bold text-2xl">VIRAL! 🚀</div>
                </div>
             </div>
          </div>
        </Reveal>
        
        <div className="mt-16 md:mt-24 flex flex-col items-center animate-bounce">
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Scroll to explore</p>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      <ShowcaseMarquee />

      <div className="bg-neo-black py-4 md:py-6 overflow-hidden border-y-4 border-black rotate-1 scale-105 mb-0 relative z-20 shadow-neo-lg">
         <div className="animate-marquee whitespace-nowrap flex gap-8 md:gap-12">
            {[...Array(10)].map((_, i) => (
               <div key={i} className="flex items-center gap-4">
                  <span className="text-neo-yellow font-display font-black text-2xl md:text-4xl tracking-tighter">
                    GENERATE CAMPAIGNS
                  </span>
                  <span className="text-neo-pink text-2xl md:text-4xl">★</span>
                  <span className="text-white font-display font-black text-2xl md:text-4xl tracking-tighter stroke-black" style={{ WebkitTextStroke: '1px black' }}>
                    DOMINATE SOCIAL
                  </span>
                  <span className="text-neo-cyan text-2xl md:text-4xl">★</span>
               </div>
            ))}
         </div>
      </div>

      <section className="relative z-10 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16 md:py-24">
            <Reveal>
              <div className="inline-block bg-neo-black text-white px-6 py-2 font-bold text-sm uppercase tracking-widest mb-6 transform -rotate-1">
                How It Works
              </div>
              <h2 className="font-display font-black text-4xl md:text-6xl text-neo-black mb-4">
                THREE STEPS TO <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neo-pink to-neo-cyan">MARKETING MAGIC</span>
              </h2>
            </Reveal>
          </div>

          <StoryBlock
            step={1}
            title="ADD YOUR BRAND"
            description="Upload your logo and paste your website link. Our AI analyzes your site to extract your brand DNA instantly—colors, voice, audience, everything. Setup takes seconds."
            accentClass="bg-neo-pink"
            visual={
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo-lg">
                <div className="flex gap-4 mb-5">
                  <div className="w-20 h-20 bg-neo-pink/20 border-2 border-dashed border-black flex flex-col items-center justify-center">
                    <span className="text-2xl">📷</span>
                    <span className="text-[10px] font-bold mt-1">Logo</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-500 mb-1">Website URL</div>
                    <div className="h-10 bg-gray-100 border-2 border-black rounded flex items-center px-3">
                      <span className="text-sm text-gray-600">https://yourbrand.com</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-neo-pink border-2 border-black"></div>
                  <div className="w-8 h-8 rounded-full bg-neo-cyan border-2 border-black"></div>
                  <div className="w-8 h-8 rounded-full bg-neo-yellow border-2 border-black"></div>
                </div>
                <div className="bg-neo-lime/30 border-2 border-black p-3 font-bold text-sm">
                  Brand DNA: "Bold, Playful, Gen-Z Forward"
                </div>
              </div>
            }
          />

          <StoryBlock
            step={2}
            title="DESCRIBE YOUR VISION"
            description="Chat naturally with your AI CMO. Ask for 'a viral TikTok for my sneaker launch' or 'UGC-style content for Instagram.' It understands marketing."
            accentClass="bg-neo-cyan"
            visual={
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo-lg">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-neo-black rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                    <div className="bg-gray-100 border-2 border-black p-3 rounded-lg max-w-xs">
                      <p className="text-sm font-medium">What kind of content would you like to create today?</p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-neo-pink border-2 border-black p-3 rounded-lg max-w-xs">
                      <p className="text-sm font-bold">I need a viral UGC pack for my new skincare launch! 🧴✨</p>
                    </div>
                    <div className="w-8 h-8 bg-neo-yellow rounded-full flex items-center justify-center text-xs font-bold shrink-0">YOU</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-neo-black rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                    <div className="bg-neo-lime border-2 border-black p-3 rounded-lg">
                      <p className="text-sm font-bold">Generating 5 videos + 10 images... 🚀</p>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          <StoryBlock
            step={3}
            title="DOWNLOAD & DOMINATE"
            description="Get broadcast-ready images and videos in seconds. Every asset is on-brand, unique, and optimized for each platform. Just download and post."
            accentClass="bg-neo-lime"
            visual={
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo-lg">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="aspect-square bg-neo-pink/20 border-2 border-black rounded flex items-center justify-center text-2xl">📸</div>
                  <div className="aspect-square bg-neo-cyan/20 border-2 border-black rounded flex items-center justify-center text-2xl">🎬</div>
                  <div className="aspect-square bg-neo-yellow/20 border-2 border-black rounded flex items-center justify-center text-2xl">📸</div>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-gray-100 border-2 border-black p-2 text-center">
                    <span className="text-xs font-bold">TIKTOK</span>
                  </div>
                  <div className="flex-1 bg-gray-100 border-2 border-black p-2 text-center">
                    <span className="text-xs font-bold">REELS</span>
                  </div>
                  <div className="flex-1 bg-gray-100 border-2 border-black p-2 text-center">
                    <span className="text-xs font-bold">STORIES</span>
                  </div>
                </div>
                <button className="w-full bg-neo-black text-white border-2 border-black py-3 font-bold shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                  Download All ↓
                </button>
              </div>
            }
          />
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-20 px-6 md:px-12 max-w-7xl mx-auto">
         <div className="text-center mb-12 md:mb-16">
            <h2 className="font-display font-black text-3xl md:text-5xl mb-4 text-neo-black">POWERED BY GEMINI 3</h2>
            <p className="text-lg md:text-xl font-medium text-gray-600">Multimodal intelligence meets brutalist design.</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Reveal delay={0}>
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo h-full flex flex-col hover:shadow-neo-lg hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-neo-cyan border-2 border-black flex items-center justify-center text-3xl mb-6 shadow-neo-sm group-hover:rotate-12 transition-transform">
                  🧬
                </div>
                <h3 className="font-display font-bold text-2xl mb-3 text-neo-black">Brand DNA Extraction</h3>
                <p className="text-gray-900 leading-relaxed font-medium">
                  Upload your logo and let our vision models extract your hex codes, fonts, and brand "vibe" instantly. Every generated asset is legally compliant with your style guide.
                </p>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo h-full flex flex-col hover:shadow-neo-lg hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute -right-12 top-4 bg-neo-pink text-black text-xs font-black px-12 py-1 border-2 border-black transform rotate-45 shadow-sm">
                  NEW VEO 3.1
                </div>
                <div className="w-16 h-16 bg-neo-yellow border-2 border-black flex items-center justify-center text-3xl mb-6 shadow-neo-sm group-hover:-rotate-12 transition-transform">
                  🎥
                </div>
                <h3 className="font-display font-bold text-2xl mb-3 text-neo-black">Cinematic Video</h3>
                <p className="text-gray-900 leading-relaxed font-medium">
                  Generate broadcast-ready video clips for TikTok and Reels. Describe the scene, camera angle, and lighting—we handle the physics.
                </p>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo h-full flex flex-col hover:shadow-neo-lg hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-neo-pink border-2 border-black flex items-center justify-center text-3xl mb-6 shadow-neo-sm group-hover:scale-110 transition-transform">
                  🧠
                </div>
                <h3 className="font-display font-bold text-2xl mb-3 text-neo-black">Strategic Reasoning</h3>
                <p className="text-gray-900 leading-relaxed font-medium">
                  This isn't just a chatbot. It's a CMO. Our agent digests your pitch decks and PDFs to create highly contextual marketing strategies that actually convert.
                </p>
              </div>
            </Reveal>
         </div>
      </section>

      <section className="py-16 md:py-24 bg-neo-lime border-y-4 border-black relative overflow-hidden">
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
         
         <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-12 md:gap-16 items-center relative z-10">
            <div className="md:w-1/2">
               <Reveal>
                 <div className="bg-black text-white inline-block px-4 py-1 font-bold mb-4 transform -rotate-2 text-sm">
                    ROI CALCULATOR
                 </div>
                 <h2 className="font-display font-black text-4xl md:text-7xl mb-6 md:mb-8 leading-tight text-neo-black">
                   STOP BURNING <br/> CASH.
                 </h2>
                 <p className="font-sans text-lg md:text-xl font-bold mb-8 md:mb-10 text-gray-900">
                   Predi AI acts as your dedicated design, copy, and strategy team, available 24/7 for a fraction of the cost.
                 </p>
                 <ul className="space-y-4 font-bold text-base md:text-lg text-neo-black">
                    <li className="flex items-center gap-4 bg-white/50 p-2 rounded-lg border-2 border-transparent hover:border-black transition-colors">
                      <span className="bg-black text-white p-1 rounded-sm">✅</span> Unlimited Ideation & Revisions
                    </li>
                    <li className="flex items-center gap-4 bg-white/50 p-2 rounded-lg border-2 border-transparent hover:border-black transition-colors">
                      <span className="bg-black text-white p-1 rounded-sm">✅</span> 100% Commercial Usage Rights
                    </li>
                    <li className="flex items-center gap-4 bg-white/50 p-2 rounded-lg border-2 border-transparent hover:border-black transition-colors">
                      <span className="bg-black text-white p-1 rounded-sm">✅</span> Enterprise-Grade Security
                    </li>
                 </ul>
               </Reveal>
            </div>
            
            <div className="md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
               <Reveal delay={100} className="w-full">
                 <div className="bg-white border-4 border-black p-6 shadow-neo text-center hover:scale-105 transition-transform cursor-crosshair">
                    <div className="font-display font-black text-5xl md:text-6xl text-neo-pink mb-2 drop-shadow-sm">10x</div>
                    <div className="font-black text-sm uppercase tracking-wider">Faster Production</div>
                 </div>
               </Reveal>
               <Reveal delay={200} className="w-full">
                 <div className="bg-white border-4 border-black p-6 shadow-neo text-center hover:scale-105 transition-transform cursor-crosshair">
                    <div className="font-display font-black text-5xl md:text-6xl text-neo-cyan mb-2 drop-shadow-sm">90%</div>
                    <div className="font-black text-sm uppercase tracking-wider">Cost Reduction</div>
                 </div>
               </Reveal>
               <Reveal delay={300} className="col-span-1 sm:col-span-2 w-full">
                 <div className="bg-white border-4 border-black p-8 shadow-neo text-center hover:scale-105 transition-transform cursor-crosshair flex flex-col items-center justify-center">
                    <div className="font-display font-black text-5xl md:text-7xl text-neo-yellow mb-2 drop-shadow-sm" style={{ WebkitTextStroke: '2px black' }}>1M+</div>
                    <div className="font-black text-sm uppercase tracking-wider">Tokens Context Window</div>
                 </div>
               </Reveal>
            </div>
         </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-12 max-w-4xl mx-auto">
         <h2 className="font-display font-black text-3xl md:text-5xl text-center mb-12 md:mb-16 text-neo-black">FREQUENTLY ASKED</h2>
         <div className="space-y-4 md:space-y-6">
            <Reveal delay={0}>
              <details className="group bg-white border-4 border-black shadow-neo open:shadow-neo-lg transition-all">
                 <summary className="flex justify-between items-center font-bold text-lg md:text-xl p-4 md:p-6 cursor-pointer list-none hover:bg-gray-50">
                    <span>Is the content unique?</span>
                    <span className="transition-transform duration-300 group-open:rotate-180 bg-neo-black text-white rounded-full w-8 h-8 flex items-center justify-center">
                      ↓
                    </span>
                 </summary>
                 <p className="text-gray-900 px-4 md:px-6 pb-6 md:pb-8 pt-2 text-base md:text-lg leading-relaxed border-t-2 border-black/10">
                    Yes. Predi AI generates every image, video, and caption from scratch using Generative AI. We do not use templates.
                 </p>
              </details>
            </Reveal>
            
            <Reveal delay={100}>
              <details className="group bg-white border-4 border-black shadow-neo open:shadow-neo-lg transition-all">
                 <summary className="flex justify-between items-center font-bold text-lg md:text-xl p-4 md:p-6 cursor-pointer list-none hover:bg-gray-50">
                    <span>What file types can I upload?</span>
                    <span className="transition-transform duration-300 group-open:rotate-180 bg-neo-black text-white rounded-full w-8 h-8 flex items-center justify-center">
                      ↓
                    </span>
                 </summary>
                 <p className="text-gray-900 px-4 md:px-6 pb-6 md:pb-8 pt-2 text-base md:text-lg leading-relaxed border-t-2 border-black/10">
                    You can upload PNG, JPEG, and WEBP for images/logos. For context documents, we accept PDF and plain text files.
                 </p>
              </details>
            </Reveal>

            <Reveal delay={200}>
              <details className="group bg-white border-4 border-black shadow-neo open:shadow-neo-lg transition-all">
                 <summary className="flex justify-between items-center font-bold text-lg md:text-xl p-4 md:p-6 cursor-pointer list-none hover:bg-gray-50">
                    <span>Do I own the intellectual property?</span>
                    <span className="transition-transform duration-300 group-open:rotate-180 bg-neo-black text-white rounded-full w-8 h-8 flex items-center justify-center">
                      ↓
                    </span>
                 </summary>
                 <p className="text-gray-900 px-4 md:px-6 pb-6 md:pb-8 pt-2 text-base md:text-lg leading-relaxed border-t-2 border-black/10">
                    Absolutely. You retain full ownership and intellectual property rights over the content you generate.
                 </p>
              </details>
            </Reveal>
         </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-12 relative overflow-hidden bg-white">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <Reveal>
              <div className="inline-block bg-neo-cyan border-4 border-black px-6 py-2 font-bold text-sm uppercase tracking-widest mb-6 transform rotate-1 shadow-neo">
                Simple Pricing
              </div>
              <h2 className="font-display font-black text-4xl md:text-6xl text-neo-black mb-4">
                PICK YOUR <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime">POWER LEVEL</span>
              </h2>
              <p className="text-lg md:text-xl font-medium text-gray-600 max-w-2xl mx-auto">
                Start free. Scale when you're ready. No hidden fees.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Reveal delay={0}>
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo h-full flex flex-col relative group hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-neo-yellow border-4 border-black transform rotate-12"></div>
                
                <div className="mb-6">
                  <h3 className="font-display font-black text-2xl md:text-3xl text-neo-black mb-2">FREE</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-5xl md:text-6xl text-neo-black">$0</span>
                    <span className="text-gray-500 font-bold">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-lime border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    10 image generations
                  </li>
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-lime border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    Video generation with credits
                  </li>
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-lime border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    Core brand context builder
                  </li>
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-lime border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    Community support
                  </li>
                </ul>

                <button 
                  onClick={onLogin}
                  className="w-full bg-white text-neo-black border-4 border-black py-3 md:py-4 font-bold shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neo-yellow"
                >
                  Start Free
                </button>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="bg-neo-pink border-4 border-black p-6 md:p-8 shadow-neo-lg h-full flex flex-col relative group hover:-translate-y-2 transition-all duration-300 transform md:scale-105 z-10">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 -rotate-2">
                  <div className="bg-neo-black text-white px-4 py-1 font-bold text-xs md:text-sm uppercase tracking-wider border-4 border-black shadow-neo whitespace-nowrap">
                    ⭐ MOST POPULAR
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-neo-cyan border-4 border-black transform -rotate-6"></div>
                
                <div className="mb-6 mt-4">
                  <h3 className="font-display font-black text-2xl md:text-3xl text-neo-black mb-2">BASIC</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-5xl md:text-6xl text-neo-black">$29</span>
                    <span className="text-neo-black/70 font-bold">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-3 font-bold">
                    <span className="w-6 h-6 bg-neo-black text-white border-2 border-black flex items-center justify-center text-sm shrink-0">✓</span>
                    50 image generations
                  </li>
                  <li className="flex items-center gap-3 font-bold">
                    <span className="w-6 h-6 bg-neo-black text-white border-2 border-black flex items-center justify-center text-sm shrink-0">✓</span>
                    3 videos (avg 8s)
                  </li>
                  <li className="flex items-center gap-3 font-bold">
                    <span className="w-6 h-6 bg-neo-black text-white border-2 border-black flex items-center justify-center text-sm shrink-0">✓</span>
                    Campaign packs + carousels
                  </li>
                  <li className="flex items-center gap-3 font-bold">
                    <span className="w-6 h-6 bg-neo-black text-white border-2 border-black flex items-center justify-center text-sm shrink-0">✓</span>
                    Priority queue
                  </li>
                </ul>

                <div className="bg-neo-yellow border-2 border-black px-3 py-2 mb-4 transform -rotate-1 text-center">
                  <span className="font-bold text-sm">🎉 3-day free trial included!</span>
                </div>

                <button 
                  onClick={onLogin}
                  className="w-full bg-neo-black text-white border-4 border-black py-3 md:py-4 font-bold shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neo-cyan hover:text-black"
                >
                  Start 3-Day Trial
                </button>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="bg-white border-4 border-black p-6 md:p-8 shadow-neo h-full flex flex-col relative group hover:shadow-neo-lg hover:-translate-y-1 transition-all duration-300">
                <div className="absolute -top-4 right-4 transform rotate-6">
                  <div className="bg-neo-lime text-neo-black px-3 py-1 font-bold text-xs uppercase tracking-wider border-4 border-black shadow-neo">
                    🚀 SCALE MODE
                  </div>
                </div>
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-neo-pink border-4 border-black transform rotate-45"></div>
                
                <div className="mb-6 mt-4">
                  <h3 className="font-display font-black text-2xl md:text-3xl text-neo-black mb-2">PRO</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-5xl md:text-6xl text-neo-black">$79</span>
                    <span className="text-gray-500 font-bold">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-cyan border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    150 image generations
                  </li>
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-cyan border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    10 videos (avg 8s)
                  </li>
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-cyan border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    Advanced brand consistency
                  </li>
                  <li className="flex items-center gap-3 font-medium">
                    <span className="w-6 h-6 bg-neo-cyan border-2 border-black flex items-center justify-center text-sm font-bold shrink-0">✓</span>
                    Faster turnaround
                  </li>
                </ul>

                <button 
                  onClick={onLogin}
                  className="w-full bg-neo-black text-white border-4 border-black py-3 md:py-4 font-bold shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neo-pink"
                >
                  Go Pro
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={400}>
            <div className="mt-12 text-center">
              <p className="text-gray-500 font-medium">
                All plans include commercial usage rights • Cancel anytime • No credit card required for free tier
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 text-center bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-neo-pink opacity-20 blur-3xl animate-pulse"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
           <h2 className="font-display font-black text-4xl md:text-8xl mb-6 md:mb-8">READY TO LAUNCH?</h2>
           <button 
             onClick={onLogin}
             className="bg-white text-black border-4 border-transparent px-8 py-4 md:px-12 md:py-6 text-xl md:text-2xl font-bold hover:scale-110 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]"
           >
             Start Your Free Trial
           </button>
        </div>
      </section>

      <footer className="bg-black text-white py-12 md:py-16 border-t border-gray-800">
         <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
               <div className="md:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <img src="/predi-cloud-logo.png" alt="Predi" className="w-8 h-8 object-contain" />
                    <h3 className="font-display font-bold text-xl">Predi</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">AI-powered marketing automation for modern teams.</p>
                  <a 
                    href="https://www.instagram.com/predi.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-neo-pink transition-colors text-sm font-bold"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </a>
               </div>
               
               <div>
                  <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Product</h4>
                  <div className="flex flex-col gap-3 text-sm text-gray-400">
                     <a href="/about" onClick={onNavigateAbout} className="hover:text-neo-lime transition-colors">About</a>
                     <a href="/how-it-works" onClick={onNavigateHowItWorks} className="hover:text-neo-yellow transition-colors">How it works</a>
                     <a href="/showcase" onClick={onNavigateShowcase} className="hover:text-neo-cyan transition-colors">Showcase</a>
                  </div>
               </div>
               
               <div>
                  <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Solutions</h4>
                  <div className="flex flex-col gap-3 text-sm text-gray-400">
                     <a href="/ai-marketing-platform" className="hover:text-neo-lime transition-colors">AI marketing platform</a>
                     <a href="/ai-video-ads-generator" className="hover:text-neo-yellow transition-colors">AI video ads generator</a>
                     <a href="/marketing-for-small-business" className="hover:text-neo-cyan transition-colors">Marketing for small business</a>
                     <a href="/long-form-ai-video" className="hover:text-neo-pink transition-colors">Long-form AI video</a>
                  </div>
               </div>
               
               <div>
                  <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Legal</h4>
                  <div className="flex flex-col gap-3 text-sm text-gray-400">
                     <a href="/privacy" onClick={onNavigatePrivacy} className="hover:text-neo-pink transition-colors">Privacy Policy</a>
                     <a href="/terms" onClick={onNavigateTerms} className="hover:text-neo-cyan transition-colors">Terms of Service</a>
                  </div>
               </div>
            </div>
            
            <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-sm">
               © 2025 Predi Inc. All rights reserved.
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
