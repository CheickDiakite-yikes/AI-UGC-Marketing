import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface CoachStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  optional?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface OnboardingCoachProps {
  step: CoachStep | null;
  stepIndex: number;
  totalSteps: number;
  isStepComplete: boolean;
  onNext: () => void;
  onSkip: () => void;
  onSkipAll?: () => void;
  onSnooze?: () => void;
  onDismiss?: () => void;
  hidden?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type TargetMatch = {
  element: HTMLElement;
  rect: DOMRect;
};

const isElementVisible = (element: HTMLElement, rect: DOMRect) => {
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  return true;
};

const isRectInViewport = (rect: DOMRect) =>
  rect.bottom > 0 &&
  rect.top < window.innerHeight &&
  rect.right > 0 &&
  rect.left < window.innerWidth;

const getOverlapArea = (a: DOMRect, b: DOMRect) => {
  const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (xOverlap <= 0 || yOverlap <= 0) return 0;
  return xOverlap * yOverlap;
};

const OnboardingCoach: React.FC<OnboardingCoachProps> = ({ step, stepIndex, totalSteps, isStepComplete, onNext, onSkip, onSkipAll, onSnooze, onDismiss, hidden }) => {
  const calloutRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [calloutPos, setCalloutPos] = useState({ top: 80, left: 16 });
  const [calloutSize, setCalloutSize] = useState({ width: 0, height: 0 });
  const autoScrollRef = useRef<string | null>(null);

  const targetSelector = step?.targetSelector || '';

  useEffect(() => {
    autoScrollRef.current = null;
  }, [step?.id]);

  const refreshTarget = useCallback(() => {
    if (!step || !targetSelector || hidden) {
      setTargetRect(null);
      setTargetElement(null);
      return;
    }

    const candidates = Array.from(document.querySelectorAll(targetSelector))
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => isElementVisible(element, rect));

    if (candidates.length === 0) {
      setTargetRect(null);
      setTargetElement(null);
      return;
    }

    const visibleCandidate = candidates.find(({ rect }) => isRectInViewport(rect));
    const chosen = visibleCandidate ?? candidates[0];

    setTargetRect(chosen.rect);
    setTargetElement(chosen.element);

    if (step && !isRectInViewport(chosen.rect) && autoScrollRef.current !== step.id) {
      autoScrollRef.current = step.id;
      chosen.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [hidden, step, targetSelector]);

  useEffect(() => {
    if (!step || !targetSelector || hidden) {
      setTargetRect(null);
      setTargetElement(null);
      return;
    }

    let rafId = 0;
    let frame = 0;

    const tick = () => {
      refreshTarget();
      frame += 1;
      if (frame < 12) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    const handle = () => refreshTarget();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [refreshTarget, step, targetSelector, hidden]);

  useEffect(() => {
    if (!targetElement) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => refreshTarget());
    observer.observe(targetElement);
    return () => observer.disconnect();
  }, [refreshTarget, targetElement]);

  useEffect(() => {
    if (!calloutRef.current) return;
    const updateSize = () => {
      const rect = calloutRef.current?.getBoundingClientRect();
      if (rect) {
        setCalloutSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(calloutRef.current);
    return () => observer.disconnect();
  }, [step?.id]);

  useEffect(() => {
    const safeAreaTop = 16;
    const safeAreaBottom = 100; // Extra space for mobile keyboards/nav bars
    const safeAreaSide = 12;
    const gap = 12;
    const calloutWidth = calloutSize.width;
    const calloutHeight = calloutSize.height;

    if (!calloutWidth || !calloutHeight) return;

    if (!targetRect) {
      setCalloutPos({
        top: Math.min(120, window.innerHeight / 3),
        left: clamp((window.innerWidth - calloutWidth) / 2, safeAreaSide, window.innerWidth - calloutWidth - safeAreaSide),
      });
      return;
    }

    const targetSafeRect = new DOMRect(
      targetRect.x - 8,
      targetRect.y - 8,
      targetRect.width + 16,
      targetRect.height + 16
    );

    const candidates = [
      {
        name: 'bottom',
        top: targetRect.bottom + gap,
        left: clamp(targetRect.left, safeAreaSide, window.innerWidth - calloutWidth - safeAreaSide),
      },
      {
        name: 'top',
        top: targetRect.top - calloutHeight - gap,
        left: clamp(targetRect.left, safeAreaSide, window.innerWidth - calloutWidth - safeAreaSide),
      },
      {
        name: 'right',
        top: clamp(targetRect.top, safeAreaTop, window.innerHeight - calloutHeight - safeAreaBottom),
        left: targetRect.right + gap,
      },
      {
        name: 'left',
        top: clamp(targetRect.top, safeAreaTop, window.innerHeight - calloutHeight - safeAreaBottom),
        left: targetRect.left - calloutWidth - gap,
      },
    ];

    const scored = candidates.map((candidate) => {
      const left = clamp(candidate.left, safeAreaSide, window.innerWidth - calloutWidth - safeAreaSide);
      const top = clamp(candidate.top, safeAreaTop, window.innerHeight - calloutHeight - safeAreaBottom);
      const rect = new DOMRect(left, top, calloutWidth, calloutHeight);
      const overlap = getOverlapArea(rect, targetSafeRect);
      const fits =
        rect.top >= safeAreaTop &&
        rect.left >= safeAreaSide &&
        rect.right <= window.innerWidth - safeAreaSide &&
        rect.bottom <= window.innerHeight - safeAreaBottom;
      return { top, left, overlap, fits, name: candidate.name };
    });

    const ideal = scored.find((candidate) => candidate.fits && candidate.overlap === 0);
    if (ideal) {
      setCalloutPos({ top: ideal.top, left: ideal.left });
      return;
    }

    const fallback = scored.sort((a, b) => {
      if (a.overlap !== b.overlap) return a.overlap - b.overlap;
      if (a.fits !== b.fits) return a.fits ? -1 : 1;
      return 0;
    })[0];

    setCalloutPos({ top: fallback.top, left: fallback.left });
  }, [calloutSize, targetRect, stepIndex]);

  if (!step || hidden) return null;

  const showNext = isStepComplete;
  const showSkip = step.optional && !isStepComplete;
  const primaryLabel = step.actionLabel || 'Do this step';

  const handlePrimaryAction = () => {
    if (step.onAction) {
      step.onAction();
      return;
    }
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      if (typeof (targetElement as HTMLElement).focus === 'function') {
        (targetElement as HTMLElement).focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {targetRect && (
        <div
          className="fixed border-4 border-neo-pink rounded-md pointer-events-none transition-all duration-200 ease-out onboarding-highlight"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12
          }}
        />
      )}
      <div
        ref={calloutRef}
        className="fixed pointer-events-auto bg-white border-4 border-black shadow-neo p-3 sm:p-4 w-[min(320px,calc(100vw-24px))] max-h-[calc(100vh-120px)] overflow-y-auto transition-transform duration-200 ease-out will-change-transform"
        style={{ top: 0, left: 0, transform: `translate3d(${calloutPos.left}px, ${calloutPos.top}px, 0)` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            {step.optional && (
              <span className="text-[9px] uppercase bg-black text-white px-1.5 py-0.5 tracking-widest">
                Optional
              </span>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-black text-xl leading-none p-1 -mr-1"
                title="Dismiss tutorial"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <h4 className="font-display font-black text-base sm:text-lg mb-1">{step.title}</h4>
        <p className="text-xs text-gray-700 mb-3 leading-relaxed">{step.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          {showSkip && (
            <button
              onClick={onSkip}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-3 py-2 active:bg-gray-100 transition-all"
            >
              Skip
            </button>
          )}
          {onSnooze && (
            <button
              onClick={onSnooze}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-3 py-2 active:bg-gray-100 transition-all"
            >
              Later
            </button>
          )}
          {onSkipAll && (
            <button
              onClick={onSkipAll}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-3 py-2 active:bg-gray-100 transition-all"
            >
              Skip Tutorial
            </button>
          )}
          <div className="flex-1" />
          {showNext ? (
            <button
              onClick={onNext}
              className="text-[10px] font-black uppercase tracking-widest bg-neo-pink border-2 border-black px-3 py-2 active:bg-black active:text-white transition-all"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handlePrimaryAction}
              className="text-[10px] font-black uppercase tracking-widest bg-neo-yellow border-2 border-black px-3 py-2 active:bg-black active:text-white transition-all"
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingCoach;
