
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import CanvasItemCard from './components/CanvasItemCard';
import BrandIdentityModal from './components/BrandIdentityModal';
import AvatarAnalysisModal from './components/AvatarAnalysisModal';
import BrandAnalysisSkeleton from './components/BrandAnalysisSkeleton';
import NewBoardModal from './components/NewBoardModal';
import BoardListModal from './components/BoardListModal';
import CameraModal from './components/CameraModal';
import LightboxModal from './components/LightboxModal';
import { ProjectAsset, CanvasItem, ChatMessage, AspectRatio, ImageSize, BrandIdentity, AvatarIdentity, Board, UsageStats } from './types';
import { chatWithMarketingAgent, generateMarketingImage, generateVeoVideo, analyzeBrandLogo, analyzeAvatarImage } from './services/geminiService';
import { FunctionCall, GenerateContentResponse } from '@google/genai';
import {
  getBoards,
  createBoard,
  getBoardDetails,
  saveAsset,
  saveBrandIdentityAction,
  saveAvatarIdentityAction,
  saveMessageAction,
  saveGeneratedItemAction,
  renameBoard,
  deleteBoard,
  getUserUsageAction,
  deleteAssetAction,
  deleteGeneratedItemAction
} from './app/actions/boardActions';


interface WorkspaceProps {
  onExitApp: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ onExitApp }) => {
  const [usage, setUsage] = useState<UsageStats>({ imagesGenerated: 0, videosGenerated: 0, lastResetDate: Date.now() });

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);

  // Initial Load (Boards + Usage)
  React.useEffect(() => {
    getUserUsageAction().then(setUsage);
    getBoards().then(async (bs) => {
      if (bs.length > 0) {
        const boardsWithDefaults = bs.map((b: any) => ({
          ...b,
          assets: b.assets || [],
          items: b.items || [],
          messages: b.messages || [],
          brandIdentity: b.brandIdentity || null,
          avatarIdentity: b.avatarIdentity || null,
          createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
        }));
        setBoards(boardsWithDefaults);
        setActiveBoardId(bs[0].id);
      } else {
        const newBoard = await createBoard('My First Campaign');
        const boardWithDefaults = {
          ...newBoard,
          assets: [],
          items: [],
          messages: [],
          brandIdentity: null,
          avatarIdentity: null,
          createdAt: newBoard.createdAt ? new Date(newBoard.createdAt).getTime() : Date.now()
        };
        setBoards([boardWithDefaults as any]);
        setActiveBoardId(newBoard.id);
      }
    });
  }, []);

  // Fetch active board details
  React.useEffect(() => {
    if (!activeBoardId) return;
    getBoardDetails(activeBoardId).then(b => {
      if (b) {
        // Map DB structure to Frontend structure
        const mappedBoard: Board = {
          ...b,
          items: b.generatedItems.map((gi: any) => ({
            id: gi.id,
            type: gi.type,
            content: gi.content,
            carouselUrls: gi.carouselUrls,
            title: gi.title,
            description: gi.description,
            meta: gi.metadata,
            x: gi.x,
            y: gi.y
          })),
          assets: b.assets as ProjectAsset[],
          messages: b.messages as ChatMessage[],
          brandIdentity: b.brandIdentity as BrandIdentity | null,
          avatarIdentity: b.avatarIdentity as AvatarIdentity | null,
          createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
        };
        setActiveBoard(mappedBoard);
      }
    });
  }, [activeBoardId]);

  const updateActiveBoard = (updater: (board: Board) => Board) => {
    if (activeBoard) setActiveBoard(updater(activeBoard));
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<CanvasItem | null>(null);

  const [isAnalyzingLogo, setIsAnalyzingLogo] = useState(false);
  const [pendingLogoAsset, setPendingLogoAsset] = useState<ProjectAsset | null>(null);
  const [pendingAvatarAssets, setPendingAvatarAssets] = useState<string[]>([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showBoardListModal, setShowBoardListModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state

  const [pendingScannedIdentity, setPendingScannedIdentity] = useState<BrandIdentity | null>(null);
  const [pendingScannedAvatar, setPendingScannedAvatar] = useState<AvatarIdentity | null>(null);

  const handleAddAsset = async (asset: ProjectAsset) => {
    if (!activeBoardId) return;

    // Persist asset first
    const savedAsset = await saveAsset(activeBoardId, asset);
    const assetWithId = { ...asset, id: savedAsset.id, status: savedAsset.status as 'digesting' | 'ready' };

    // Optimistic update
    updateActiveBoard(b => ({ ...b, assets: [...b.assets, assetWithId] }));

    if (asset.type === 'logo') {
      setIsAnalyzingLogo(true);
      setPendingLogoAsset(assetWithId);
      try {
        const identity = await analyzeBrandLogo(asset.content);
        setPendingScannedIdentity(identity);
        setShowBrandModal(true);
      } catch (error) {
        // If analysis fails, allow asset to remain
      } finally { setIsAnalyzingLogo(false); }
      return;
    }

    if (asset.type === 'avatar') {
      const newRefs = [...pendingAvatarAssets, asset.content];
      setPendingAvatarAssets(newRefs);

      if (!isCameraActive) {
        setIsAnalyzingLogo(true);
        try {
          const identity = await analyzeAvatarImage(newRefs);
          setPendingScannedAvatar(identity);
          setShowAvatarModal(true);
        } catch (error) {
          console.error(error);
        } finally { setIsAnalyzingLogo(false); }
      }
      return;
    }

    // Simulate digesting if needed, though DB status is 'ready' by default in schema
    // If we want digesting state, we'd update DB later. For now, keep it simple.
  };

  const handleDeleteAsset = async (assetId: string) => {
    const result = await deleteAssetAction(assetId);
    if (result.success) {
      updateActiveBoard(b => ({
        ...b,
        assets: b.assets.filter(a => a.id !== assetId)
      }));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const result = await deleteGeneratedItemAction(itemId);
    if (result.success) {
      updateActiveBoard(b => ({
        ...b,
        items: b.items.filter(i => i.id !== itemId)
      }));
    }
  };

  const handleCameraFinish = async (images: { data: string, label: string }[]) => {
    setIsCameraActive(false);
    setIsAnalyzingLogo(true);
    setProcessingStatus("Mapping Facial Geometry...");

    const base64List = images.map(img => img.data);
    setPendingAvatarAssets(base64List);

    try {
      const identity = await analyzeAvatarImage(base64List);
      setPendingScannedAvatar(identity);
      setShowAvatarModal(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingLogo(false);
      setProcessingStatus("");
    }
  };

  const handleSaveIdentity = async (identity: BrandIdentity) => {
    if (!activeBoardId) return;
    await saveBrandIdentityAction(activeBoardId, identity);
    // Refresh board to get updated state
    const updated = await getBoardDetails(activeBoardId);
    if (updated) {
      // Simple re-fetch mapping (duplicated code, should refactor but fine for now)
      const mappedBoard: Board = {
        ...updated,
        items: updated.generatedItems.map((gi: any) => ({
          id: gi.id, type: gi.type, content: gi.content, carouselUrls: gi.carouselUrls, title: gi.title, description: gi.description, meta: gi.metadata, x: gi.x, y: gi.y
        })),
        assets: updated.assets as ProjectAsset[],
        messages: updated.messages as ChatMessage[],
        brandIdentity: updated.brandIdentity as BrandIdentity | null,
        avatarIdentity: updated.avatarIdentity as AvatarIdentity | null,
        createdAt: updated.createdAt ? new Date(updated.createdAt).getTime() : Date.now()
      };
      setActiveBoard(mappedBoard);
    }
    setShowBrandModal(false);
  };

  const handleSaveAvatar = async (identity: AvatarIdentity) => {
    if (!activeBoardId) return;
    await saveAvatarIdentityAction(activeBoardId, identity);
    setShowAvatarModal(false);
    setPendingAvatarAssets([]);
    // Reload
    const updated = await getBoardDetails(activeBoardId);
    if (updated) {
      const mappedBoard: Board = {
        ...updated,
        items: updated.generatedItems.map((gi: any) => ({
          id: gi.id, type: gi.type, content: gi.content, carouselUrls: gi.carouselUrls, title: gi.title, description: gi.description, meta: gi.metadata, x: gi.x, y: gi.y
        })),
        assets: updated.assets as ProjectAsset[],
        messages: updated.messages as ChatMessage[],
        brandIdentity: updated.brandIdentity as BrandIdentity | null,
        avatarIdentity: updated.avatarIdentity as AvatarIdentity | null,
        createdAt: updated.createdAt ? new Date(updated.createdAt).getTime() : Date.now()
      };
      setActiveBoard(mappedBoard);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeBoard || !activeBoardId) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    updateActiveBoard(b => ({ ...b, messages: [...b.messages, userMsg] }));
    await saveMessageAction(activeBoardId, 'user', text);

    setIsProcessing(true);
    setProcessingStatus("Reasoning with Context...");

    try {
      const history = [...activeBoard.messages, userMsg].map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const readyAssets = activeBoard.assets.filter(a => a.status === 'ready');
      const response = await chatWithMarketingAgent(history, text, readyAssets, activeBoard.brandIdentity, activeBoard.avatarIdentity) as any;

      const modelParts = response.candidates[0].content.parts || [];
      let responseText = response.text || "";
      let newItems: CanvasItem[] = [];
      const packQueue: any[] = [];

      for (const part of modelParts) {
        if (part.functionCall) {
          const fc = part.functionCall as FunctionCall;
          if (fc.name === 'generate_image') {
            setProcessingStatus(`Rendering High-Fi Image...`);
            const imgData = await generateMarketingImage(fc.args['prompt'] as string, fc.args['aspectRatio'] as AspectRatio || AspectRatio.SQUARE);
            const item: CanvasItem = { id: Math.random().toString(), type: 'image', content: imgData, title: "Custom Asset", meta: { aspectRatio: fc.args['aspectRatio'] as string } };
            newItems.push(item);
            await saveGeneratedItemAction(activeBoardId, item);
            getUserUsageAction().then(setUsage);
          }
          if (fc.name === 'generate_video') {
            setProcessingStatus(`Simulating Cinematic Video...`);
            const videoUrl = await generateVeoVideo(fc.args['prompt'] as string, { resolution: '720p', aspectRatio: (fc.args['aspectRatio'] as any) || '16:9' });
            const item: CanvasItem = { id: Math.random().toString(), type: 'video', content: videoUrl, title: "Cinematic Clip" };
            newItems.push(item);
            await saveGeneratedItemAction(activeBoardId, item);
            getUserUsageAction().then(setUsage);
          }
          if (fc.name === 'generate_campaign_pack') packQueue.push(fc.args);
        }
      }

      if (packQueue.length > 0) {
        for (const pack of packQueue) {
          for (const item of pack.items) {
            setProcessingStatus(`Constructing ${item.title}...`);
            if (item.type === 'carousel') {
              const slides: string[] = [];
              for (const p of item.carousel_prompts) {
                const slide = await generateMarketingImage(p, item.aspectRatio || AspectRatio.SQUARE);
                slides.push(slide);
              }
              const carouselItem: CanvasItem = { id: Math.random().toString(), type: 'carousel', content: slides[0], carouselUrls: slides, title: item.title, meta: { caption: item.caption, hook: item.hook, archetype: item.archetype } };
              newItems.push(carouselItem);
              await saveGeneratedItemAction(activeBoardId, carouselItem);
              getUserUsageAction().then(setUsage);
            } else {
              const res = await (item.type === 'video' ? generateVeoVideo(item.visual_prompt, { resolution: '720p', aspectRatio: item.aspectRatio }) : generateMarketingImage(item.visual_prompt, item.aspectRatio));
              const singleItem: CanvasItem = { id: Math.random().toString(), type: item.type === 'video' ? 'video' : 'image', content: res, title: item.title, meta: { caption: item.caption, hook: item.hook, archetype: item.archetype } };
              newItems.push(singleItem);
              await saveGeneratedItemAction(activeBoardId, singleItem);
              getUserUsageAction().then(setUsage);
            }
          }
        }
      }

      let finalMessage = responseText;
      if (!finalMessage && newItems.length > 0) {
        const imageCount = newItems.filter(i => i.type === 'image').length;
        const carouselCount = newItems.filter(i => i.type === 'carousel').length;
        const videoCount = newItems.filter(i => i.type === 'video').length;
        const parts: string[] = [];
        if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
        if (carouselCount > 0) parts.push(`${carouselCount} carousel${carouselCount > 1 ? 's' : ''}`);
        if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
        finalMessage = `✨ All done! Created ${parts.join(' and ')} for your campaign.`;
      } else if (!finalMessage) {
        finalMessage = "Generation confirmed.";
      }
      const modelMsgText = finalMessage;
      await saveMessageAction(activeBoardId, 'model', modelMsgText);

      updateActiveBoard(b => ({
        ...b,
        items: [...newItems, ...b.items],
        messages: [...b.messages, { id: Date.now().toString(), role: 'model', text: modelMsgText }]
      }));

    } catch (error: any) {
      console.error("Chat error:", error);
      const errMsg = error?.message || "Something went wrong. Please try again.";
      updateActiveBoard(b => ({ ...b, messages: [...b.messages, { id: Date.now().toString(), role: 'model', text: `Error: ${errMsg}` }] }));
      await saveMessageAction(activeBoardId, 'model', `Error: ${errMsg}`);
    } finally { setIsProcessing(false); setProcessingStatus(""); }
  };

  const handleCreateBoard = async (name: string) => {
    const newBoard = await createBoard(name);
    // Refresh boards list
    getBoards().then(bs => setBoards(bs as any));
    setActiveBoardId(newBoard.id);
    setShowNewBoardModal(false);
  };

  const handleRenameBoard = async (boardId: string, newName: string) => {
    const result = await renameBoard(boardId, newName);
    if (result.success) {
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, name: newName } : b));
      if (activeBoard && activeBoard.id === boardId) {
        setActiveBoard({ ...activeBoard, name: newName });
      }
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    await deleteBoard(boardId);
    setBoards(prev => prev.filter(b => b.id !== boardId));
    if (activeBoardId === boardId) {
      const remainingBoards = boards.filter(b => b.id !== boardId);
      if (remainingBoards.length > 0) {
        setActiveBoardId(remainingBoards[0].id);
      } else {
        const newBoard = await createBoard('My First Campaign');
        const boardWithDefaults = {
          ...newBoard,
          assets: [],
          items: [],
          messages: [],
          brandIdentity: null,
          avatarIdentity: null,
          createdAt: newBoard.createdAt ? new Date(newBoard.createdAt).getTime() : Date.now()
        };
        setBoards([boardWithDefaults as any]);
        setActiveBoardId(newBoard.id);
      }
    }
  };

  if (!activeBoard) return <div className="flex h-screen items-center justify-center font-display text-xl animate-pulse">Loading Workspace...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full font-sans text-neo-black relative overflow-hidden bg-gray-50">
      {isCameraActive && (
        <CameraModal
          onCapture={() => { }} // Not used in batch mode
          onFinish={handleCameraFinish}
          onClose={() => setIsCameraActive(false)}
        />
      )}

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-3 gap-2 bg-neo-yellow border-b-4 border-black sticky top-0 z-40 h-16">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none flex-shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="font-display font-black text-base truncate flex-1">{activeBoard.name}</h2>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setShowBoardListModal(true)} className="p-2 bg-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none transition-all">📋</button>
          <button onClick={() => setShowNewBoardModal(true)} className="p-2 bg-neo-black text-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none transition-all">+</button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Slide-out on mobile, fixed on desktop */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-[85%] max-w-[320px] md:w-1/5 md:max-w-none
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${!sidebarOpen && 'md:pointer-events-auto pointer-events-none'}
        h-full
      `}>
        <Sidebar
          assets={activeBoard.assets} brandIdentity={activeBoard.brandIdentity} avatarIdentity={activeBoard.avatarIdentity}
          onAddAsset={handleAddAsset} onDeleteAsset={handleDeleteAsset} onEditBrand={() => setShowBrandModal(true)} onEditAvatar={() => setShowAvatarModal(true)}
          onStartCapture={() => { setIsCameraActive(true); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          onExitApp={onExitApp} usageStats={usage}
          boardId={activeBoardId}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-y-auto p-4 md:p-12 pb-32 md:pt-0">
        {/* Desktop Header - Hidden on mobile */}
        <header className="hidden md:flex justify-between items-center mb-12">
          <h2 className="text-5xl font-display font-black tracking-tight">{activeBoard.name}</h2>
          <div className="flex gap-3">
            <button onClick={() => setShowBoardListModal(true)} className="bg-white border-4 border-black shadow-neo px-6 py-2 font-black uppercase text-sm">Boards</button>
            <button onClick={() => setShowNewBoardModal(true)} className="bg-neo-black text-white border-4 border-black shadow-neo px-6 py-2 font-black uppercase text-sm">+ New</button>
          </div>
        </header>

        {/* Canvas Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-32">
          {activeBoard.items.length === 0 && !isProcessing && (
            <div className="col-span-full py-16 md:py-32 text-center opacity-20">
              <p className="text-6xl md:text-9xl mb-4 md:mb-6">🎨</p>
              <p className="font-display font-black text-xl md:text-3xl uppercase">Canvas Empty</p>
              <p className="text-sm mt-2 font-medium">Use the agent to generate your first campaign</p>
            </div>
          )}
          {activeBoard.items.map(item => <CanvasItemCard key={item.id} item={item} onExpand={setSelectedItem} onDelete={handleDeleteItem} />)}
        </div>
      </div>

      <ChatInterface messages={activeBoard.messages} onSendMessage={handleSendMessage} isProcessing={isProcessing} processingStatus={processingStatus} hasAssets={activeBoard.assets.length > 0} />
      {isAnalyzingLogo && <BrandAnalysisSkeleton />}
      {showBrandModal && pendingScannedIdentity && <BrandIdentityModal initialIdentity={pendingScannedIdentity} logoUrl={pendingLogoAsset?.content || ""} onSave={handleSaveIdentity} onClose={() => setShowBrandModal(false)} />}
      {showAvatarModal && pendingScannedAvatar && <AvatarAnalysisModal initialIdentity={pendingScannedAvatar} onSave={handleSaveAvatar} onClose={() => setShowAvatarModal(false)} />}
      {showNewBoardModal && <NewBoardModal onCreate={handleCreateBoard} onCancel={() => setShowNewBoardModal(false)} />}
      {showBoardListModal && <BoardListModal boards={boards} activeBoardId={activeBoardId} onSwitch={setActiveBoardId} onClose={() => setShowBoardListModal(false)} onCreateNew={() => setShowNewBoardModal(true)} onRename={handleRenameBoard} onDelete={handleDeleteBoard} />}
      {selectedItem && <LightboxModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};

export default Workspace;
