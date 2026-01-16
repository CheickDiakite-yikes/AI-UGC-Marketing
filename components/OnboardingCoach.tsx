import React, { useEffect, useRef, useState } from 'react';

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
  onDismiss?: () => void;
  hidden?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const OnboardingCoach: React.FC<OnboardingCoachProps> = ({ step, stepIndex, totalSteps, isStepComplete, onNext, onSkip, onDismiss, hidden }) => {
  const calloutRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [calloutPos, setCalloutPos] = useState({ top: 80, left: 16 });

  const targetSelector = step?.targetSelector || '';

  useEffect(() => {
    if (!step || !targetSelector || hidden) {
      setTargetRect(null);
      return;
    }

    const refreshTarget = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      setTargetRect(el.getBoundingClientRect());
    };

    refreshTarget();

    const handle = () => refreshTarget();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [step, targetSelector, hidden]);

  useEffect(() => {
    if (!calloutRef.current) return;
    const calloutBox = calloutRef.current.getBoundingClientRect();
    const safeAreaTop = 16;
    const safeAreaBottom = 100; // Extra space for mobile keyboards/nav bars
    const safeAreaSide = 12;
    
    if (!targetRect) {
      // Center the callout when no target
      setCalloutPos({
        top: Math.min(120, window.innerHeight / 3),
        left: clamp((window.innerWidth - calloutBox.width) / 2, safeAreaSide, window.innerWidth - calloutBox.width - safeAreaSide)
      });
      return;
    }

    // Try to position below the target first
    let top = targetRect.bottom + 12;
    
    // If it doesn't fit below, try above
    if (top + calloutBox.height > window.innerHeight - safeAreaBottom) {
      top = targetRect.top - calloutBox.height - 12;
    }
    
    // If it still doesn't fit (target too high), position at safe area
    if (top < safeAreaTop) {
      top = safeAreaTop;
    }
    
    // Ensure it doesn't go below visible area
    if (top + calloutBox.height > window.innerHeight - safeAreaBottom) {
      top = window.innerHeight - calloutBox.height - safeAreaBottom;
    }

    const left = clamp(
      targetRect.left,
      safeAreaSide,
      window.innerWidth - calloutBox.width - safeAreaSide
    );

    setCalloutPos({ top: Math.max(safeAreaTop, top), left });
  }, [targetRect, stepIndex]);

  if (!step || hidden) return null;

  const showNext = isStepComplete;
  const showSkip = step.optional && !isStepComplete;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {targetRect && (
        <div
          className="fixed border-4 border-neo-pink rounded-md pointer-events-none"
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
        className="fixed pointer-events-auto bg-white border-4 border-black shadow-neo p-3 sm:p-4 w-[min(320px,calc(100vw-24px))] max-h-[calc(100vh-120px)] overflow-y-auto"
        style={{ top: calloutPos.top, left: calloutPos.left }}
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
          {step.onAction && step.actionLabel && (
            <button
              onClick={step.onAction}
              className="text-[10px] font-black uppercase tracking-widest bg-neo-yellow border-2 border-black px-3 py-2 active:bg-black active:text-white transition-all"
            >
              {step.actionLabel}
            </button>
          )}
          {showSkip && (
            <button
              onClick={onSkip}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-3 py-2 active:bg-gray-100 transition-all"
            >
              Skip
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
              className="text-[10px] font-black uppercase tracking-widest bg-gray-100 border-2 border-black px-3 py-2 text-gray-400"
              disabled
            >
              Do this step
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingCoach;
