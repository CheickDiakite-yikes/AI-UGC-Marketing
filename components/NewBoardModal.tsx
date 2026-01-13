import React, { useState } from 'react';

interface Props {
  onCreate: (name: string) => void;
  onCancel: () => void;
}

const NewBoardModal: React.FC<Props> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-md animate-fade-in-up">
        <div className="bg-neo-pink border-b-4 border-black p-4">
          <h2 className="font-display font-bold text-xl">Start New Campaign</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wide">Project / Campaign Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Launch 2025"
              className="w-full bg-gray-50 border-2 border-black p-3 font-medium focus:outline-none focus:shadow-neo-sm transition-shadow"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-4 py-2 font-bold text-gray-500 hover:text-black hover:underline"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className="bg-neo-black text-white border-2 border-black shadow-neo px-6 py-2 font-bold hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBoardModal;