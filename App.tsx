import React, { useState } from 'react';
import Workspace from './Workspace';
import LandingPage from './components/LandingPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';

type ViewState = 'landing' | 'app' | 'privacy' | 'terms';

const App: React.FC = () => {
  // Manage view state for simple routing
  const [currentView, setCurrentView] = useState<ViewState>('landing');

  // App View (Workspace)
  if (currentView === 'app') {
    return <Workspace onExitApp={() => setCurrentView('landing')} />;
  }
  
  // Privacy Policy View
  if (currentView === 'privacy') {
     return <PrivacyPage onBack={() => setCurrentView('landing')} />;
  }

  // Terms of Service View
  if (currentView === 'terms') {
     return <TermsPage onBack={() => setCurrentView('landing')} />;
  }

  // Default: Landing Page
  return (
    <LandingPage 
        onEnterApp={() => setCurrentView('app')} 
        onNavigatePrivacy={() => setCurrentView('privacy')}
        onNavigateTerms={() => setCurrentView('terms')}
    />
  );
};

export default App;