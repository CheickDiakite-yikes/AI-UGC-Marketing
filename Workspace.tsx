
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import CanvasItemCard from './components/CanvasItemCard';
import BrandIdentityModal from './components/BrandIdentityModal';
import AvatarAnalysisModal from './components/AvatarAnalysisModal';
import BrandAnalysisSkeleton from './components/BrandAnalysisSkeleton';
import ProductModal from './components/ProductModal';
import OnboardingPanel from './components/OnboardingPanel';
import OnboardingCoach, { CoachStep } from './components/OnboardingCoach';
import WorkspaceSkeleton from './components/WorkspaceSkeleton';
import OnboardingPanelSkeleton from './components/OnboardingPanelSkeleton';
import NewBoardModal from './components/NewBoardModal';
import BoardListModal from './components/BoardListModal';
import CameraModal from './components/CameraModal';
import LightboxModal from './components/LightboxModal';
import { useToast } from './components/Toast';
import { ProjectAsset, CanvasItem, ChatMessage, AspectRatio, ImageSize, BrandIdentity, AvatarIdentity, Board, UsageStats, Product, ProductAsset, OnboardingState, ProfileImportSelection } from './types';
import { chatWithMarketingAgent, generateMarketingImage, generateVeoVideo, analyzeBrandLogo, analyzeAvatarImage, discoverTrends, researchWithGoogleSearch, validateCopyConsistency } from './services/geminiService';
import { buildIdentityConstraints } from './services/identityPromptUtils';
import { IMAGE_LIMIT, VIDEO_LIMIT, getRemainingImages, getRemainingVideos } from './services/usageLimits';
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
  deleteGeneratedItemAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  setProductAssetsAction,
  autoTagAssetAction,
  analyzeProductImagesAction,
  getOnboardingStateAction,
  dismissOnboardingAction,
  completeOnboardingAction
} from './app/actions/boardActions';
import { toggleFavoriteAction } from './app/actions/favoriteActions';


interface WorkspaceProps {
  onExitApp: () => void;
}

interface FailedJob {
  id: string;
  type: string;
  title: string;
  error: string;
  payload: any;
}

const Workspace: React.FC<WorkspaceProps> = ({ onExitApp }) => {
  const { showError, showSuccess, showToast } = useToast();
  const [usage, setUsage] = useState<UsageStats>({ imagesGenerated: 0, videosGenerated: 0, lastResetDate: 0 });
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [skippedOnboardingSteps, setSkippedOnboardingSteps] = useState<string[]>([]);
  const [activeOnboardingStepId, setActiveOnboardingStepId] = useState<string | null>(null);

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

  // Refresh onboarding state helper - must be defined before useEffects that use it
  const refreshOnboardingState = useCallback(async () => {
    setIsOnboardingLoading(true);
    try {
      const state = await getOnboardingStateAction();
      setOnboardingState(state);
    } catch (error) {
      console.error('[ONBOARDING] Failed to load onboarding state:', error);
    } finally {
      setIsOnboardingLoading(false);
    }
  }, []);

  // Fetch active board details
  React.useEffect(() => {
    if (!activeBoardId) return;
    setPendingItems([]);
    setActiveJobs([]);
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
            y: gi.y,
            isFavorite: gi.isFavorite
          })),
          assets: b.assets as ProjectAsset[],
          messages: b.messages as ChatMessage[],
          brandIdentity: b.brandIdentity as BrandIdentity | null,
          avatarIdentity: b.avatarIdentity as AvatarIdentity | null,
          products: (b.products || []).map((p: any) => ({
            ...p,
            assets: p.productAssets as ProductAsset[]
          })),
          createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
        };
        setActiveBoard(mappedBoard);
      }
    }).finally(() => {
      refreshOnboardingState();
    });
  }, [activeBoardId, refreshOnboardingState]);

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
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showBoardListModal, setShowBoardListModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state

  const [pendingScannedIdentity, setPendingScannedIdentity] = useState<BrandIdentity | null>(null);
  const [pendingScannedAvatar, setPendingScannedAvatar] = useState<AvatarIdentity | null>(null);

  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [pendingItems, setPendingItems] = useState<CanvasItem[]>([]);

  const loadBoardDetails = useCallback(async (boardId: string) => {
    const b = await getBoardDetails(boardId);
    if (b) {
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
            y: gi.y,
            isFavorite: gi.isFavorite
          })),
        assets: b.assets as ProjectAsset[],
        messages: b.messages as ChatMessage[],
        brandIdentity: b.brandIdentity as BrandIdentity | null,
        avatarIdentity: b.avatarIdentity as AvatarIdentity | null,
        products: (b.products || []).map((p: any) => ({
          ...p,
          assets: p.productAssets as ProductAsset[]
        })),
        createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
      };
      setActiveBoard(mappedBoard);
    }
    await refreshOnboardingState();
  }, [refreshOnboardingState]);

  // Trigger the job processor API to process pending jobs (works with Autoscale)
  const triggerJobProcessing = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs/process', { method: 'POST', cache: 'no-store' });
      const result = await res.json();
      console.log('[WORKSPACE] Job processor result:', result);
      return result.processed;
    } catch (error) {
      console.error('[WORKSPACE] Failed to trigger job processor:', error);
      return false;
    }
  }, []);

  const pollJobStatus = useCallback((jobId: string, onComplete: (result: any) => void) => {
    const poll = async () => {
      try {
        // Trigger job processing on each poll (ensures jobs get processed in Autoscale)
        await triggerJobProcessing();
        
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
        const job = await res.json();
        
        if (job.status === 'completed') {
          setPendingItems(prev => prev.filter(item => item.id !== jobId));
          onComplete(job.result);
          setActiveJobs(prev => prev.filter(id => id !== jobId));
          showSuccess(`Content generated successfully!`);
        } else if (job.status === 'failed') {
          console.error('[WORKSPACE] Job failed:', job.error);
          setPendingItems(prev => prev.filter(item => item.id !== jobId));
          setActiveJobs(prev => prev.filter(id => id !== jobId));
          const errorMessage = job.error || 'Generation failed';
          showError(`Generation failed: ${errorMessage.substring(0, 100)}`);
          setFailedJobs(prev => [...prev, {
            id: jobId,
            type: job.type || 'unknown',
            title: job.payload?.title || 'Content',
            error: errorMessage,
            payload: job.payload
          }]);
        } else {
          const nextStatus = job.status === 'processing' ? 'processing' : 'queued';
          setPendingItems(prev => prev.map(item => item.id === jobId ? {
            ...item,
            meta: { ...item.meta, status: nextStatus }
          } : item));
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('[WORKSPACE] Error polling job:', error);
        setTimeout(poll, 5000);
      }
    };
    poll();
  }, [showError, showSuccess, triggerJobProcessing]);

  const addPendingItem = useCallback((jobId: string, type: CanvasItem['type'], payload?: Record<string, unknown>) => {
    setPendingItems(prev => {
      if (prev.some(item => item.id === jobId)) return prev;
      const title = typeof payload?.title === 'string'
        ? payload.title
        : type === 'video' ? 'Generating Video' : 'Generating Image';
      const meta = {
        aspectRatio: typeof payload?.aspectRatio === 'string' ? payload.aspectRatio : undefined,
        resolution: typeof payload?.resolution === 'string' ? payload.resolution : undefined,
        caption: typeof payload?.caption === 'string' ? payload.caption : undefined,
        hook: typeof payload?.hook === 'string' ? payload.hook : undefined,
        archetype: typeof payload?.archetype === 'string' ? payload.archetype : undefined,
        status: 'queued' as const
      };
      return [...prev, { id: jobId, type, content: '', title, meta }];
    });
  }, []);

  useEffect(() => {
    if (activeBoardId) {
      fetch(`/api/jobs?boardId=${activeBoardId}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(async (jobs) => {
          const pendingJobs = jobs.filter((j: any) => j.status === 'pending' || j.status === 'processing');
          if (pendingJobs.length > 0) {
            setActiveJobs(pendingJobs.map((j: any) => j.id));
            pendingJobs.forEach((job: any) => {
              const itemType = job.type === 'generate_video' ? 'video' : 'image';
              addPendingItem(job.id, itemType, {
                title: itemType === 'video' ? 'Generating Video' : 'Generating Image'
              });
            });
            // Immediately trigger job processing for any pending jobs
            await triggerJobProcessing();
            pendingJobs.forEach((job: any) => {
              pollJobStatus(job.id, async () => {
                await loadBoardDetails(activeBoardId);
                getUserUsageAction().then(setUsage);
              });
            });
          }
        })
        .catch(console.error);
    }
  }, [activeBoardId, pollJobStatus, loadBoardDetails, triggerJobProcessing, addPendingItem]);

  const handleAddAsset = async (asset: ProjectAsset) => {
    if (!activeBoardId) return;

    // Persist asset first
    const savedAsset = await saveAsset(activeBoardId, asset);
    const assetWithId = { ...asset, id: savedAsset.id, status: savedAsset.status as 'digesting' | 'ready' };

    // Optimistic update
    updateActiveBoard(b => ({ ...b, assets: [...b.assets, assetWithId] }));
    refreshOnboardingState();

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
    if (asset.type === 'image') {
      autoTagAssetAction(savedAsset.id)
        .then(() => loadBoardDetails(activeBoardId))
        .catch((error) => console.error('[AUTO-TAG] Failed:', error));
    }
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

  const handleToggleFavorite = async (itemId: string, nextState: boolean) => {
    try {
      const result = await toggleFavoriteAction(itemId);
      if (result.success) {
        updateActiveBoard(b => ({
          ...b,
          items: b.items.map(item =>
            item.id === itemId ? { ...item, isFavorite: result.isFavorite ?? nextState } : item
          )
        }));
      } else {
        showError('Failed to update favorite.');
      }
    } catch (error) {
      showError('Failed to update favorite.');
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
          id: gi.id,
          type: gi.type,
          content: gi.content,
          carouselUrls: gi.carouselUrls,
          title: gi.title,
          description: gi.description,
          meta: gi.metadata,
          x: gi.x,
          y: gi.y,
          isFavorite: gi.isFavorite
        })),
        assets: updated.assets as ProjectAsset[],
        messages: updated.messages as ChatMessage[],
        brandIdentity: updated.brandIdentity as BrandIdentity | null,
        avatarIdentity: updated.avatarIdentity as AvatarIdentity | null,
        products: (updated.products || []).map((p: any) => ({
          ...p,
          assets: p.productAssets as ProductAsset[]
        })),
        createdAt: updated.createdAt ? new Date(updated.createdAt).getTime() : Date.now()
      };
      setActiveBoard(mappedBoard);
    }
    refreshOnboardingState();
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
          id: gi.id,
          type: gi.type,
          content: gi.content,
          carouselUrls: gi.carouselUrls,
          title: gi.title,
          description: gi.description,
          meta: gi.metadata,
          x: gi.x,
          y: gi.y,
          isFavorite: gi.isFavorite
        })),
        assets: updated.assets as ProjectAsset[],
        messages: updated.messages as ChatMessage[],
        brandIdentity: updated.brandIdentity as BrandIdentity | null,
        avatarIdentity: updated.avatarIdentity as AvatarIdentity | null,
        products: (updated.products || []).map((p: any) => ({
          ...p,
          assets: p.productAssets as ProductAsset[]
        })),
        createdAt: updated.createdAt ? new Date(updated.createdAt).getTime() : Date.now()
      };
      setActiveBoard(mappedBoard);
    }
    refreshOnboardingState();
  };

  const handleOpenProductModal = useCallback((productId?: string) => {
    setEditingProductId(productId || null);
    setShowProductModal(true);
  }, []);

  const handleOpenLinkModal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-link-modal'));
    }
  }, []);

  const handleOpenChat = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-chat'));
    }
  }, []);

  const onboardingSteps: CoachStep[] = React.useMemo(() => {
    if (!onboardingState || onboardingState.completed || onboardingState.dismissed) return [];
    const isSkipped = (id: string) => skippedOnboardingSteps.includes(id);
    const isComplete = (id: string) => {
      switch (id) {
        case 'website-link':
          return onboardingState.required.websiteLink;
        case 'campaign':
          return onboardingState.required.campaignCreated;
        case 'logo':
          return onboardingState.optional.logo;
        case 'avatar':
          return onboardingState.optional.avatar;
        case 'product':
          return onboardingState.optional.product;
        case 'sources':
          return onboardingState.optional.sources;
        case 'boards':
          return onboardingState.optional.multipleBoards;
        default:
          return false;
      }
    };

    const steps: CoachStep[] = [
      {
        id: 'website-link',
        title: 'Add your website',
        description: 'We scan your site to build instant brand context.',
        targetSelector: '[data-tour="add-link"]',
        actionLabel: 'Add Link',
        onAction: handleOpenLinkModal
      },
      {
        id: 'logo',
        title: 'Upload your logo',
        description: 'Optional, but it improves visual consistency.',
        targetSelector: '[data-tour="upload-logo"]',
        optional: true
      },
      {
        id: 'avatar',
        title: 'Add an avatar',
        description: 'Optional spokesperson or founder for on-camera ads.',
        targetSelector: '[data-tour="add-avatar"]',
        optional: true
      },
      {
        id: 'product',
        title: 'Add a product',
        description: 'Optional, but best for product-led campaigns.',
        targetSelector: '[data-tour="add-product"]',
        optional: true,
        actionLabel: 'Add Product',
        onAction: () => handleOpenProductModal()
      },
      {
        id: 'sources',
        title: 'Upload sources or docs',
        description: 'Optional PDFs or files to ground copy.',
        targetSelector: '[data-tour="upload-sources"]',
        optional: true
      },
      {
        id: 'boards',
        title: 'Manage boards',
        description: 'Optional. Keep multiple campaigns organized.',
        targetSelector: '[data-tour="boards"]',
        optional: true,
        actionLabel: 'Boards',
        onAction: () => setShowBoardListModal(true)
      },
      {
        id: 'campaign',
        title: 'Create your first campaign',
        description: 'Pick any chip or type your own request to generate assets.',
        targetSelector: '[data-tour="chat-input"], [data-tour="chat-chips"]',
        actionLabel: 'Open Chat',
        onAction: handleOpenChat
      }
    ];

    return steps.filter(step => {
      if (isComplete(step.id)) return false;
      if (step.optional && isSkipped(step.id)) return false;
      return true;
    });
  }, [handleOpenChat, handleOpenLinkModal, handleOpenProductModal, onboardingState, skippedOnboardingSteps]);

  const activeOnboardingStepIndex = activeOnboardingStepId
    ? onboardingSteps.findIndex(step => step.id === activeOnboardingStepId)
    : 0;
  const resolvedOnboardingStepIndex = activeOnboardingStepIndex === -1 ? 0 : activeOnboardingStepIndex;
  const activeOnboardingStep = onboardingSteps[resolvedOnboardingStepIndex] || null;
  const isActiveStepComplete = React.useMemo(() => {
    if (!activeOnboardingStep || !onboardingState) return false;
    const { required, optional } = onboardingState;
    switch (activeOnboardingStep.id) {
      case 'website-link':
        return required.websiteLink;
      case 'campaign':
        return required.campaignCreated;
      case 'logo':
        return optional.logo;
      case 'avatar':
        return optional.avatar;
      case 'product':
        return optional.product;
      case 'sources':
        return optional.sources;
      case 'boards':
        return optional.multipleBoards;
      default:
        return false;
    }
  }, [activeOnboardingStep, onboardingState]);

  const handleSkipOnboardingStep = useCallback(() => {
    if (!activeOnboardingStep?.optional) return;
    setSkippedOnboardingSteps(prev => [...prev, activeOnboardingStep.id]);
    setActiveOnboardingStepId((currentId) => {
      if (!currentId) return null;
      const index = onboardingSteps.findIndex(step => step.id === currentId);
      const nextStep = onboardingSteps[index + 1];
      return nextStep ? nextStep.id : null;
    });
  }, [activeOnboardingStep, onboardingSteps]);

  const handleAdvanceOnboardingStep = useCallback(() => {
    setActiveOnboardingStepId((currentId) => {
      if (!currentId) {
        return onboardingSteps[0]?.id ?? null;
      }
      const index = onboardingSteps.findIndex(step => step.id === currentId);
      const nextStep = onboardingSteps[index + 1];
      return nextStep ? nextStep.id : currentId;
    });
  }, [onboardingSteps]);

  const handleDismissOnboarding = useCallback(() => {
    dismissOnboardingAction()
      .then(() => refreshOnboardingState())
      .catch((error) => console.error('[ONBOARDING] Failed to snooze:', error))
      .finally(() => setShowOnboardingGuide(false));
  }, [refreshOnboardingState]);

  const handleSkipOnboarding = useCallback(() => {
    completeOnboardingAction()
      .then(() => refreshOnboardingState())
      .catch((error) => console.error('[ONBOARDING] Failed to skip:', error))
      .finally(() => setShowOnboardingGuide(false));
  }, [refreshOnboardingState]);

  const anyModalOpen = showBrandModal || showAvatarModal || showProductModal || showNewBoardModal || showBoardListModal || selectedItem !== null;

  useEffect(() => {
    if (!onboardingState) return;
    if (onboardingState.dismissed && showOnboardingGuide) {
      setShowOnboardingGuide(false);
      return;
    }
    if (!showOnboardingGuide && !onboardingState.completed && !onboardingState.dismissed) {
      setShowOnboardingGuide(true);
    }
  }, [onboardingState, showOnboardingGuide]);

  useEffect(() => {
    if (!showOnboardingGuide) return;
    if (onboardingSteps.length === 0) {
      setShowOnboardingGuide(false);
      setActiveOnboardingStepId(null);
      return;
    }
    if (!activeOnboardingStepId || activeOnboardingStepIndex === -1) {
      setActiveOnboardingStepId(onboardingSteps[0].id);
    }
  }, [activeOnboardingStepId, activeOnboardingStepIndex, onboardingSteps, showOnboardingGuide]);

  useEffect(() => {
    if (!showOnboardingGuide || !activeOnboardingStep) return;
    const sidebarStepIds = new Set(['website-link', 'logo', 'avatar', 'product', 'sources']);
    if (sidebarStepIds.has(activeOnboardingStep.id) && window.innerWidth < 768) {
      setSidebarOpen(true);
    }
    if (activeOnboardingStep.id === 'campaign') {
      handleOpenChat();
    }
  }, [activeOnboardingStep, handleOpenChat, showOnboardingGuide]);

  const handleSaveProduct = async (product: Omit<Product, 'id' | 'boardId' | 'assets' | 'createdAt'>, assignments: Omit<ProductAsset, 'id' | 'productId' | 'createdAt'>[]) => {
    if (!activeBoardId) return;

    let productId = editingProductId;
    if (productId) {
      await updateProductAction(productId, product);
    } else {
      const created = await createProductAction(activeBoardId, product);
      productId = created.id;
    }

    if (productId) {
      await setProductAssetsAction(productId, assignments);
    }

    await loadBoardDetails(activeBoardId);
    setShowProductModal(false);
    setEditingProductId(null);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadProductImages = async (files: File[]) => {
    if (!activeBoardId) return [];
    const uploadedAssets: ProjectAsset[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await readFileAsBase64(file);
      const newAsset: ProjectAsset = {
        id: Date.now().toString(),
        type: 'image',
        name: file.name,
        content: base64,
        mimeType: file.type,
      };

      const saved = await saveAsset(activeBoardId, newAsset);
      const assetWithId: ProjectAsset = {
        ...newAsset,
        id: saved.id,
        content: saved.content || newAsset.content,
        storageKey: saved.storageKey,
        status: saved.status as 'digesting' | 'ready'
      };

      updateActiveBoard((b) => ({ ...b, assets: [...b.assets, assetWithId] }));
      uploadedAssets.push(assetWithId);

      autoTagAssetAction(saved.id)
        .then(() => loadBoardDetails(activeBoardId))
        .catch((error) => console.error('[AUTO-TAG] Failed:', error));
    }

    return uploadedAssets;
  };

  const handleAnalyzeProductImages = async (assetIds: string[]) => {
    if (!activeBoardId) return null;
    try {
      const result = await analyzeProductImagesAction(activeBoardId, assetIds);
      if (!result) return null;
      return {
        analysis: result.analysis,
        error: result.error,
        traceId: result.traceId
      };
    } catch (error) {
      console.error('[PRODUCT ANALYSIS] Failed:', error);
      return null;
    }
  };

  const handleDeleteProduct = async () => {
    if (!activeBoardId || !editingProductId) return;

    await deleteProductAction(editingProductId);
    await loadBoardDetails(activeBoardId);
    setShowProductModal(false);
    setEditingProductId(null);
  };

  // Handler for dismissing research response buttons
  const handleDismissResearch = (messageId: string) => {
    if (!activeBoard) return;
    updateActiveBoard(b => ({
      ...b,
      messages: b.messages.map(msg => 
        msg.id === messageId ? { ...msg, researchDismissed: true } : msg
      )
    }));
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
      const response = await chatWithMarketingAgent(
        history,
        text,
        readyAssets,
        activeBoard.brandIdentity,
        activeBoard.avatarIdentity,
        activeBoard.products || []
      ) as any;

      const pendingImageCount = pendingItems.filter(item => item.type === 'image').length;
      const pendingVideoCount = pendingItems.filter(item => item.type === 'video').length;
      let remainingImages = getRemainingImages(usage.imagesGenerated + pendingImageCount);
      let remainingVideos = getRemainingVideos(usage.videosGenerated + pendingVideoCount);

      const modelParts = response.candidates[0].content.parts || [];
      let responseText = response.text || "";
      let newItems: CanvasItem[] = [];
      const packQueue: any[] = [];

      for (const part of modelParts) {
        if (part.functionCall) {
          const fc = part.functionCall as FunctionCall;
          if (fc.name === 'generate_image') {
            setProcessingStatus(`Queuing image generation...`);
            const productId = typeof fc.args['productId'] === 'string' ? fc.args['productId'] : undefined;
            const traceId = crypto.randomUUID();
            if (remainingImages <= 0) {
              const message = `Image quota reached (${usage.imagesGenerated}/${IMAGE_LIMIT}).`;
              showError(message);
              continue;
            }
            const res = await fetch('/api/jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boardId: activeBoardId,
                type: 'generate_image',
                payload: {
                  prompt: fc.args['prompt'],
                  aspectRatio: fc.args['aspectRatio'] || '1:1',
                  productId,
                  traceId
                }
              })
            });
            const job = await res.json().catch(() => null);
            if (!res.ok || !job?.id) {
              const message = job?.error || 'Image generation request failed.';
              showError(message);
              continue;
            }
            if (job.id) {
              setActiveJobs(prev => [...prev, job.id]);
              addPendingItem(job.id, 'image', {
                title: fc.args['prompt'] ? 'Queued Image' : 'Generating Image',
                aspectRatio: fc.args['aspectRatio'] || '1:1'
              });
              remainingImages = Math.max(0, remainingImages - 1);
              pollJobStatus(job.id, async () => {
                await loadBoardDetails(activeBoardId);
                getUserUsageAction().then(setUsage);
              });
              responseText = `🎨 Image generation in progress. This will complete even if you leave the page.`;
            }
          }
          if (fc.name === 'generate_video') {
            setProcessingStatus(`Queuing video generation...`);
            const ingredientAssetIds = Array.isArray(fc.args['ingredientAssetIds']) ? fc.args['ingredientAssetIds'] : undefined;
            const productId = typeof fc.args['productId'] === 'string' ? fc.args['productId'] : undefined;
            const traceId = crypto.randomUUID();
            if (remainingVideos <= 0) {
              const message = `Video quota reached (${usage.videosGenerated}/${VIDEO_LIMIT}).`;
              showError(message);
              continue;
            }
            const res = await fetch('/api/jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boardId: activeBoardId,
                type: 'generate_video',
                payload: {
                  prompt: fc.args['prompt'],
                  aspectRatio: fc.args['aspectRatio'] || '16:9',
                  resolution: '720p',
                  productId,
                  ingredientAssetIds,
                  traceId
                }
              })
            });
            const job = await res.json().catch(() => null);
            if (!res.ok || !job?.id) {
              const message = job?.error || 'Video generation request failed.';
              showError(message);
              continue;
            }
            if (job.id) {
              setActiveJobs(prev => [...prev, job.id]);
              addPendingItem(job.id, 'video', {
                title: fc.args['prompt'] ? 'Queued Video' : 'Generating Video',
                aspectRatio: fc.args['aspectRatio'] || '16:9',
                resolution: '720p'
              });
              remainingVideos = Math.max(0, remainingVideos - 1);
              pollJobStatus(job.id, async () => {
                await loadBoardDetails(activeBoardId);
                getUserUsageAction().then(setUsage);
              });
              responseText = `🎬 Video generation in progress (takes 1-2 min). This will complete even if you leave the page.`;
            }
          }
          if (fc.name === 'generate_campaign_pack') packQueue.push(fc.args);
          
          if (fc.name === 'discover_trends') {
            setProcessingStatus(`Searching for latest trends...`);
            const trendResult = await discoverTrends(
              fc.args['industry'] as string,
              fc.args['targetAudience'] as string | undefined
            );
            responseText = trendResult.text;
            if (trendResult.sources && trendResult.sources.length > 0) {
              responseText += `\n\n📚 **Sources:**\n${trendResult.sources.slice(0, 5).map(s => `- ${s}`).join('\n')}`;
            }
          }
          
          if (fc.name === 'web_research') {
            setProcessingStatus(`Researching...`);
            const researchResult = await researchWithGoogleSearch(
              fc.args['query'] as string,
              fc.args['context'] as string | undefined
            );
            responseText = researchResult.text;
            if (researchResult.sources && researchResult.sources.length > 0) {
              responseText += `\n\n📚 **Sources:**\n${researchResult.sources.slice(0, 5).map(s => `- ${s}`).join('\n')}`;
            }
          }
        }
      }

      if (packQueue.length > 0) {
        let backgroundCount = 0;
        let immediateCount = 0;
        let queuedCount = 0;
        let skippedCount = 0;
        const skippedReasons: string[] = [];

        const selectProductForPack = (productId?: string) => {
          if (!activeBoard.products || activeBoard.products.length === 0) return undefined;
          if (productId) {
            return activeBoard.products.find(p => p.id === productId);
          }
          if (activeBoard.products.length === 1) return activeBoard.products[0];
          return undefined;
        };

        const ensureLaunchPackItems = (items: any[], requestText: string, productId?: string) => {
          if (!/3[- ]phase launch pack|product launch/i.test(requestText)) {
            return items;
          }

          const hasTeaser = items.some(i => i.type === 'image' && /teaser/i.test(i.title || ''));
          const hasReveal = items.some(i => i.type === 'video' && /reveal/i.test(i.title || ''));
          const hasFeatures = items.some(i => i.type === 'carousel' && /feature/i.test(i.title || ''));
          const product = selectProductForPack(productId);
          const productName = product?.name || 'the product';
          const features = (product?.keyFeatures || []).slice(0, 3);

          const fallbackItems = [...items];

          if (!hasTeaser) {
            fallbackItems.push({
              type: 'image',
              title: 'Phase 1: Teaser',
              archetype: 'Teaser',
              hook: 'Something powerful is coming.',
              caption: `Coming soon: ${productName}.`,
              aspectRatio: '1:1',
              productId,
              visual_prompt: `A minimal teaser image. Close-up silhouette of ${productName}, dramatic lighting, high contrast, brand colors, shallow depth of field, intrigue.`
            });
          }

          if (!hasReveal) {
            fallbackItems.push({
              type: 'video',
              title: 'Phase 2: Big Reveal',
              archetype: 'Reveal',
              hook: `Meet ${productName}.`,
              caption: `The reveal: ${productName} is here.`,
              aspectRatio: '16:9',
              productId,
              visual_prompt: `Cinematic product reveal. Slow dolly-in on ${productName} on a pedestal, soft volumetric lighting, subtle rotation, clean studio background, premium vibe.`
            });
          }

          if (!hasFeatures) {
            const slidePrompts = [
              `Hero shot of ${productName} with bold headline: "Why ${productName}." Clean backdrop, brand colors.`,
              `Feature spotlight: ${features[0] || 'Key Benefit 1'}. Visual callout, clean layout, product in focus.`,
              `Feature spotlight: ${features[1] || 'Key Benefit 2'}. Emphasize outcome, premium aesthetic.`
            ];

            fallbackItems.push({
              type: 'carousel',
              title: 'Phase 3: Features Highlight',
              archetype: 'Feature Spotlight',
              hook: `What makes ${productName} different.`,
              caption: `Top benefits of ${productName}.`,
              aspectRatio: '1:1',
              productId,
              carousel_prompts: slidePrompts
            });
          }

          return fallbackItems;
        };

        for (const pack of packQueue) {
          const normalizedItems = ensureLaunchPackItems(pack.items || [], text, pack.productId);

          for (const item of normalizedItems) {
            const traceId = crypto.randomUUID();
            if (item.caption || item.hook || item.title) {
              try {
                const validated = await validateCopyConsistency(
                  { title: item.title, hook: item.hook, caption: item.caption },
                  {
                    brandIdentity: activeBoard.brandIdentity,
                    avatarIdentity: activeBoard.avatarIdentity,
                    products: activeBoard.products || [],
                    productId: item.productId,
                    traceId
                  }
                );
                if (validated.changed) {
                  item.title = validated.title || item.title;
                  item.hook = validated.hook || item.hook;
                  item.caption = validated.caption || item.caption;
                }
                if (validated.issues.length > 0) {
                  console.warn(`[COPY VALIDATOR ${traceId}] Issues detected:`, validated.issues);
                }
              } catch (error) {
                console.warn(`[COPY VALIDATOR ${traceId}] Failed to validate copy`, error);
              }
            }
            setProcessingStatus(`Queuing ${item.title}...`);
            if (item.type === 'carousel') {
              // TODO: Add carousel support to job runner
              // For now, run synchronously with fallback
              try {
                const prompts = Array.isArray(item.carousel_prompts) ? item.carousel_prompts : [];
                const safePrompts = prompts.length > 0 ? prompts : [`Hero slide for ${item.title || 'product'} with bold headline.`];
                const slidesToGenerate = Math.min(safePrompts.length, remainingImages);
                if (slidesToGenerate <= 0) {
                  skippedCount++;
                  skippedReasons.push('Not enough image quota for carousel.');
                  continue;
                }
                if (slidesToGenerate < safePrompts.length) {
                  skippedReasons.push(`Carousel trimmed to ${slidesToGenerate} slide(s) due to image quota.`);
                }
                const promptsToUse = safePrompts.slice(0, slidesToGenerate);
                const slides: string[] = [];
                for (const p of promptsToUse) {
                  const compiled = buildIdentityConstraints({
                    basePrompt: p,
                    brandIdentity: activeBoard.brandIdentity,
                    avatarIdentity: activeBoard.avatarIdentity,
                    products: activeBoard.products || [],
                    productId: item.productId
                  });
                  const slide = await generateMarketingImage(compiled.prompt, item.aspectRatio || AspectRatio.SQUARE);
                  slides.push(slide);
                }
                const carouselItem: CanvasItem = { id: Math.random().toString(), type: 'carousel', content: slides[0], carouselUrls: slides, title: item.title, meta: { caption: item.caption, hook: item.hook, archetype: item.archetype } };
                newItems.push(carouselItem);
                await saveGeneratedItemAction(activeBoardId, carouselItem);
                getUserUsageAction().then(setUsage);
                immediateCount++;
                queuedCount++;
                remainingImages = Math.max(0, remainingImages - slidesToGenerate);
              } catch (error) {
                console.error('[WORKSPACE] Carousel generation failed:', error);
              }
            } else {
              // Use background jobs for images and videos in packs
              if (item.type === 'video') {
                if (remainingVideos <= 0) {
                  skippedCount++;
                  skippedReasons.push('Not enough video quota.');
                  continue;
                }
              } else if (remainingImages <= 0) {
                skippedCount++;
                skippedReasons.push('Not enough image quota.');
                continue;
              }

              const jobType = item.type === 'video' ? 'generate_video' : 'generate_image';
              const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  boardId: activeBoardId,
                  type: jobType,
                  payload: { 
                    prompt: item.visual_prompt, 
                    aspectRatio: item.aspectRatio || (item.type === 'video' ? '16:9' : '1:1'),
                    resolution: '720p',
                    title: item.title,
                    caption: item.caption,
                    hook: item.hook,
                    archetype: item.archetype,
                    productId: item.productId,
                    ingredientAssetIds: item.ingredientAssetIds,
                    traceId
                  }
                })
              });
              const job = await res.json().catch(() => null);
              if (!res.ok || !job?.id) {
                const message = job?.error || 'Generation request failed.';
                if (job?.code === 'QUOTA_EXCEEDED') {
                  skippedCount++;
                  skippedReasons.push(message);
                } else {
                  showError(message);
                }
                continue;
              }
              if (job.id) {
                backgroundCount++;
                queuedCount++;
                setActiveJobs(prev => [...prev, job.id]);
                addPendingItem(job.id, item.type === 'video' ? 'video' : 'image', {
                  title: item.title,
                  aspectRatio: item.aspectRatio || (item.type === 'video' ? '16:9' : '1:1'),
                  resolution: item.type === 'video' ? '720p' : undefined,
                  caption: item.caption,
                  hook: item.hook,
                  archetype: item.archetype
                });
                if (item.type === 'video') {
                  remainingVideos = Math.max(0, remainingVideos - 1);
                } else {
                  remainingImages = Math.max(0, remainingImages - 1);
                }
                pollJobStatus(job.id, async () => {
                  await loadBoardDetails(activeBoardId);
                  getUserUsageAction().then(setUsage);
                });
              }
            }
          }
        }
        if (queuedCount > 0) {
          if (backgroundCount > 0 && immediateCount > 0) {
            responseText = `📦 Campaign pack queued! ${queuedCount} items total: ${immediateCount} created now, ${backgroundCount} generating in the background.`;
          } else if (backgroundCount > 0) {
            responseText = `📦 Campaign pack queued! ${backgroundCount} items are generating in the background.`;
          } else if (immediateCount > 0) {
            responseText = `📦 Campaign pack ready! ${immediateCount} items created.`;
          }
          if (skippedCount > 0) {
            responseText += ` Skipped ${skippedCount} item${skippedCount > 1 ? 's' : ''} due to quota.`;
          }
        } else if (skippedCount > 0) {
          responseText = `⚠️ No items generated. ${skippedCount} item${skippedCount > 1 ? 's were' : ' was'} skipped due to quota.`;
        }
        if (skippedReasons.length > 0) {
          skippedReasons.slice(0, 2).forEach((reason) => showToast(reason, 'info'));
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
      refreshOnboardingState();

    } catch (error: any) {
      console.error("Chat error:", error);
      const errMsg = error?.message || "Something went wrong. Please try again.";
      showError(errMsg.length > 100 ? errMsg.substring(0, 100) + '...' : errMsg);
      updateActiveBoard(b => ({ ...b, messages: [...b.messages, { id: Date.now().toString(), role: 'model', text: `Error: ${errMsg}` }] }));
      await saveMessageAction(activeBoardId, 'model', `Error: ${errMsg}`);
    } finally { setIsProcessing(false); setProcessingStatus(""); }
  };

  useEffect(() => {
    if (!activeBoardId) return;
    if (activeJobs.length === 0) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs?boardId=${activeBoardId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const jobs = await res.json();
        if (cancelled) return;
        const pendingJobs = jobs.filter((j: any) => j.status === 'pending' || j.status === 'processing');
        if (pendingJobs.length > 0) {
          setActiveJobs(pendingJobs.map((j: any) => j.id));
          const pendingIds = new Set(pendingJobs.map((j: any) => j.id));
          setPendingItems(prev => prev
            .filter(item => pendingIds.has(item.id))
            .map(item => {
              const match = pendingJobs.find((j: any) => j.id === item.id);
              if (!match) return item;
              const nextStatus = match.status === 'processing' ? 'processing' : 'queued';
              return { ...item, meta: { ...item.meta, status: nextStatus } };
            })
          );
          await loadBoardDetails(activeBoardId);
          getUserUsageAction().then(setUsage);
        } else if (activeJobs.length > 0) {
          setActiveJobs([]);
          setPendingItems([]);
        }
      } catch (error) {
        console.warn('[WORKSPACE] Job sync failed', error);
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeBoardId, activeJobs.length, loadBoardDetails]);

  const handleRetryJob = async (failedJob: FailedJob) => {
    if (!activeBoardId) return;
    
    setFailedJobs(prev => prev.filter(j => j.id !== failedJob.id));
    showToast('Retrying generation...', 'info');
    
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: activeBoardId,
          type: failedJob.type,
          payload: failedJob.payload
        })
      });
      
      if (!res.ok) throw new Error('Failed to create retry job');
      
      const job = await res.json();
      setActiveJobs(prev => [...prev, job.id]);
      addPendingItem(job.id, failedJob.type === 'generate_video' ? 'video' : 'image', failedJob.payload);
      pollJobStatus(job.id, async () => {
        await loadBoardDetails(activeBoardId);
        getUserUsageAction().then(setUsage);
      });
    } catch (error: any) {
      showError('Failed to retry. Please try again.');
      setFailedJobs(prev => [...prev, failedJob]);
    }
  };

  const handleDismissFailedJob = (jobId: string) => {
    setFailedJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleCreateBoard = async (name: string, profileImport: ProfileImportSelection) => {
    const newBoard = await createBoard(name, profileImport);
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

  if (!activeBoard) return <WorkspaceSkeleton />;

  const editingProduct = activeBoard.products?.find(p => p.id === editingProductId) || null;

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] md:h-screen w-full font-sans text-neo-black relative md:overflow-hidden bg-gray-50">
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
          <button onClick={() => setShowBoardListModal(true)} data-tour="boards" className="p-2 bg-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none transition-all">📋</button>
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
          assets={activeBoard.assets} brandIdentity={activeBoard.brandIdentity} avatarIdentity={activeBoard.avatarIdentity} products={activeBoard.products}
          onAddAsset={handleAddAsset} onDeleteAsset={handleDeleteAsset} onEditBrand={() => setShowBrandModal(true)} onEditAvatar={() => setShowAvatarModal(true)}
          onOpenProductModal={handleOpenProductModal}
          onStartCapture={() => { setIsCameraActive(true); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          onExitApp={onExitApp} usageStats={usage}
          boardId={activeBoardId}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-y-auto p-4 md:p-12 pb-32 md:pt-0">
        {isOnboardingLoading && <OnboardingPanelSkeleton />}
        {!isOnboardingLoading && onboardingState && !onboardingState.completed && !onboardingState.dismissed && activeOnboardingStep?.id !== 'campaign' && (
          <OnboardingPanel
            state={onboardingState}
            onOpenLinkModal={handleOpenLinkModal}
            onOpenChat={handleOpenChat}
            onOpenBoards={() => setShowBoardListModal(true)}
            onOpenProduct={() => handleOpenProductModal()}
            onSnooze={handleDismissOnboarding}
            onSkipTutorial={handleSkipOnboarding}
          />
        )}
        {/* Desktop Header - Hidden on mobile */}
        <header className="hidden md:flex justify-between items-center mb-12">
          <h2 className="text-5xl font-display font-black tracking-tight">{activeBoard.name}</h2>
          <div className="flex gap-3">
            <button onClick={() => setShowBoardListModal(true)} data-tour="boards" className="bg-white border-4 border-black shadow-neo px-6 py-2 font-black uppercase text-sm">Boards</button>
            <button onClick={() => setShowNewBoardModal(true)} className="bg-neo-black text-white border-4 border-black shadow-neo px-6 py-2 font-black uppercase text-sm">+ New</button>
          </div>
        </header>

        {/* Canvas Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-32">
          {activeBoard.items.length === 0 && pendingItems.length === 0 && !isProcessing && (
            <div className="col-span-full py-16 md:py-32 text-center opacity-20">
              <p className="text-6xl md:text-9xl mb-4 md:mb-6">🎨</p>
              <p className="font-display font-black text-xl md:text-3xl uppercase">Canvas Empty</p>
              <p className="text-sm mt-2 font-medium">Use the agent to generate your first campaign</p>
            </div>
          )}
          {[...pendingItems, ...activeBoard.items].map(item => (
            <CanvasItemCard
              key={item.id}
              item={item}
              onExpand={setSelectedItem}
              onDelete={handleDeleteItem}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      </div>

      <ChatInterface messages={activeBoard.messages} onSendMessage={handleSendMessage} onDismissResearch={handleDismissResearch} isProcessing={isProcessing} processingStatus={processingStatus} hasAssets={activeBoard.assets.length > 0} />
      
      {activeJobs.length > 0 && (
        <div className="fixed bottom-4 right-4 md:bottom-28 md:right-8 z-30">
          <div className="bg-neo-yellow border-2 md:border-4 border-black shadow-neo px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2 rounded-full md:rounded-none">
            <span className="animate-spin text-sm md:text-base">⚙️</span>
            <span className="font-bold text-xs md:text-sm">{activeJobs.length} job{activeJobs.length > 1 ? 's' : ''} running</span>
            <button
              onClick={async () => {
                if (confirm('Clear all stuck jobs? This will cancel any pending generations.')) {
                  try {
                    await fetch(`/api/jobs?boardId=${activeBoardId}&action=clear-stuck`, { method: 'DELETE' });
                    setActiveJobs([]);
                    showToast('Stuck jobs cleared', 'info');
                  } catch (e) {
                    console.error('Failed to clear jobs:', e);
                  }
                }
              }}
              className="ml-1 text-xs font-bold bg-white/50 hover:bg-white px-2 py-0.5 rounded border border-black/30"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      {failedJobs.length > 0 && (
        <div className="fixed bottom-20 right-4 md:bottom-40 md:right-8 z-30 max-w-xs">
          <div className="bg-[#FF6B6B] border-2 md:border-4 border-black shadow-neo p-3 rounded-lg md:rounded-none">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white">{failedJobs.length} failed</span>
              <button 
                onClick={() => setFailedJobs([])}
                className="text-white hover:text-black text-lg font-bold"
                aria-label="Dismiss all"
              >×</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {failedJobs.slice(0, 3).map(job => (
                <div key={job.id} className="bg-white border-2 border-black p-2 text-xs">
                  <p className="font-bold truncate">{job.title}</p>
                  <p className="text-gray-600 truncate">{job.error}</p>
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => handleRetryJob(job)}
                      className="bg-neo-lime border border-black px-2 py-0.5 font-bold hover:bg-lime-300"
                    >Retry</button>
                    <button 
                      onClick={() => handleDismissFailedJob(job.id)}
                      className="text-gray-500 hover:text-black"
                    >Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {isAnalyzingLogo && <BrandAnalysisSkeleton />}
      {showBrandModal && pendingScannedIdentity && <BrandIdentityModal initialIdentity={pendingScannedIdentity} logoUrl={pendingLogoAsset?.content || ""} onSave={handleSaveIdentity} onClose={() => setShowBrandModal(false)} />}
      {showAvatarModal && pendingScannedAvatar && <AvatarAnalysisModal initialIdentity={pendingScannedAvatar} onSave={handleSaveAvatar} onClose={() => setShowAvatarModal(false)} />}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          assets={activeBoard.assets}
          onUploadProductImages={handleUploadProductImages}
          onAnalyzeProductImages={handleAnalyzeProductImages}
          onSave={handleSaveProduct}
          onDelete={editingProduct ? handleDeleteProduct : undefined}
          onClose={() => {
            setShowProductModal(false);
            setEditingProductId(null);
          }}
        />
      )}
      {showNewBoardModal && <NewBoardModal onCreate={handleCreateBoard} onCancel={() => setShowNewBoardModal(false)} />}
      {showBoardListModal && <BoardListModal boards={boards} activeBoardId={activeBoardId} onSwitch={setActiveBoardId} onClose={() => setShowBoardListModal(false)} onCreateNew={() => setShowNewBoardModal(true)} onRename={handleRenameBoard} onDelete={handleDeleteBoard} />}
      {selectedItem && <LightboxModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {showOnboardingGuide && activeOnboardingStep && onboardingState && !onboardingState.dismissed && (
        <OnboardingCoach
          step={activeOnboardingStep}
          stepIndex={resolvedOnboardingStepIndex}
          totalSteps={onboardingSteps.length}
          isStepComplete={isActiveStepComplete}
          onNext={handleAdvanceOnboardingStep}
          onSkip={handleSkipOnboardingStep}
          onSkipAll={handleSkipOnboarding}
          onSnooze={handleDismissOnboarding}
          onDismiss={handleDismissOnboarding}
          hidden={anyModalOpen}
        />
      )}
    </div>
  );
};

export default Workspace;
