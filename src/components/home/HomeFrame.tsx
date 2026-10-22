import { useEffect, type ReactNode } from 'react';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import { getDossierOpening } from '../../lib/dossierOpeningState';
import { HomeAnalysisProvider, useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { AnalysisIsland } from './AnalysisIsland';

interface HomeFrameProps {
  children: ReactNode;
  variant?: 'home' | 'dossier';
}

function HomeFrameContent({ children, variant = 'home' }: HomeFrameProps) {
  const { busy } = useHomeAnalysis();
  const opening = useDossierOpening();
  const openingBusy = !!opening && opening.phase !== 'error';
  useEffect(() => () => getDossierOpening()?.cancel(), []);
  return (
    <div className={`home-shell ${variant === 'dossier' ? 'dossier-shell' : ''}`}>
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <div className={`home-frame ${busy || openingBusy ? 'home-analysis-busy' : ''}`}>
        <header className="home-header">
          <AnalysisIsland />
        </header>
        <main id="main-content" className="home-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function HomeFrame({ children, variant }: HomeFrameProps) {
  return (
    <HomeAnalysisProvider>
      <HomeFrameContent variant={variant}>{children}</HomeFrameContent>
    </HomeAnalysisProvider>
  );
}
