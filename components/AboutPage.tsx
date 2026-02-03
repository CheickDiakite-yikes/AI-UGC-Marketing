import React, { useState } from 'react';
import ShowcaseMarquee from './ShowcaseMarquee';

interface Props {
  onBack: () => void;
}

const AboutPage: React.FC<Props> = ({ onBack }) => {
  const [selectedHeadshot, setSelectedHeadshot] = useState<{ src: string; name: string } | null>(null);
  const closeHeadshot = () => setSelectedHeadshot(null);

  return (
    <div className="w-full h-screen overflow-y-auto bg-white font-sans text-neo-black relative overflow-x-hidden selection:bg-neo-pink selection:text-white custom-scrollbar">
      <div className="absolute -top-24 -right-16 w-72 h-72 bg-neo-pink/30 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-neo-cyan/30 blur-3xl animate-float"></div>

      {/* Navbar / Back Button */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-4 border-black p-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <img src="/predi-cloud-logo.png" alt="Predi" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-xl tracking-tight">Predi</span>
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

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <h1 className="font-display font-black text-5xl md:text-8xl leading-none">
          ABOUT
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neo-pink to-neo-cyan">
            PREDI AI
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl font-medium text-gray-700 max-w-2xl">
          We are building an AI-native marketing OS that helps small teams ship world-class campaigns
          with the speed of a full creative studio.
        </p>
      </div>

      <ShowcaseMarquee />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="bg-neo-yellow border-4 border-black p-6 shadow-neo transform -rotate-1">
            <p className="text-xs font-black uppercase tracking-widest text-gray-700">Why we started</p>
            <h2 className="font-display font-bold text-2xl mt-2">Marketing should move at product speed.</h2>
            <p className="mt-3 text-sm font-medium text-gray-800">
              We saw founders blocked by creative bottlenecks. Predi AI compresses weeks of work into
              a single flow: brand identity, prompts, assets, and launch-ready output.
            </p>
          </div>
          <div className="bg-white border-4 border-black p-6 shadow-neo-lg animate-slide-up">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">How we build</p>
            <h2 className="font-display font-bold text-2xl mt-2">Studio-grade quality, agent-grade speed.</h2>
            <p className="mt-3 text-sm font-medium text-gray-700">
              Our stack blends structured prompting, brand grounding, and media pipelines so every
              scene stays on-brand and on-character.
            </p>
          </div>
          <div className="bg-neo-cyan border-4 border-black p-6 shadow-neo transform rotate-1">
            <p className="text-xs font-black uppercase tracking-widest text-gray-700">What we believe</p>
            <h2 className="font-display font-bold text-2xl mt-2">Small teams should ship loud.</h2>
            <p className="mt-3 text-sm font-medium text-gray-800">
              When you can test fast, you learn faster. Predi AI is built for creative momentum, not
              red tape.
            </p>
          </div>
        </div>

        <section className="mt-16">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span className="w-2 h-2 bg-neo-pink rounded-full animate-pulse"></span>
            Team of Two
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl mt-3">Tiny team. Massive output.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="bg-white border-4 border-black p-6 shadow-neo-lg transform -rotate-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedHeadshot({ src: '/team/cheick.jpeg', name: 'Cheick Diakite' })}
                  className="w-24 h-24 border-2 border-black bg-neo-yellow overflow-hidden shadow-neo-sm hover:scale-[1.02] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink"
                >
                  <img src="/team/cheick.jpeg" alt="Cheick Diakite" className="w-full h-full object-cover" />
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">Founder - Product & Engineering</p>
                  <h3 className="font-display font-black text-2xl">Cheick Diakite</h3>
                  <a
                    href="https://www.linkedin.com/in/cheickdiakite/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex mt-2 text-[10px] font-black uppercase tracking-widest text-neo-cyan hover:text-neo-pink transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700">
                DeepMind Hackathon winner and Techstars-backed founder who bridges boardroom strategy with shipped AI systems.
                Former investment banker and private equity associate, now building LLM agents and RAG pipelines that cut analysis
                cycles by 70%+.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className="bg-neo-yellow text-black px-3 py-1 border-2 border-black">LLM Systems</span>
                <span className="bg-white text-black px-3 py-1 border-2 border-black">AI Product</span>
                <span className="bg-neo-cyan text-black px-3 py-1 border-2 border-black">Tech + Finance</span>
              </div>
            </div>
            <div className="bg-neo-lime border-4 border-black p-6 shadow-neo transform rotate-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedHeadshot({ src: '/team/avery.jpeg', name: 'Avery Provin' })}
                  className="w-24 h-24 border-2 border-black bg-white overflow-hidden shadow-neo-sm hover:scale-[1.02] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink"
                >
                  <img src="/team/avery.jpeg" alt="Avery Provin" className="w-full h-full object-cover" />
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-700">Co-Founder - Marketing & Creative</p>
                  <h3 className="font-display font-black text-2xl">Avery Provin</h3>
                  <a
                    href="https://www.linkedin.com/in/avery-provin-9951a6153/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex mt-2 text-[10px] font-black uppercase tracking-widest text-neo-cyan hover:text-neo-pink transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-800">
                B2B and product marketing leader with experience at Mastercard, McCann, and TAXI.
                Avery led campaigns for State Street Investment Management and U.S. Soccer, and keeps Predi AI outputs grounded
                in real-world performance.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white text-black px-3 py-1 border-2 border-black">B2B GTM</span>
                <span className="bg-neo-yellow text-black px-3 py-1 border-2 border-black">Brand Strategy</span>
                <span className="bg-neo-pink text-black px-3 py-1 border-2 border-black">Content Ops</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display font-black text-3xl md:text-4xl">The values we ship by</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { title: 'Craft', body: 'Every output should feel directed, not generated.' },
              { title: 'Momentum', body: 'Speed is a feature, not a compromise.' },
              { title: 'Clarity', body: 'No mystery boxes. You control the brand DNA.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border-2 border-black p-4 shadow-neo-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">{item.title}</div>
                <p className="mt-2 text-sm font-medium text-gray-700">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span className="w-2 h-2 bg-neo-cyan rounded-full animate-pulse"></span>
            Why Us
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl mt-3">ROI you can feel in the first week.</h2>
          <p className="mt-4 text-sm md:text-base font-medium text-gray-700 max-w-3xl">
            Predi AI is built to compress creative cycles and cut unnecessary spend. You move from brief to launch in a single
            workflow, with consistent identity baked into every output.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="bg-neo-yellow border-4 border-black p-5 shadow-neo transform -rotate-1">
              <div className="text-xs font-black uppercase tracking-widest text-gray-700">Time saved</div>
              <h3 className="font-display font-black text-2xl mt-2">Hours, not weeks.</h3>
              <p className="mt-2 text-sm font-medium text-gray-800">
                Create briefs, storyboards, and multi-asset packs in a single session. Faster feedback loops mean faster wins.
              </p>
            </div>
            <div className="bg-white border-4 border-black p-5 shadow-neo-lg">
              <div className="text-xs font-black uppercase tracking-widest text-gray-500">Cost control</div>
              <h3 className="font-display font-black text-2xl mt-2">Compute-priced output.</h3>
              <p className="mt-2 text-sm font-medium text-gray-700">
                Pay with credits instead of agency retainers. Reference-driven consistency reduces rework and reshoots.
              </p>
            </div>
            <div className="bg-neo-lime border-4 border-black p-5 shadow-neo transform rotate-1">
              <div className="text-xs font-black uppercase tracking-widest text-gray-700">ROI compounding</div>
              <h3 className="font-display font-black text-2xl mt-2">More experiments, better outcomes.</h3>
              <p className="mt-2 text-sm font-medium text-gray-800">
                When you can test more angles, the winners surface faster. Scale what works and double down.
              </p>
            </div>
          </div>
          <div className="mt-8 border-4 border-black bg-black text-white p-6 shadow-neo-lg">
            <div className="grid gap-4 md:grid-cols-3 text-sm font-medium">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Traditional</div>
                <p className="mt-2 text-gray-300">Briefing → vendors → revisions → weeks of delay.</p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Predi AI</div>
                <p className="mt-2 text-gray-200">Brief → generate → approve → ship, same day.</p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Result</div>
                <p className="mt-2 text-neo-cyan font-bold">Higher velocity, lower cost, clearer ROI.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 bg-black text-white border-4 border-black p-8 shadow-neo-lg">
          <h2 className="font-display font-black text-3xl md:text-4xl">Want the full story?</h2>
          <p className="mt-3 text-sm md:text-base text-gray-300 max-w-2xl">
            We love connecting with founders, creators, and teams that are ready to ship faster.
            Drop us a note inside the app and we will get back quickly.
          </p>
          <button
            onClick={onBack}
            className="mt-6 bg-white text-black border-2 border-white px-6 py-3 font-black uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
          >
            Back to the App
          </button>
        </section>
      </div>
      {selectedHeadshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeHeadshot}
        >
          <div
            className="relative bg-white border-4 border-black shadow-neo-lg max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeHeadshot}
              className="absolute -top-4 -right-4 w-10 h-10 bg-neo-yellow border-2 border-black font-black"
              aria-label="Close headshot"
            >
              X
            </button>
            <img src={selectedHeadshot.src} alt={selectedHeadshot.name} className="w-full h-auto object-contain" />
            <div className="p-3 border-t-2 border-black text-sm font-bold">{selectedHeadshot.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutPage;
