import React from 'react';

interface Props {
  onBack: () => void;
}

const TermsPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="w-full h-screen overflow-y-auto bg-white dark:bg-neo-dark font-sans text-neo-black dark:text-white relative overflow-x-hidden selection:bg-neo-cyan selection:text-black custom-scrollbar transition-colors duration-300">
      {/* Navbar / Back Button */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-neo-dark/80 backdrop-blur-md border-b-4 border-black dark:border-white p-4 flex justify-between items-center transition-colors">
        <div className="flex items-center cursor-pointer" onClick={onBack}>
           <div className="h-14 w-28 overflow-hidden">
             <img src="/predi-cloud-logo.png" alt="Predi" className="h-full w-full object-cover scale-[1.6]" />
           </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-white dark:bg-neo-gray dark:text-white border-2 border-black dark:border-white shadow-neo dark:shadow-neo-dark px-4 py-2 font-bold hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Home
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="font-display font-black text-5xl md:text-7xl mb-8 leading-none">
          TERMS OF <br/>
          <span className="text-white bg-black dark:bg-white dark:text-black px-2">SERVICE.</span>
        </h1>
        
        <div className="flex gap-4 mb-12 flex-wrap">
             <div className="bg-neo-pink border-2 border-black dark:border-white px-4 py-2 font-bold shadow-neo-sm dark:shadow-neo-sm-dark transform -rotate-2 text-black">Effective: Oct 2025</div>
             <div className="bg-neo-cyan border-2 border-black dark:border-white px-4 py-2 font-bold shadow-neo-sm dark:shadow-neo-sm-dark transform rotate-1 text-black">Version 2.0</div>
        </div>

        <div className="space-y-12 text-lg leading-relaxed font-medium text-gray-800 dark:text-gray-300">
          <section className="bg-gray-50 dark:bg-neo-gray p-8 border-4 border-black dark:border-white shadow-neo dark:shadow-neo-dark">
            <h2 className="font-display font-bold text-2xl mb-4 uppercase tracking-widest text-black dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Predi AI ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-3xl mb-4 flex items-center gap-2">
                <span className="bg-neo-yellow border-2 border-black dark:border-white w-8 h-8 flex items-center justify-center text-sm rounded-full text-black">2</span>
                <span>Generative AI Usage</span>
            </h2>
            <p className="mb-4">
               Predi AI uses advanced artificial intelligence models (Gemini, Veo, etc.) to generate content.
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-neo-pink">
                <li><strong>Accuracy:</strong> AI may produce inaccurate or offensive content. You must verify all generated output before professional use.</li>
                <li><strong>Ownership:</strong> You own the rights to the input you provide and the output generated, subject to Google's Generative AI terms.</li>
                <li><strong>Restrictions:</strong> You may not use the Service to generate illegal, harmful, or sexually explicit content.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-3xl mb-4 flex items-center gap-2">
                <span className="bg-neo-yellow border-2 border-black dark:border-white w-8 h-8 flex items-center justify-center text-sm rounded-full text-black">3</span>
                <span>User Accounts</span>
            </h2>
            <p>
               You are responsible for safeguarding the API keys or credentials you use to access the Service. Predi AI assumes no liability for any loss or damage arising from unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-3xl mb-4 flex items-center gap-2">
                <span className="bg-neo-yellow border-2 border-black dark:border-white w-8 h-8 flex items-center justify-center text-sm rounded-full text-black">4</span>
                <span>Limitation of Liability</span>
            </h2>
            <p>
               In no event shall Predi AI, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
            </p>
          </section>
        </div>
      </div>
      
      <div className="bg-black dark:bg-gray-900 text-white py-12 text-center border-t-4 border-gray-800">
        <p className="font-bold mb-2">Predi AI Inc.</p>
        <p className="text-sm text-gray-500">&copy; 2025 All rights reserved.</p>
      </div>
    </div>
  );
};

export default TermsPage;