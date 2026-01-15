'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { signup, login } from '@/app/actions/authActions';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

const referralOptions = [
  'Google Search',
  'Social Media (Twitter/X, LinkedIn, etc.)',
  'Friend or Colleague',
  'YouTube',
  'Product Hunt',
  'Blog or Article',
  'Other'
];

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [signupState, signupAction, signupPending] = useActionState(signup, { error: null, success: false });
  const [loginState, loginAction, loginPending] = useActionState(login, { error: null, success: false });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (signupState?.success || loginState?.success) {
      onSuccess();
    }
  }, [signupState?.success, loginState?.success, onSuccess]);

  if (!isOpen) return null;

  const isPending = mode === 'signup' ? signupPending : loginPending;
  const error = mode === 'signup' ? signupState?.error : loginState?.error;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white border-4 border-black shadow-neo-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-2xl font-bold hover:bg-neo-pink transition-colors"
        >
          ×
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-neo-black text-neo-yellow flex items-center justify-center font-display font-bold text-xl">
              P
            </div>
            <h2 className="font-display font-bold text-2xl">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form action={loginAction} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-neo-black text-white py-3 font-bold border-2 border-black shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form action={signupAction} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Job Title / Role</label>
                <input
                  type="text"
                  name="jobTitle"
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="e.g. Marketing Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Company</label>
                <input
                  type="text"
                  name="company"
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">How did you find us?</label>
                <select
                  name="referralSource"
                  className="w-full px-4 py-3 border-2 border-black focus:border-neo-pink focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select an option</option>
                  {referralOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-neo-pink text-black py-3 font-bold border-2 border-black shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            {mode === 'login' ? (
              <p>
                New User?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="font-bold text-neo-pink hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-bold text-neo-pink hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
