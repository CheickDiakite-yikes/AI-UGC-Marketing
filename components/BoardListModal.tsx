import React from 'react';
import { Board } from '../types';

interface Props {
  boards: Board[];
  activeBoardId: string;
  onSwitch: (id: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
}

const BoardListModal: React.FC<Props> = ({ boards, activeBoardId, onSwitch, onClose, onCreateNew }) => {
  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up">
        <div className="bg-neo-cyan border-b-4 border-black p-4 flex justify-between items-center">
          <h2 className="font-display font-bold text-xl">My Campaigns</h2>
          <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors rounded">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => {
                onSwitch(board.id);
                onClose();
              }}
              className={`text-left border-4 border-black p-4 transition-all group relative
                ${board.id === activeBoardId ? 'bg-neo-pink shadow-none translate-x-[2px] translate-y-[2px]' : 'bg-white shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'}
              `}
            >
              {board.id === activeBoardId && (
                <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</div>
              )}
              <h3 className="font-display font-bold text-lg mb-1 truncate pr-12">{board.name}</h3>
              <div className="text-xs font-medium space-y-1 opacity-80">
                 <p>{board.assets.length} Assets Uploaded</p>
                 <p>{board.items.length} Canvas Items</p>
                 <p className="text-[10px] uppercase mt-2 pt-2 border-t border-black/10">Created: {new Date(board.createdAt).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
          
          {/* Add New Card */}
          <button
            onClick={() => {
              onCreateNew();
              // Do not close this modal immediately, let the create modal render on top or replace it
              // We'll handle state in parent to close this one if needed, or stacking.
              // For now, let's keep this open? Or close it. 
              // Better to close this one and open the create one.
              onClose();
            }}
            className="border-4 border-dashed border-gray-300 p-4 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400 transition-colors min-h-[140px]"
          >
             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
               <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
             </div>
             <span className="font-bold text-gray-400">Create New Board</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardListModal;