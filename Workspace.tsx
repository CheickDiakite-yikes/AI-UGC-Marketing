
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ChatInterface from './components/ChatInterface';
import CanvasItemCard from './components/CanvasItemCard';
import BrandIdentityModal from './components/BrandIdentityModal';
import AvatarAnalysisModal from './components/AvatarAnalysisModal';
import BrandAnalysisSkeleton from './components/BrandAnalysisSkeleton';
import ProductModal from './components/ProductModal';
import OnboardingCoach, { CoachStep } from './components/OnboardingCoach';
import WebsiteLinkModal from './components/WebsiteLinkModal';
import WorkspaceSkeleton from './components/WorkspaceSkeleton';
import PaywallModal from './components/PaywallModal';
import NewBoardModal from './components/NewBoardModal';
import BoardListModal from './components/BoardListModal';
import CameraModal from './components/CameraModal';
import LightboxModal from './components/LightboxModal';
import { useToast } from './components/Toast';
import { ProjectAsset, CanvasItem, ChatMessage, BrandIdentity, AvatarIdentity, Board, UsageStats, Product, ProductAsset, OnboardingState, ProfileImportSelection, VideoReferenceSelection, VideoReferenceMode, ExtractedBrandData, BrandContext, AssetCatalogEntry } from './types';
import { chatWithMarketingAgent, analyzeBrandLogo, analyzeAvatarImage, discoverTrends, researchWithGoogleSearch, validateCopyConsistency } from './services/geminiService';
import { getRemainingVideos, IMAGE_CREDIT_COST, VIDEO_CREDIT_COST } from './services/usageLimits';
import { getPlanLimits } from './services/subscriptionPlans';
import { FunctionCall } from '@google/genai';
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
  completeOnboardingAction,
  submitWebsiteOnboardingAction,
  analyzeWebsiteAction
} from './app/actions/boardActions';
import { getSubscriptionStateAction, createCheckoutSessionAction, createCreditsCheckoutSessionAction } from './app/actions/subscriptionActions';
import { toggleFavoriteAction } from './app/actions/favoriteActions';
import { getUserProfile } from './app/actions/userActions';
import type { PlanTier } from './types';


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

const getRemainingImagesWithPending = (
  used: number,
  pending: number,
  limit: number,
  credits: number
) => {
  if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
  const safeLimit = Math.max(0, limit);
  const planRemaining = Math.max(0, safeLimit - used);
  const pendingPlanUse = Math.min(pending, planRemaining);
  const pendingBeyondPlan = Math.max(0, pending - pendingPlanUse);
  const effectiveCredits = Math.max(0, credits - pendingBeyondPlan * IMAGE_CREDIT_COST);
  const remainingPlanAfterPending = planRemaining - pendingPlanUse;
  return remainingPlanAfterPending + effectiveCredits;
};

const getRemainingVideosWithPending = (
  used: number,
  pending: number,
  limit: number,
  credits: number
) => {
  if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
  const safeLimit = Math.max(0, limit);
  const planRemaining = Math.max(0, safeLimit - used);
  const pendingPlanUse = Math.min(pending, planRemaining);
  const pendingBeyondPlan = Math.max(0, pending - pendingPlanUse);
  const effectiveCredits = Math.max(0, credits - pendingBeyondPlan * VIDEO_CREDIT_COST);
  const remainingPlanAfterPending = planRemaining - pendingPlanUse;
  const creditVideos = effectiveCredits > 0 ? Math.floor(effectiveCredits / VIDEO_CREDIT_COST) : 0;
  return remainingPlanAfterPending + creditVideos;
};

const Workspace: React.FC<WorkspaceProps> = ({ onExitApp }) => {
  const { showError, showSuccess, showToast } = useToast();
  const [usage, setUsage] = useState<UsageStats>({ imagesGenerated: 0, videosGenerated: 0, creditBalance: 0, lastResetDate: 0 });
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [videoQualityMode, setVideoQualityMode] = useState(true);
  const [ahaPackAvailable, setAhaPackAvailable] = useState(false);
  const [paywallState, setPaywallState] = useState<{ isOpen: boolean; reason: 'image_limit' | 'video_limit' | 'video_locked' | null }>({
    isOpen: false,
    reason: null,
  });
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [showWebsiteLinkModal, setShowWebsiteLinkModal] = useState(false);
  const [isWebsiteSubmitting, setIsWebsiteSubmitting] = useState(false);
  const [skippedOnboardingSteps, setSkippedOnboardingSteps] = useState<string[]>([]);
  const [activeOnboardingStepId, setActiveOnboardingStepId] = useState<string | null>(null);

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const planLimits = getPlanLimits(planTier);
  const hasVideoAllowance = getRemainingVideos(
    usage.videosGenerated,
    planLimits.videoLimit,
    usage.creditBalance
  ) > 0;
  const isVideoLocked = planLimits.videoLimit <= 0 && !hasVideoAllowance;

  const openPaywall = useCallback((reason: 'image_limit' | 'video_limit' | 'video_locked') => {
    setPaywallState((prev) => (prev.isOpen ? prev : { isOpen: true, reason }));
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleSelectPlan = useCallback(async (tier: PlanTier) => {
    if (tier === 'free') {
      closePaywall();
      return;
    }
    if (tier === 'enterprise') {
      closePaywall();
      if (typeof window !== 'undefined') {
        window.location.href = 'mailto:hello@predi.ai?subject=Predi%20AI%20Enterprise';
      }
      return;
    }

    try {
      const result = await createCheckoutSessionAction(tier);
      if (result?.url && typeof window !== 'undefined') {
        if (typeof (window as any).gtagSendEvent === 'function') {
          (window as any).gtagSendEvent(result.url);
        } else {
          window.location.href = result.url;
        }
        return;
      }
      showError('Checkout link unavailable. Please try again.');
    } catch (error) {
      console.error('Checkout failed', error);
      showError('Unable to start checkout. Please try again.');
    } finally {
      closePaywall();
    }
  }, [closePaywall, showError]);

  const handleSelectCredits = useCallback(async (credits: number) => {
    try {
      const result = await createCreditsCheckoutSessionAction(credits);
      if (result?.url && typeof window !== 'undefined') {
        if (typeof (window as any).gtagSendEvent === 'function') {
          (window as any).gtagSendEvent(result.url);
        } else {
          window.location.href = result.url;
        }
        return;
      }
      showError('Checkout link unavailable. Please try again.');
    } catch (error) {
      console.error('Credit checkout failed', error);
      showError('Unable to start checkout. Please try again.');
    } finally {
      closePaywall();
    }
  }, [closePaywall, showError]);

  // Initial Load (Boards + Usage)
  React.useEffect(() => {
    getUserUsageAction().then(setUsage);
    getSubscriptionStateAction()
      .then((state) => {
        setPlanTier(state.planTier);
        setAhaPackAvailable(state.planTier === 'free' && !state.ahaPackUsed);
      })
      .catch(() => {
        setPlanTier('free');
        setAhaPackAvailable(false);
      });
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

  // Load user profile for profile dropdown
  useEffect(() => {
    getUserProfile().then((profile) => {
      if (profile) {
        setUserProfile({ name: profile.name, email: profile.email, avatarUrl: profile.avatarUrl });
      }
    }).catch(() => {});
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

  const mapBoardDetailsToState = useCallback((b: any): Board => ({
    id: b.id,
    name: b.name,
    items: (b.generatedItems || []).map((gi: any) => ({
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
    assets: (b.assets || []) as ProjectAsset[],
    messages: (b.messages || []) as ChatMessage[],
    brandIdentity: (b as any).brandIdentity as BrandIdentity | null,
    avatarIdentity: (b as any).avatarIdentity as AvatarIdentity | null,
    products: (b.products || []).map((p: any) => ({
      ...p,
      assets: p.productAssets as ProductAsset[]
    })),
    brandContext: (b as any).brandContext as BrandContext | null,
    assetCatalog: ((b as any).assetCatalog || []) as AssetCatalogEntry[],
    createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now()
  }), []);

  // Fetch active board details
  React.useEffect(() => {
    if (!activeBoardId) return;
    setPendingItems([]);
    setActiveJobs([]);
    getBoardDetails(activeBoardId).then(b => {
      if (b) {
        setActiveBoard(mapBoardDetailsToState(b));
      }
    }).finally(() => {
      refreshOnboardingState();
    });
  }, [activeBoardId, mapBoardDetailsToState, refreshOnboardingState]);

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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string | null; email: string | null; avatarUrl: string | null } | null>(null);
  const mobileProfileDropdownRef = useRef<HTMLDivElement>(null);
  const desktopProfileDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isMobileDropdown = mobileProfileDropdownRef.current && mobileProfileDropdownRef.current.contains(target);
      const isDesktopDropdown = desktopProfileDropdownRef.current && desktopProfileDropdownRef.current.contains(target);
      
      if (!isMobileDropdown && !isDesktopDropdown) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const getProfileInitials = (name?: string | null, email?: string | null) => {
    const safeName = name?.trim();
    if (safeName) {
      const parts = safeName.split(/\s+/).filter(Boolean);
      return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || '?';
    }
    if (email && email.length > 0) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const [pendingScannedIdentity, setPendingScannedIdentity] = useState<BrandIdentity | null>(null);
  const [pendingScannedAvatar, setPendingScannedAvatar] = useState<AvatarIdentity | null>(null);

  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [pendingItems, setPendingItems] = useState<CanvasItem[]>([]);
  const referenceModeSet = new Set<VideoReferenceMode>(['manual', 'hybrid', 'auto']);

  const parseReferenceSelections = (value: unknown): VideoReferenceSelection[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const selections = value
      .map((entry: any) => {
        const assetId = typeof entry?.assetId === 'string' ? entry.assetId : null;
        const role = typeof entry?.role === 'string' ? entry.role : undefined;
        if (!assetId) return null;
        return { assetId, role } as VideoReferenceSelection;
      })
      .filter(Boolean) as VideoReferenceSelection[];
    return selections.length > 0 ? selections : undefined;
  };

  const parseReferenceMode = (value: unknown): VideoReferenceMode | undefined => {
    if (typeof value !== 'string') return undefined;
    return referenceModeSet.has(value as VideoReferenceMode) ? (value as VideoReferenceMode) : undefined;
  };

  const loadBoardDetails = useCallback(async (boardId: string, options?: { skipOnboarding?: boolean }) => {
    const b = await getBoardDetails(boardId);
    if (b) {
      setActiveBoard(mapBoardDetailsToState(b));
    }
    if (!options?.skipOnboarding) {
      await refreshOnboardingState();
    }
  }, [mapBoardDetailsToState, refreshOnboardingState]);

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
    const updateJobMessageStatus = (status: ChatMessage['jobStatus']) => {
      updateActiveBoard(b => ({
        ...b,
        messages: b.messages.map(msg => msg.jobId === jobId ? { ...msg, jobStatus: status } : msg)
      }));
    };
    const poll = async () => {
      try {
        // Trigger job processing on each poll (ensures jobs get processed in Autoscale)
        await triggerJobProcessing();
        
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
        const job = await res.json();
        
        if (job.status === 'completed') {
          updateJobMessageStatus('completed');
          setPendingItems(prev => prev.filter(item => item.id !== jobId));
          onComplete(job.result);
          setActiveJobs(prev => prev.filter(id => id !== jobId));
          showSuccess(`Content generated successfully!`);
        } else if (job.status === 'failed') {
          updateJobMessageStatus('failed');
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
          if (job.status === 'processing') {
            updateJobMessageStatus('processing');
          }
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
      const queuedAt = typeof payload?.queuedAt === 'number' ? payload.queuedAt : Date.now();
      const sceneCount = typeof payload?.sceneCount === 'number' ? payload.sceneCount : undefined;
      const isLongVideo = typeof payload?.isLongVideo === 'boolean'
        ? payload.isLongVideo
        : typeof sceneCount === 'number' && sceneCount > 1;
      const meta = {
        aspectRatio: typeof payload?.aspectRatio === 'string' ? payload.aspectRatio : undefined,
        resolution: typeof payload?.resolution === 'string' ? payload.resolution : undefined,
        caption: typeof payload?.caption === 'string' ? payload.caption : undefined,
        hook: typeof payload?.hook === 'string' ? payload.hook : undefined,
        archetype: typeof payload?.archetype === 'string' ? payload.archetype : undefined,
        status: 'queued' as const,
        sceneCount,
        totalDurationSeconds: typeof payload?.totalDurationSeconds === 'number' ? payload.totalDurationSeconds : undefined,
        isLongVideo,
        queuedAt
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
              const itemType = job.type === 'generate_video'
                ? 'video'
                : job.type === 'generate_carousel'
                  ? 'carousel'
                  : 'image';
              addPendingItem(job.id, itemType, {
                title: itemType === 'video'
                  ? 'Generating Video'
                  : itemType === 'carousel'
                    ? 'Generating Carousel'
                    : 'Generating Image',
                queuedAt: job?.createdAt ? new Date(job.createdAt).getTime() : Date.now()
              });
            });
            // Immediately trigger job processing for any pending jobs
            await triggerJobProcessing();
            pendingJobs.forEach((job: any) => {
              pollJobStatus(job.id, async () => {
                await loadBoardDetails(activeBoardId, { skipOnboarding: true });
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
    const updated = await getBoardDetails(activeBoardId);
    if (updated) {
      setActiveBoard(mapBoardDetailsToState(updated));
    }
    refreshOnboardingState();
    setShowBrandModal(false);
  };

  const handleSaveAvatar = async (identity: AvatarIdentity) => {
    if (!activeBoardId) return;
    const traceId = crypto.randomUUID();
    const hasAvatarAsset = Boolean(activeBoard?.assets.some(asset => asset.type === 'avatar'));
    if (!hasAvatarAsset && identity.referenceImages && identity.referenceImages.length > 0) {
      try {
        console.log(`[AVATAR ${traceId}] Saving avatar reference asset from identity`, {
          boardId: activeBoardId
        });
        await saveAsset(activeBoardId, {
          id: Date.now().toString(),
          type: 'avatar',
          name: identity.name ? `${identity.name} Avatar` : 'Avatar Reference',
          content: identity.referenceImages[0],
          mimeType: 'image/png',
        });
      } catch (error) {
        console.warn(`[AVATAR ${traceId}] Failed to save avatar reference asset`, error);
      }
    }
    await saveAvatarIdentityAction(activeBoardId, identity);
    setShowAvatarModal(false);
    setPendingAvatarAssets([]);
    const updated = await getBoardDetails(activeBoardId);
    if (updated) {
      setActiveBoard(mapBoardDetailsToState(updated));
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

  const handleWebsiteLinkSubmit = useCallback(async (url: string) => {
    setIsWebsiteSubmitting(true);
    try {
      const result = await submitWebsiteOnboardingAction(url);
      if (result.success) {
        showSuccess('Website linked! Starting your campaign...');
        await refreshOnboardingState();
        setShowWebsiteLinkModal(false);
      } else {
        showError(result.error || 'Failed to save website');
      }
    } catch (error) {
      console.error('[ONBOARDING] Failed to submit website:', error);
      showError('Something went wrong. Please try again.');
    } finally {
      setIsWebsiteSubmitting(false);
    }
  }, [refreshOnboardingState, showSuccess, showError]);

  const handleWebsiteAnalyze = useCallback(async (url: string, logoFile?: File) => {
    let logoFormData: FormData | undefined;
    if (logoFile) {
      logoFormData = new FormData();
      logoFormData.append('logo', logoFile);
    }
    return await analyzeWebsiteAction(url, logoFormData);
  }, []);

  const handleWebsiteConfirm = useCallback(async (url: string, data: ExtractedBrandData, logoUrl?: string) => {
    setIsWebsiteSubmitting(true);
    try {
      const result = await submitWebsiteOnboardingAction(url, data, logoUrl);
      if (result.success) {
        showSuccess(`${data.companyName} is ready! Let's create some magic.`);
        await refreshOnboardingState();
        setShowWebsiteLinkModal(false);
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('[ONBOARDING] Failed to confirm website:', error);
      throw error;
    } finally {
      setIsWebsiteSubmitting(false);
    }
  }, [refreshOnboardingState, showSuccess]);

  const handleWebsiteLinkClose = useCallback(() => {
    dismissOnboardingAction()
      .then(() => refreshOnboardingState())
      .catch((error) => console.error('[ONBOARDING] Failed to dismiss:', error));
    setShowWebsiteLinkModal(false);
  }, [refreshOnboardingState]);

  const anyModalOpen = showBrandModal || showAvatarModal || showProductModal || showNewBoardModal || showBoardListModal || selectedItem !== null || showWebsiteLinkModal;

  useEffect(() => {
    if (!onboardingState) return;
    if (onboardingState.dismissed && showOnboardingGuide) {
      setShowOnboardingGuide(false);
      return;
    }
    if (!onboardingState.completed && !onboardingState.dismissed) {
      if (!onboardingState.required.websiteLink && !showWebsiteLinkModal) {
        setShowWebsiteLinkModal(true);
      }
      if (onboardingState.required.websiteLink && !showOnboardingGuide) {
        setShowOnboardingGuide(true);
      }
    }
  }, [onboardingState, showOnboardingGuide, showWebsiteLinkModal]);

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

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    updateActiveBoard(b => ({ ...b, messages: [...b.messages, userMsg] }));
    await saveMessageAction(activeBoardId, 'user', text, userMsg.id);

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
        activeBoard.products || [],
        activeBoard.brandContext as BrandContext | null,
        activeBoard.assetCatalog || []
      ) as any;

      const pendingImageCount = pendingItems.filter(item => item.type === 'image').length;
      const pendingVideoCount = pendingItems
        .filter(item => item.type === 'video')
        .reduce((sum, item) => sum + (typeof item.meta?.sceneCount === 'number' ? item.meta.sceneCount : 1), 0);
      const imageLimit = planLimits.imageLimit;
      const videoLimit = planLimits.videoLimit;
      let remainingImages = getRemainingImagesWithPending(usage.imagesGenerated, pendingImageCount, imageLimit, usage.creditBalance);
      let remainingVideos = getRemainingVideosWithPending(usage.videosGenerated, pendingVideoCount, videoLimit, usage.creditBalance);

      const modelParts = response.candidates[0].content.parts || [];
      let responseText = response.text || "";
      let newItems: CanvasItem[] = [];
      let groundingLinks: ChatMessage['groundingLinks'] | undefined;
      let isResearchResult = false;
      const packQueue: any[] = [];

      for (const part of modelParts) {
        if (part.functionCall) {
          const fc = part.functionCall as FunctionCall;
          if (fc.name === 'generate_image') {
            setProcessingStatus(`Queuing image generation...`);
            const productId = typeof fc.args['productId'] === 'string' ? fc.args['productId'] : undefined;
            const title = typeof fc.args['title'] === 'string' ? fc.args['title'] : undefined;
            const hook = typeof fc.args['hook'] === 'string' ? fc.args['hook'] : undefined;
            const caption = typeof fc.args['caption'] === 'string' ? fc.args['caption'] : undefined;
            const archetype = typeof fc.args['archetype'] === 'string' ? fc.args['archetype'] : undefined;
            const brandAssetIds = Array.isArray(fc.args['brandAssetIds']) ? fc.args['brandAssetIds'] : undefined;
            const traceId = crypto.randomUUID();
            if (remainingImages <= 0) {
              const message = `Image quota reached (${usage.imagesGenerated}/${imageLimit}).`;
              showError(message);
              openPaywall('image_limit');
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
                  title,
                  hook,
                  caption,
                  archetype,
                  brandAssetIds,
                  traceId
                }
              })
            });
            const job = await res.json().catch(() => null);
            if (!res.ok || !job?.id) {
              const message = job?.error || 'Image generation request failed.';
              if (job?.code === 'QUOTA_EXCEEDED') {
                openPaywall('image_limit');
              } else if (job?.code === 'PLAN_REQUIRED') {
                openPaywall('video_locked');
              }
              showError(message);
              continue;
            }
            if (job.id) {
              setActiveJobs(prev => [...prev, job.id]);
              addPendingItem(job.id, 'image', {
                title: title || (fc.args['prompt'] ? 'Queued Image' : 'Generating Image'),
                aspectRatio: fc.args['aspectRatio'] || '1:1',
                caption,
                hook,
                archetype,
                queuedAt: job?.createdAt ? new Date(job.createdAt).getTime() : Date.now()
              });
              remainingImages = Math.max(0, remainingImages - 1);
              pollJobStatus(job.id, async () => {
                await loadBoardDetails(activeBoardId, { skipOnboarding: true });
                getUserUsageAction().then(setUsage);
              });
              const metaLines: string[] = [];
              if (hook) metaLines.push(`**Hook Strategy:** "${hook}"`);
              if (caption) metaLines.push(`**Caption:** ${caption}`);
              if (metaLines.length > 0) {
                responseText = responseText ? `${responseText}\n\n${metaLines.join('\n')}` : metaLines.join('\n');
              }
              const progressMessage = `🎨 Image generation in progress. This will complete even if you leave the page.`;
              responseText = responseText ? `${responseText}\n\n${progressMessage}` : progressMessage;
            }
          }
          if (fc.name === 'generate_video') {
            setProcessingStatus(`Queuing video generation...`);
            const ingredientAssetIds = Array.isArray(fc.args['ingredientAssetIds']) ? fc.args['ingredientAssetIds'] : undefined;
            const referenceSelections = parseReferenceSelections(fc.args['referenceSelections']);
            const referenceMode = parseReferenceMode(fc.args['referenceMode']);
            const productId = typeof fc.args['productId'] === 'string' ? fc.args['productId'] : undefined;
            const title = typeof fc.args['title'] === 'string' ? fc.args['title'] : undefined;
            const hook = typeof fc.args['hook'] === 'string' ? fc.args['hook'] : undefined;
            const caption = typeof fc.args['caption'] === 'string' ? fc.args['caption'] : undefined;
            const archetype = typeof fc.args['archetype'] === 'string' ? fc.args['archetype'] : undefined;
            const qualityMode = typeof fc.args['qualityMode'] === 'boolean' ? fc.args['qualityMode'] : videoQualityMode;
            const traceId = crypto.randomUUID();
            if (isVideoLocked) {
              showError('Video generation requires credits or a subscription.');
              openPaywall('video_locked');
              continue;
            }
            if (remainingVideos <= 0) {
              const message = 'Video quota reached. Add credits or upgrade to generate more.';
              showError(message);
              openPaywall('video_limit');
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
                  referenceSelections,
                  referenceMode,
                  qualityMode,
                  title,
                  hook,
                  caption,
                  archetype,
                  traceId
                }
              })
            });
            const job = await res.json().catch(() => null);
            if (!res.ok || !job?.id) {
              const message = job?.error || 'Video generation request failed.';
              if (job?.code === 'QUOTA_EXCEEDED') {
                openPaywall('video_limit');
              } else if (job?.code === 'PLAN_REQUIRED') {
                openPaywall('video_locked');
              }
              showError(message);
              continue;
            }
            if (job.id) {
              setActiveJobs(prev => [...prev, job.id]);
              addPendingItem(job.id, 'video', {
                title: title || (fc.args['prompt'] ? 'Queued Video' : 'Generating Video'),
                aspectRatio: fc.args['aspectRatio'] || '16:9',
                resolution: '720p',
                caption,
                hook,
                archetype,
                queuedAt: job?.createdAt ? new Date(job.createdAt).getTime() : Date.now()
              });
              remainingVideos = Math.max(0, remainingVideos - 1);
              pollJobStatus(job.id, async () => {
                await loadBoardDetails(activeBoardId, { skipOnboarding: true });
                getUserUsageAction().then(setUsage);
              });
              const metaLines: string[] = [];
              if (hook) metaLines.push(`**Hook Strategy:** "${hook}"`);
              if (caption) metaLines.push(`**Caption:** ${caption}`);
              if (metaLines.length > 0) {
                responseText = responseText ? `${responseText}\n\n${metaLines.join('\n')}` : metaLines.join('\n');
              }
              const progressMessage = `🎬 Video generation in progress (takes 1-2 min). This will complete even if you leave the page.`;
              responseText = responseText ? `${responseText}\n\n${progressMessage}` : progressMessage;
            }
          }
          if (fc.name === 'generate_long_video') {
            const retiredMessage = 'Long video generation has been retired. I can still create short videos, images, and carousels.';
            responseText = responseText ? `${responseText}\n\n${retiredMessage}` : retiredMessage;
            continue;
          }
          if (fc.name === 'generate_campaign_pack') packQueue.push(fc.args);
          
          if (fc.name === 'discover_trends') {
            setProcessingStatus(`Searching for latest trends...`);
            const trendResult = await discoverTrends(
              fc.args['industry'] as string,
              fc.args['targetAudience'] as string | undefined
            );
            responseText = trendResult.text;
            isResearchResult = true;
            if (trendResult.sources && trendResult.sources.length > 0) {
              groundingLinks = trendResult.sources.slice(0, 5).map((url) => ({ title: '', url }));
            }
          }
          
          if (fc.name === 'web_research') {
            setProcessingStatus(`Researching...`);
            const researchResult = await researchWithGoogleSearch(
              fc.args['query'] as string,
              fc.args['context'] as string | undefined
            );
            responseText = researchResult.text;
            isResearchResult = true;
            if (researchResult.sources && researchResult.sources.length > 0) {
              groundingLinks = researchResult.sources.slice(0, 5).map((url) => ({ title: '', url }));
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

        const ensureAhaPackItems = (items: any[], requestText: string, productId?: string) => {
          if (!/aha pack/i.test(requestText)) {
            return items;
          }

          const product = selectProductForPack(productId);
          const productName = product?.name || 'the product';
          const fallbackItems: any[] = [];

          const imageItem = items.find(i => i.type === 'image') || {
            type: 'image',
            title: 'Aha Moment Post',
            archetype: 'Problem/Solution',
            hook: `${productName}, but simpler.`,
            caption: `Meet ${productName}—the fast way to get results.`,
            aspectRatio: '1:1',
            productId,
            visual_prompt: `A crisp, scroll-stopping image that highlights ${productName}. Clean composition, bold lighting, brand colors, premium feel.`
          };

          const carouselItem = items.find(i => i.type === 'carousel') || {
            type: 'carousel',
            title: '2-Step Breakthrough',
            archetype: 'How It Works',
            hook: `Two steps to feel the shift.`,
            caption: `A quick 2-step overview of ${productName}.`,
            aspectRatio: '1:1',
            productId,
            carousel_prompts: [
              `Slide 1: The pain point. Show the before state and the tension ${productName} solves.`,
              `Slide 2: The relief. Show the after state with ${productName} in focus.`
            ]
          };

          const videoItem = items.find(i => i.type === 'video') || {
            type: 'video',
            title: 'HQ Aha Video',
            archetype: 'UGC',
            hook: `This changed my routine.`,
            caption: `A real, human moment with ${productName}.`,
            aspectRatio: '16:9',
            productId,
            qualityMode: true,
            visual_prompt: `Cinematic, authentic UGC moment with ${productName}. Natural lighting, steady handheld camera, clean framing. Show a simple interaction and a visible result.`
          };

          const slides = Array.isArray(carouselItem.carousel_prompts) ? carouselItem.carousel_prompts : [];
          const trimmedCarousel = {
            ...carouselItem,
            carousel_prompts: slides.length > 0 ? slides.slice(0, 2) : [
              `Slide 1: The pain point ${productName} solves, bold headline, clear tension.`,
              `Slide 2: The solution with ${productName} and a payoff statement.`
            ]
          };

          fallbackItems.push(
            { ...imageItem, type: 'image', aspectRatio: imageItem.aspectRatio || '1:1' },
            { ...trimmedCarousel, type: 'carousel', aspectRatio: trimmedCarousel.aspectRatio || '1:1' },
            { ...videoItem, type: 'video', aspectRatio: videoItem.aspectRatio || '16:9', qualityMode: true }
          );

          return fallbackItems;
        };

        for (const pack of packQueue) {
          const isAhaPack = /aha pack/i.test(pack.packName || '') || /aha pack/i.test(text);
          let normalizedItems = ensureLaunchPackItems(pack.items || [], text, pack.productId);
          if (isAhaPack) {
            normalizedItems = ensureAhaPackItems(normalizedItems, text, pack.productId);
          }

          if (isAhaPack && !ahaPackAvailable) {
            showToast('Aha Pack already redeemed. Upgrade for more packs.', 'info');
          }

          if (isAhaPack && ahaPackAvailable) {
            try {
              setProcessingStatus(`Redeeming Aha Pack...`);
              const res = await fetch('/api/aha-pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  boardId: activeBoardId,
                  packName: pack.packName || 'Aha Pack',
                  items: normalizedItems
                })
              });
              const data = await res.json().catch(() => null);
              if (!res.ok || !data?.jobs) {
                const message = data?.error || 'Aha Pack redemption failed.';
                showError(message);
                continue;
              }

              const jobs = data.jobs as Array<{ id: string; type: string; payload: any }>;
              setAhaPackAvailable(false);
              const pendingCount = jobs.length;
              jobs.forEach((job) => {
                setActiveJobs(prev => [...prev, job.id]);
                const jobPayload = job.payload || {};
                addPendingItem(job.id, job.type === 'generate_video' ? 'video' : job.type === 'generate_carousel' ? 'carousel' : 'image', {
                  title: jobPayload.title,
                  aspectRatio: jobPayload.aspectRatio,
                  resolution: jobPayload.resolution,
                  caption: jobPayload.caption,
                  hook: jobPayload.hook,
                  archetype: jobPayload.archetype,
                  queuedAt: Date.now()
                });
                pollJobStatus(job.id, async () => {
                  await loadBoardDetails(activeBoardId, { skipOnboarding: true });
                  getUserUsageAction().then(setUsage);
                });
              });

              responseText = `✨ Aha Pack redeemed! ${pendingCount} items are generating now.`;
              continue;
            } catch (error) {
              console.error('[WORKSPACE] Aha pack redemption failed:', error);
              showError('Aha Pack redemption failed. Please try again.');
              continue;
            }
          }

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
            if (item.type === 'long_video') {
              skippedCount++;
              skippedReasons.push('Long video generation has been retired.');
              continue;
            }
            if (item.type === 'carousel') {
              try {
                const prompts = Array.isArray(item.carousel_prompts) ? item.carousel_prompts : [];
                const safePrompts = prompts.length > 0 ? prompts : [`Hero slide for ${item.title || 'product'} with bold headline.`];
                const slidesToGenerate = Math.min(safePrompts.length, remainingImages);
                if (slidesToGenerate <= 0) {
                  openPaywall('image_limit');
                  skippedCount++;
                  skippedReasons.push('Not enough image quota for carousel.');
                  continue;
                }
                if (slidesToGenerate < safePrompts.length) {
                  skippedReasons.push(`Carousel trimmed to ${slidesToGenerate} slide(s) due to image quota.`);
                }
                const promptsToUse = safePrompts.slice(0, slidesToGenerate);

                const res = await fetch('/api/jobs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    boardId: activeBoardId,
                    type: 'generate_carousel',
                    payload: {
                      slides: promptsToUse.map(prompt => ({ prompt })),
                      aspectRatio: item.aspectRatio || '1:1',
                      title: item.title,
                      description: item.caption,
                      metadata: { hook: item.hook, archetype: item.archetype },
                      productId: item.productId,
                      traceId
                    }
                  })
                });
                const job = await res.json().catch(() => null);
                if (!res.ok || !job?.id) {
                  const message = job?.error || 'Carousel generation failed.';
                  if (job?.code === 'QUOTA_EXCEEDED') {
                    openPaywall('image_limit');
                    skippedCount++;
                    skippedReasons.push(message);
                  } else {
                    showError(message);
                  }
                  continue;
                }

                backgroundCount++;
                queuedCount++;
                setActiveJobs(prev => [...prev, job.id]);
                addPendingItem(job.id, 'carousel', {
                  title: item.title,
                  aspectRatio: item.aspectRatio || '1:1',
                  caption: item.caption,
                  hook: item.hook,
                  archetype: item.archetype,
                  slideCount: promptsToUse.length,
                  queuedAt: job?.createdAt ? new Date(job.createdAt).getTime() : Date.now()
                });
                remainingImages = Math.max(0, remainingImages - slidesToGenerate);
                pollJobStatus(job.id, async () => {
                  await loadBoardDetails(activeBoardId, { skipOnboarding: true });
                  getUserUsageAction().then(setUsage);
                });
              } catch (error) {
                console.error('[WORKSPACE] Carousel generation failed:', error);
                showError('Carousel generation failed. Please try again.');
              }
            } else {
              // Use background jobs for images and videos in packs
              if (item.type === 'video') {
                if (isVideoLocked) {
                  openPaywall('video_locked');
                  skippedCount++;
                  skippedReasons.push('Video generation requires credits or a subscription.');
                  continue;
                }
                if (remainingVideos < 1) {
                  openPaywall('video_limit');
                  skippedCount++;
                  skippedReasons.push('Not enough video quota.');
                  continue;
                }
              } else if (remainingImages <= 0) {
                openPaywall('image_limit');
                skippedCount++;
                skippedReasons.push('Not enough image quota.');
                continue;
              }

              const jobType = item.type === 'video' ? 'generate_video' : 'generate_image';
              const itemQualityMode = item.type === 'video' && typeof item.qualityMode === 'boolean'
                ? item.qualityMode
                : videoQualityMode;
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
                    qualityMode: jobType === 'generate_video' ? itemQualityMode : undefined,
                    traceId
                  }
                })
              });
              const job = await res.json().catch(() => null);
              if (!res.ok || !job?.id) {
                const message = job?.error || 'Generation request failed.';
                if (job?.code === 'QUOTA_EXCEEDED') {
                  openPaywall(item.type === 'video' ? 'video_limit' : 'image_limit');
                  skippedCount++;
                  skippedReasons.push(message);
                } else if (job?.code === 'PLAN_REQUIRED') {
                  openPaywall('video_locked');
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
                  archetype: item.archetype,
                  queuedAt: job?.createdAt ? new Date(job.createdAt).getTime() : Date.now()
                });
                if (item.type === 'video') {
                  remainingVideos = Math.max(0, remainingVideos - 1);
                } else {
                  remainingImages = Math.max(0, remainingImages - 1);
                }
                pollJobStatus(job.id, async () => {
                  await loadBoardDetails(activeBoardId, { skipOnboarding: true });
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

      const modelMessages: ChatMessage[] = [];
      if (responseText) {
        modelMessages.push({
          id: crypto.randomUUID(),
          role: 'model',
          text: responseText,
          ...(groundingLinks ? { groundingLinks } : {}),
          ...(isResearchResult ? { isResearchResult: true } : {})
        });
      }
      if (modelMessages.length === 0) {
        let fallbackMessage = '';
        if (newItems.length > 0) {
          const imageCount = newItems.filter(i => i.type === 'image').length;
          const carouselCount = newItems.filter(i => i.type === 'carousel').length;
          const videoCount = newItems.filter(i => i.type === 'video').length;
          const parts: string[] = [];
          if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
          if (carouselCount > 0) parts.push(`${carouselCount} carousel${carouselCount > 1 ? 's' : ''}`);
          if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
          fallbackMessage = `✨ All done! Created ${parts.join(' and ')} for your campaign.`;
        } else {
          fallbackMessage = 'Generation confirmed.';
        }
        modelMessages.push({
          id: crypto.randomUUID(),
          role: 'model',
          text: fallbackMessage
        });
      }

      for (const message of modelMessages) {
        await saveMessageAction(activeBoardId, 'model', message.text, message.id, message.groundingLinks);
      }

      updateActiveBoard(b => {
        return {
          ...b,
          items: [...newItems, ...b.items],
          messages: [...b.messages, ...modelMessages]
        };
      });
      refreshOnboardingState();

    } catch (error: any) {
      console.error("Chat error:", error);
      const errMsg = error?.message || "Something went wrong. Please try again.";
      showError(errMsg.length > 100 ? errMsg.substring(0, 100) + '...' : errMsg);
      const errorMessageId = crypto.randomUUID();
      updateActiveBoard(b => ({ ...b, messages: [...b.messages, { id: errorMessageId, role: 'model', text: `Error: ${errMsg}` }] }));
      await saveMessageAction(activeBoardId, 'model', `Error: ${errMsg}`, errorMessageId);
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
          const completedIds = activeJobs.filter(id => !pendingIds.has(id));
          setPendingItems(prev => prev
            .filter(item => pendingIds.has(item.id))
            .map(item => {
              const match = pendingJobs.find((j: any) => j.id === item.id);
              if (!match) return item;
              const nextStatus = match.status === 'processing' ? 'processing' : 'queued';
              return { ...item, meta: { ...item.meta, status: nextStatus } };
            })
          );
          if (completedIds.length > 0) {
            await loadBoardDetails(activeBoardId, { skipOnboarding: true });
            getUserUsageAction().then(setUsage);
          }
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
  }, [activeBoardId, activeJobs, loadBoardDetails]);

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
      const pendingType = failedJob.type === 'generate_video'
        ? 'video'
        : failedJob.type === 'generate_carousel'
          ? 'carousel'
          : 'image';
      addPendingItem(job.id, pendingType, {
        ...failedJob.payload,
        slideCount: failedJob.type === 'generate_carousel' && Array.isArray((failedJob.payload as any)?.slides)
          ? (failedJob.payload as any).slides.length
          : undefined,
        queuedAt: job?.createdAt ? new Date(job.createdAt).getTime() : Date.now()
      });
      pollJobStatus(job.id, async () => {
        await loadBoardDetails(activeBoardId, { skipOnboarding: true });
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
        <div className="relative" ref={mobileProfileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="w-10 h-10 bg-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none flex-shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden"
          >
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : userProfile ? (
              getProfileInitials(userProfile.name, userProfile.email)
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </button>
          {profileDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border-2 border-black shadow-neo-sm z-50">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm font-bold hover:bg-neo-yellow border-b border-black transition-colors"
                onClick={() => setProfileDropdownOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/profile/dashboard"
                className="block px-4 py-2 text-sm font-bold hover:bg-neo-yellow border-b border-black transition-colors"
                onClick={() => setProfileDropdownOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/profile/company"
                className="block px-4 py-2 text-sm font-bold hover:bg-neo-yellow transition-colors"
                onClick={() => setProfileDropdownOpen(false)}
              >
                Company
              </Link>
            </div>
          )}
        </div>
        <h2 className="font-display font-black text-base truncate flex-1">{activeBoard.name}</h2>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setShowBoardListModal(true)} data-tour="boards" className="px-2 py-1 bg-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1">
            <span>📋</span>
            <span className="text-xs font-bold">Boards</span>
          </button>
          <button onClick={() => setShowNewBoardModal(true)} className="px-2 py-1 bg-neo-black text-white border-2 border-black shadow-neo-sm active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1">
            <span>+</span>
            <span className="text-xs font-bold">New</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-y-auto p-4 md:p-12 pb-32 md:pt-0">
                {/* Desktop Header - Hidden on mobile */}
        <header className="hidden md:flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="relative" ref={desktopProfileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-12 h-12 bg-white border-2 border-black shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center font-bold text-base overflow-hidden"
              >
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : userProfile ? (
                  getProfileInitials(userProfile.name, userProfile.email)
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
              {profileDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border-2 border-black shadow-neo-sm z-50">
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-sm font-bold hover:bg-neo-yellow border-b border-black transition-colors"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/profile/dashboard"
                    className="block px-4 py-3 text-sm font-bold hover:bg-neo-yellow border-b border-black transition-colors"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile/company"
                    className="block px-4 py-3 text-sm font-bold hover:bg-neo-yellow transition-colors"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Company
                  </Link>
                </div>
              )}
            </div>
            <h2 className="text-5xl font-display font-black tracking-tight">{activeBoard.name}</h2>
          </div>
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

      <ChatInterface
        messages={activeBoard.messages}
        onSendMessage={handleSendMessage}
        onDismissResearch={handleDismissResearch}
        isProcessing={isProcessing}
        processingStatus={processingStatus}
        pendingItems={pendingItems}
        videoQualityMode={videoQualityMode}
        onToggleVideoQuality={() => setVideoQualityMode(prev => !prev)}
        ahaPackAvailable={ahaPackAvailable}
      />
      
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
      <PaywallModal
        isOpen={paywallState.isOpen}
        reason={paywallState.reason}
        usage={usage}
        planTier={planTier}
        imageLimit={planLimits.imageLimit}
        videoLimit={planLimits.videoLimit}
        onClose={closePaywall}
        onSelectPlan={handleSelectPlan}
        onSelectCredits={handleSelectCredits}
      />
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
      <WebsiteLinkModal
        isOpen={showWebsiteLinkModal}
        onClose={handleWebsiteLinkClose}
        onSubmit={handleWebsiteLinkSubmit}
        onAnalyze={handleWebsiteAnalyze}
        onConfirm={handleWebsiteConfirm}
        isLoading={isWebsiteSubmitting}
      />
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
