'use client';

import React, { useState } from 'react';
import { Board } from '../types';

interface Props {
  boards: Board[];
  activeBoardId: string;
  onSwitch: (id: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
  onRename: (boardId: string, newName: string) => Promise<void>;
  onDelete: (boardId: string) => Promise<void>;
}

const BoardListModal: React.FC<Props> = ({ boards, activeBoardId, onSwitch, onClose, onCreateNew, onRename, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartRename = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(board.id);
    setEditName(board.name);
    setDeletingId(null);
  };

  const handleSaveRename = async (boardId: string) => {
    if (editName.trim() && editName.trim() !== boards.find(b => b.id === boardId)?.name) {
      setIsLoading(true);
      await onRename(boardId, editName.trim());
      setIsLoading(false);
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleStartDelete = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(boardId);
    setEditingId(null);
  };

  const handleConfirmDelete = async (boardId: string) => {
    setIsLoading(true);
    await onDelete(boardId);
    setIsLoading(false);
    setDeletingId(null);
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
  };

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
            <div
              key={board.id}
              className={`relative border-4 border-black p-4 transition-all group
                ${board.id === activeBoardId ? 'bg-neo-pink shadow-none translate-x-[2px] translate-y-[2px]' : 'bg-white shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}
              `}
            >
              {board.id === activeBoardId && (
                <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</div>
              )}
              
              {deletingId === board.id ? (
                <div className="space-y-3">
                  <p className="font-bold text-red-600">Delete "{board.name}"?</p>
                  <p className="text-xs text-gray-600">This will permanently delete all assets, messages, and generated content in this campaign.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmDelete(board.id)}
                      disabled={isLoading}
                      className="flex-1 bg-red-500 text-white py-2 text-sm font-bold border-2 border-black hover:bg-red-600 disabled:opacity-50"
                    >
                      {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      disabled={isLoading}
                      className="flex-1 bg-gray-200 py-2 text-sm font-bold border-2 border-black hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editingId === board.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(board.id);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    autoFocus
                    className="w-full px-3 py-2 border-2 border-black font-bold focus:border-neo-pink focus:outline-none"
                    placeholder="Campaign name"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveRename(board.id)}
                      disabled={isLoading || !editName.trim()}
                      className="flex-1 bg-neo-cyan py-2 text-sm font-bold border-2 border-black hover:bg-neo-lime disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelRename}
                      disabled={isLoading}
                      className="flex-1 bg-gray-200 py-2 text-sm font-bold border-2 border-black hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      onSwitch(board.id);
                      onClose();
                    }}
                  >
                    <h3 className="font-display font-bold text-lg mb-1 truncate pr-16">{board.name}</h3>
                    <div className="text-xs font-medium space-y-1 opacity-80">
                      <p>{(board as any).assetCount ?? board.assets?.length ?? 0} Assets Uploaded</p>
                      <p>{(board as any).generatedItemCount ?? board.items?.length ?? 0} Canvas Items</p>
                      <p className="text-[10px] uppercase mt-2 pt-2 border-t border-black/10">Created: {new Date(board.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStartRename(board, e)}
                      className="p-1.5 bg-white border-2 border-black hover:bg-neo-cyan transition-colors"
                      title="Rename"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {board.id !== activeBoardId && (
                      <button
                        onClick={(e) => handleStartDelete(board.id, e)}
                        className="p-1.5 bg-white border-2 border-black hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          
          <button
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="border-4 border-dashed border-gray-300 p-4 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400 transition-colors min-h-[140px]"
          >
             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
               <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
             </div>
             <span className="font-bold text-gray-400">Create New Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardListModal;
