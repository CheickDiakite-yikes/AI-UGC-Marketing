'use client';

import React, { useState, useEffect } from 'react';
import Workspace from './Workspace';
import LandingPage from './components/LandingPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import AboutPage from './components/AboutPage';
import HowItWorksPage from './components/HowItWorksPage';
import ShowcasePage from './components/ShowcasePage';
import AuthModal from './components/AuthModal';
import { ToastProvider } from './components/Toast';
import { getSession } from './app/actions/authActions';

type ViewState = 'landing' | 'app' | 'privacy' | 'terms' | 'about' | 'how' | 'showcase';
type AuthModalMode = 'login' | 'signup' | null;
type AppInitialView = 'landing' | 'app';

interface AppProps {
  initialView?: AppInitialView;
}

const App: React.FC<AppProps> = ({ initialView = 'landing' }) => {
  const [currentView, setCurrentView] = useState<ViewState>(initialView);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);

  useEffect(() => {
    getSession().then(session => {
      if (session && session.userId) {
        setCurrentView('app');
      } else {
        setCurrentView('landing');
      }
    }).catch(() => {
      setCurrentView('landing');
    });
  }, [initialView]);

  const handleAuthSuccess = () => {
    setAuthModalMode(null);
    setCurrentView('app');
  };

  const handleLoginClick = async () => {
    // Check if user is already logged in
    const session = await getSession();
    if (session && session.userId) {
      // Already logged in, go straight to app
      setCurrentView('app');
    } else {
      // Not logged in, show login modal
      setAuthModalMode('login');
    }
  };

  if (currentView === 'app') {
    return <Workspace onExitApp={() => setCurrentView('landing')} />;
  }
  
  if (currentView === 'privacy') {
     return <PrivacyPage onBack={() => setCurrentView('landing')} />;
  }

  if (currentView === 'terms') {
     return <TermsPage onBack={() => setCurrentView('landing')} />;
  }
  
  if (currentView === 'about') {
     return <AboutPage onBack={() => setCurrentView('landing')} />;
  }

  if (currentView === 'how') {
     return <HowItWorksPage onBack={() => setCurrentView('landing')} />;
  }
  
  if (currentView === 'showcase') {
     return <ShowcasePage onBack={() => setCurrentView('landing')} />;
  }

  return (
    <>
      <LandingPage 
          onLogin={handleLoginClick}
          onSignup={() => setAuthModalMode('signup')}
          onNavigatePrivacy={() => setCurrentView('privacy')}
          onNavigateTerms={() => setCurrentView('terms')}
          onNavigateAbout={() => setCurrentView('about')}
          onNavigateHowItWorks={() => setCurrentView('how')}
          onNavigateShowcase={() => setCurrentView('showcase')}
      />
      <AuthModal
        isOpen={authModalMode !== null}
        onClose={() => setAuthModalMode(null)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode || 'login'}
      />
    </>
  );
};

const AppWithProviders: React.FC<AppProps> = ({ initialView = 'landing' }) => {
  return (
    <ToastProvider>
      <App initialView={initialView} />
    </ToastProvider>
  );
};

export default AppWithProviders;
