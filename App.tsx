import React, { useState } from 'react';
import Workspace from './Workspace';
import LandingPage from './components/LandingPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import AuthModal from './components/AuthModal';

type ViewState = 'landing' | 'app' | 'privacy' | 'terms';
type AuthModalMode = 'login' | 'signup' | null;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);

  const handleAuthSuccess = () => {
    setAuthModalMode(null);
    setCurrentView('app');
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

  return (
    <>
      <LandingPage 
          onLogin={() => setAuthModalMode('login')}
          onSignup={() => setAuthModalMode('signup')}
          onNavigatePrivacy={() => setCurrentView('privacy')}
          onNavigateTerms={() => setCurrentView('terms')}
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

export default App;