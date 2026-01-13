import React, { useState } from 'react';
import { BrandIdentity } from '../types';

interface Props {
  initialIdentity: BrandIdentity;
  logoUrl: string;
  onSave: (identity: BrandIdentity) => void;
  onClose: () => void;
}

const BrandIdentityModal: React.FC<Props> = ({ initialIdentity, logoUrl, onSave, onClose }) => {
  const [identity, setIdentity] = useState<BrandIdentity>(initialIdentity);

  const handleColorChange = (index: number, val: string) => {
    const newColors = [...identity.colors];
    newColors[index] = val;
    setIdentity({ ...identity, colors: newColors });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Container constrained to screen height with flex column layout */}
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
        
        {/* Header - Fixed */}
        <div className="bg-neo-yellow border-b-4 border-black p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="font-display font-bold text-2xl">Brand DNA Extracted</h2>
          <button onClick={onClose} className="hover:bg-black hover:text-white p-1 transition-colors rounded">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column: Logo Preview */}
            <div className="md:w-1/3 flex flex-col items-center">
               <div className="w-full aspect-square border-2 border-dashed border-black/30 flex items-center justify-center p-4 bg-gray-50 mb-4 rounded-lg">
                  <img src={`data:image/png;base64,${logoUrl}`} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
               </div>
               <p className="text-xs text-center text-gray-500 font-bold uppercase tracking-widest">Original Source</p>
            </div>

            {/* Right Column: Editable Fields */}
            <div className="md:w-2/3 space-y-6">
               
               {/* Colors */}
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Brand Palette</label>
                  <div className="grid grid-cols-3 gap-3">
                     {identity.colors.map((color, idx) => (
                        <div key={idx} className="flex flex-col gap-1 w-full">
                           <div className="h-12 w-full rounded border-2 border-black shadow-neo-sm relative group overflow-hidden" style={{ backgroundColor: color }}>
                              {/* Color Picker Overlay */}
                              <input 
                                type="color" 
                                value={color} 
                                onChange={(e) => handleColorChange(idx, e.target.value)}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                              />
                           </div>
                           <input 
                             type="text" 
                             value={color} 
                             onChange={(e) => handleColorChange(idx, e.target.value)}
                             className="text-xs font-mono border-b border-gray-300 focus:border-neo-pink outline-none py-1 text-center w-full uppercase"
                           />
                        </div>
                     ))}
                  </div>
               </div>

               {/* Fonts */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Display Font</label>
                     <input 
                       type="text" 
                       value={identity.fonts.display} 
                       onChange={(e) => setIdentity({...identity, fonts: { ...identity.fonts, display: e.target.value }})}
                       className="w-full bg-gray-50 border-2 border-black/20 focus:border-black p-2 font-display font-bold rounded-sm"
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Body Font</label>
                     <input 
                       type="text" 
                       value={identity.fonts.body} 
                       onChange={(e) => setIdentity({...identity, fonts: { ...identity.fonts, body: e.target.value }})}
                       className="w-full bg-gray-50 border-2 border-black/20 focus:border-black p-2 font-sans rounded-sm"
                     />
                  </div>
               </div>

               {/* Vibe */}
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Brand Vibe</label>
                  <textarea 
                    value={identity.vibe} 
                    rows={2}
                    onChange={(e) => setIdentity({...identity, vibe: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-black/20 focus:border-black p-2 font-medium rounded-sm resize-none"
                  />
               </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="bg-gray-50 border-t-4 border-black p-4 flex justify-end gap-3 flex-shrink-0">
           <button onClick={onClose} className="px-6 py-2 font-bold text-gray-500 hover:text-black transition-colors">Cancel</button>
           <button 
             onClick={() => onSave(identity)}
             className="bg-neo-pink border-2 border-black shadow-neo px-6 py-2 font-bold hover:translate-y-[1px] hover:shadow-none transition-all"
           >
             Confirm Brand Identity
           </button>
        </div>
      </div>
    </div>
  );
};

export default BrandIdentityModal;