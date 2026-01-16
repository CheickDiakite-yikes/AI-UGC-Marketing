import React from 'react';
import { OnboardingState } from '../types';

interface OnboardingPanelProps {
  state: OnboardingState;
  onOpenLinkModal: () => void;
  onOpenChat: () => void;
  onOpenBoards?: () => void;
  onOpenProduct?: () => void;
  onSnooze?: () => void;
  onSkipTutorial?: () => void;
}

interface StepRowProps {
  label: string;
  done: boolean;
  required?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}

const StepRow: React.FC<StepRowProps> = ({ label, done, required, actionLabel, onAction, hint }) => (
  <div className="flex items-center justify-between gap-3 bg-white border-2 border-black px-3 py-2 text-xs font-bold shadow-neo-sm">
    <div className="flex items-center gap-2 overflow-hidden">
      <div className={`w-3 h-3 border-2 border-black ${done ? 'bg-neo-lime' : 'bg-white'}`} />
      <div className="flex flex-col">
        <span className={`${done ? 'text-gray-400 line-through' : 'text-gray-900'} truncate`}>{label}</span>
        {hint && !done && <span className="text-[10px] text-gray-500 font-medium">{hint}</span>}
      </div>
      {required && (
        <span className="text-[9px] uppercase bg-black text-white px-1.5 py-0.5 tracking-widest">
          Required
        </span>
      )}
    </div>
    {onAction && actionLabel && !done && (
      <button
        onClick={onAction}
        className="text-[10px] font-black uppercase tracking-widest bg-neo-pink border-2 border-black px-2 py-1 hover:bg-black hover:text-white transition-all whitespace-nowrap"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const OnboardingPanel: React.FC<OnboardingPanelProps> = ({ state, onOpenLinkModal, onOpenChat, onOpenBoards, onOpenProduct, onSnooze, onSkipTutorial }) => {
  const requiredSteps = [
    {
      label: 'Add your website link',
      done: state.required.websiteLink,
      required: true,
      actionLabel: 'Add Link',
      onAction: onOpenLinkModal,
      hint: 'We scan your site for brand context.'
    },
    {
      label: 'Create your first campaign',
      done: state.required.campaignCreated,
      required: true,
      actionLabel: 'Open Chat',
      onAction: onOpenChat,
      hint: 'Pick any chip or type your own prompt.'
    }
  ];

  const optionalSteps = [
    { label: 'Upload a logo', done: state.optional.logo },
    { label: 'Add an avatar/spokesperson', done: state.optional.avatar },
    { label: 'Add a product + images', done: state.optional.product, actionLabel: 'Add Product', onAction: onOpenProduct },
    { label: 'Upload sources or docs', done: state.optional.sources },
    { label: 'Create another board', done: state.optional.multipleBoards, actionLabel: 'Boards', onAction: onOpenBoards }
  ];

  const requiredDone = requiredSteps.filter(step => step.done).length;
  const requiredTotal = requiredSteps.length;
  const optionalDone = optionalSteps.filter(step => step.done).length;
  const progress = Math.round((requiredDone / requiredTotal) * 100);

  return (
    <div className="mb-6 md:mb-10 bg-neo-yellow border-4 border-black shadow-neo p-4 md:p-5 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-700">First-time Setup</p>
          <h3 className="font-display font-black text-xl">Build your brand context</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSnooze && (
            <button
              onClick={onSnooze}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-2 py-1 hover:bg-gray-100 transition-all"
            >
              Later
            </button>
          )}
          {onSkipTutorial && (
            <button
              onClick={onSkipTutorial}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-2 py-1 hover:bg-gray-100 transition-all"
            >
              Skip Tutorial
            </button>
          )}
          <div className="text-xs font-bold uppercase tracking-widest bg-white border-2 border-black px-2 py-1 w-fit">
            {requiredDone}/{requiredTotal} required
          </div>
        </div>
      </div>

      <div className="w-full bg-white/70 border-2 border-black h-3 mb-4">
        <div className="bg-neo-pink h-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2">
        {requiredSteps.map((step) => (
          <StepRow key={step.label} {...step} />
        ))}
      </div>

      <div className="border-t-2 border-black/60 mt-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black uppercase tracking-widest text-gray-700">Optional boosts</p>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
            {optionalDone}/{optionalSteps.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {optionalSteps.map((step) => (
            <StepRow key={step.label} {...step} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPanel;
