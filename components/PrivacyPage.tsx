import React from 'react';

interface Props {
  onBack: () => void;
}

const PrivacyPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="w-full h-screen overflow-y-auto bg-white dark:bg-neo-dark font-sans text-neo-black dark:text-white relative overflow-x-hidden selection:bg-neo-pink selection:text-white custom-scrollbar transition-colors duration-300">
      {/* Navbar / Back Button */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-neo-dark/80 backdrop-blur-md border-b-4 border-black dark:border-white p-4 flex justify-between items-center transition-colors">
        <div className="flex items-center cursor-pointer" onClick={onBack}>
           <div className="h-12 w-24 overflow-hidden">
             <img src="/predi-cloud-logo.png" alt="Predi" className="h-full w-full object-cover scale-[2.2]" />
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
          PRIVACY <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neo-pink to-neo-cyan" style={{ WebkitTextStroke: '1px rgba(0,0,0,0.1)' }}>POLICY.</span>
        </h1>
        
        <div className="bg-neo-yellow border-4 border-black dark:border-white p-6 shadow-neo dark:shadow-neo-dark mb-12 transform rotate-1 text-black">
            <p className="font-bold text-lg">Last Updated: October 24, 2025</p>
            <p className="font-medium opacity-80">We value your trust more than your data.</p>
        </div>

        <div className="space-y-12 text-lg leading-relaxed font-medium text-gray-800 dark:text-gray-300">
          <section>
            <h2 className="font-display font-bold text-3xl mb-4 bg-neo-pink inline-block px-3 py-1 border-2 border-black dark:border-white shadow-neo-sm dark:shadow-neo-sm-dark transform -rotate-1 text-black">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Predi AI ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
              This privacy policy explains how we collect, use, disclose, and safeguard your information when you visit our application 
              and use our AI marketing generation services.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-3xl mb-4 bg-neo-cyan inline-block px-3 py-1 border-2 border-black dark:border-white shadow-neo-sm dark:shadow-neo-sm-dark transform rotate-1 text-black">2. Data We Collect</h2>
            <p className="mb-4">We collect information that you voluntarily provide to us when you register for the application or use our services:</p>
            <ul className="list-none space-y-4 mt-6">
                <li className="flex gap-4 p-4 bg-gray-50 dark:bg-neo-gray border-2 border-black dark:border-white rounded-lg">
                    <span className="text-2xl">👤</span>
                    <div>
                        <strong className="block font-bold text-black dark:text-white">Identity Data</strong>
                        <span className="text-sm">Name, email address, and account credentials managed via Google Auth.</span>
                    </div>
                </li>
                <li className="flex gap-4 p-4 bg-gray-50 dark:bg-neo-gray border-2 border-black dark:border-white rounded-lg">
                    <span className="text-2xl">📂</span>
                    <div>
                        <strong className="block font-bold text-black dark:text-white">Project Assets</strong>
                        <span className="text-sm">Logos, brand guidelines, PDFs, pitch decks, and images you upload for AI analysis.</span>
                    </div>
                </li>
                <li className="flex gap-4 p-4 bg-gray-50 dark:bg-neo-gray border-2 border-black dark:border-white rounded-lg">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <strong className="block font-bold text-black dark:text-white">Usage Data</strong>
                        <span className="text-sm">Prompts sent to Gemini/Veo models, generated images/videos, and application interaction logs.</span>
                    </div>
                </li>
            </ul>
          </section>

          <section>
             <h2 className="font-display font-bold text-3xl mb-4 bg-neo-lime inline-block px-3 py-1 border-2 border-black dark:border-white shadow-neo-sm dark:shadow-neo-sm-dark text-black">3. AI Processing & Third Parties</h2>
             <p className="mb-4">
                Predi AI utilizes Google's Gemini and Veo models to provide core functionality.
             </p>
             <div className="bg-white dark:bg-neo-gray border-4 border-black dark:border-white p-6 shadow-neo dark:shadow-neo-dark">
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Google Cloud Vertex AI:</strong> Your prompts and assets are transmitted to Google Cloud for processing. We do not use your data to train our own foundation models, but data handling is subject to Google Cloud's data processing terms.</li>
                    <li><strong>Storage:</strong> Generated assets are stored temporarily for your session usage.</li>
                </ul>
             </div>
          </section>

          <section>
             <h2 className="font-display font-bold text-3xl mb-4 border-b-4 border-black dark:border-white pb-2">4. Your Rights</h2>
             <p>
                Depending on your location, you may have the right to access, correct, or delete your personal data. 
                Since Predi AI is designed as a productivity tool, you retain full ownership and intellectual property rights 
                over the content you generate.
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

export default PrivacyPage;