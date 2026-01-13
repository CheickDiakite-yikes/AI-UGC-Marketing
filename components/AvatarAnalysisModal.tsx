
import React, { useState } from 'react';
import { AvatarIdentity } from '../types';

interface Props {
  initialIdentity: AvatarIdentity;
  onSave: (identity: AvatarIdentity) => void;
  onClose: () => void;
}

const AvatarAnalysisModal: React.FC<Props> = ({ initialIdentity, onSave, onClose }) => {
  const [identity, setIdentity] = useState<AvatarIdentity>(initialIdentity);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-4xl max-h-[90vh] flex flex-col animate-pop-in overflow-hidden">
        
        {/* Header */}
        <div className="bg-neo-cyan border-b-4 border-black p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-black text-neo-cyan flex items-center justify-center font-black text-xl border-2 border-white shadow-neo-sm">🧬</div>
             <div>
                <h2 className="font-display font-black text-2xl uppercase leading-none">Avatar Calibration Center</h2>
                <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mt-1">High-Fidelity Reconstruction Active</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:bg-black hover:text-white p-2 transition-all">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50">
          <div className="flex flex-col lg:flex-row h-full">
            
            {/* Left: Visual Passport */}
            <div className="lg:w-1/3 p-6 border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-white">
               <h3 className="text-xs font-black uppercase tracking-tighter mb-4 text-gray-400">Identity Passport (Ref Images)</h3>
               <div className="grid grid-cols-2 gap-2">
                  {identity.referenceImages.map((img, idx) => (
                    <div key={idx} className="aspect-square border-2 border-black relative group overflow-hidden bg-neo-black">
                       <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                       <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] px-1 font-bold">ANGLE {idx + 1}</div>
                    </div>
                  ))}
                  {identity.referenceImages.length < 4 && (
                    <div className="aspect-square border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 font-bold text-[10px] text-center p-2 uppercase">
                       Add more angles for +90% accuracy
                    </div>
                  )}
               </div>
               
               <div className="mt-8">
                  <label className="text-xs font-black uppercase mb-2 block">Identity Tag</label>
                  <input 
                    type="text" 
                    value={identity.name}
                    onChange={(e) => setIdentity({...identity, name: e.target.value})}
                    className="w-full bg-neo-yellow/20 border-2 border-black p-3 font-black text-lg focus:bg-neo-yellow transition-colors outline-none"
                    placeholder="Enter Persona Name"
                  />
               </div>
            </div>

            {/* Right: Atomic Mapping */}
            <div className="lg:w-2/3 p-6 lg:p-8 space-y-8">
               <div className="bg-neo-black text-white p-4 border-2 border-black shadow-neo-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-4xl">SPEC</div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neo-cyan block mb-2">Neural Prompt Anchor (Visual DNA)</label>
                  <textarea 
                    value={identity.description}
                    onChange={(e) => setIdentity({...identity, description: e.target.value})}
                    rows={4}
                    className="w-full bg-transparent border-none text-sm font-medium leading-relaxed resize-none focus:outline-none scrollbar-none"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(identity.atomicTraits).map(([key, value]) => (
                    <div key={key} className="border-b-2 border-black pb-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                       <input 
                         type="text" 
                         value={value}
                         onChange={(e) => setIdentity({
                            ...identity, 
                            atomicTraits: { ...identity.atomicTraits, [key]: e.target.value }
                         })}
                         className="w-full bg-transparent font-bold text-sm focus:text-neo-pink outline-none transition-colors"
                       />
                    </div>
                  ))}
               </div>

               <div className="pt-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-3">Reconstruction Tags</label>
                  <div className="flex flex-wrap gap-2">
                     {identity.traits.map((trait, idx) => (
                        <div key={idx} className="bg-white border-2 border-black px-3 py-1 text-xs font-bold shadow-neo-sm hover:translate-y-[-1px] transition-transform">
                           #{trait}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t-4 border-black p-4 md:p-6 flex justify-between items-center flex-shrink-0">
           <div className="hidden md:flex items-center gap-2 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-tighter">Model Grounded to Passport</span>
           </div>
           <div className="flex gap-4 w-full md:w-auto">
              <button onClick={onClose} className="flex-1 md:flex-none px-8 py-3 font-bold text-gray-500 hover:text-black transition-colors">Abort</button>
              <button 
                onClick={() => onSave(identity)}
                className="flex-1 md:flex-none bg-neo-cyan border-2 border-black shadow-neo px-10 py-3 font-black uppercase tracking-tight hover:shadow-none hover:translate-y-[2px] transition-all active:scale-95"
              >
                Inject Identity DNA
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarAnalysisModal;
