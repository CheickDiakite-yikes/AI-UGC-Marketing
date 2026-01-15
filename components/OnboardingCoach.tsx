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
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const OnboardingCoach: React.FC<OnboardingCoachProps> = ({ step, stepIndex, totalSteps, isStepComplete, onNext, onSkip }) => {
  const calloutRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [calloutPos, setCalloutPos] = useState({ top: 80, left: 16 });

  const targetSelector = step?.targetSelector || '';

  useEffect(() => {
    if (!step || !targetSelector) {
      setTargetRect(null);
      return;
    }

    const refreshTarget = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
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
  }, [step, targetSelector]);

  useEffect(() => {
    if (!calloutRef.current) return;
    const calloutBox = calloutRef.current.getBoundingClientRect();
    if (!targetRect) {
      setCalloutPos({
        top: 120,
        left: clamp((window.innerWidth - calloutBox.width) / 2, 16, window.innerWidth - calloutBox.width - 16)
      });
      return;
    }

    let top = targetRect.bottom + 12;
    if (top + calloutBox.height > window.innerHeight - 16) {
      top = targetRect.top - calloutBox.height - 12;
    }

    const left = clamp(
      targetRect.left,
      16,
      window.innerWidth - calloutBox.width - 16
    );

    setCalloutPos({ top: Math.max(16, top), left });
  }, [targetRect, stepIndex]);

  if (!step) return null;

  const showNext = isStepComplete;
  const showSkip = step.optional && !isStepComplete;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {targetRect && (
        <div
          className="fixed border-4 border-neo-pink shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] rounded-md pointer-events-none"
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
        className="fixed pointer-events-auto bg-white border-4 border-black shadow-neo p-4 w-[min(340px,90vw)]"
        style={{ top: calloutPos.top, left: calloutPos.left }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          {step.optional && (
            <span className="text-[9px] uppercase bg-black text-white px-1.5 py-0.5 tracking-widest">
              Optional
            </span>
          )}
        </div>
        <h4 className="font-display font-black text-lg mb-1">{step.title}</h4>
        <p className="text-xs text-gray-700 mb-3">{step.description}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {step.onAction && step.actionLabel && (
              <button
                onClick={step.onAction}
                className="text-[10px] font-black uppercase tracking-widest bg-neo-yellow border-2 border-black px-3 py-1.5 hover:bg-black hover:text-white transition-all"
              >
                {step.actionLabel}
              </button>
            )}
            {showSkip && (
              <button
                onClick={onSkip}
                className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-3 py-1.5 hover:bg-gray-100 transition-all"
              >
                Skip
              </button>
            )}
          </div>
          {showNext ? (
            <button
              onClick={onNext}
              className="text-[10px] font-black uppercase tracking-widest bg-neo-pink border-2 border-black px-3 py-1.5 hover:bg-black hover:text-white transition-all"
            >
              Next
            </button>
          ) : (
            <button
              className="text-[10px] font-black uppercase tracking-widest bg-gray-100 border-2 border-black px-3 py-1.5 text-gray-400"
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
