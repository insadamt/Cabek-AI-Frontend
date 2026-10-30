/**
 * Provides the shared application frame and activity island, with an optional coordinated stage entrance.
 * Depends on analysis/opening providers; other pages keep their existing visible header behavior.
 */
import { useEffect, type ReactNode } from 'react';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import { getDossierOpening } from '../../lib/dossierOpeningState';
import { HomeAnalysisProvider, useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { AnalysisIsland } from './AnalysisIsland';
import type { StageEntrancePhase } from '../../hooks/useStageEntrance';

interface HomeFrameProps {
  children: ReactNode;
  variant?: 'home' | 'dossier';
  entrancePhase?: StageEntrancePhase;
}

function HomeFrameContent({ children, variant = 'home', entrancePhase }: HomeFrameProps) {
  const { busy } = useHomeAnalysis();
  const opening = useDossierOpening();
  const openingBusy = !!opening && opening.phase !== 'error';
  useEffect(() => () => getDossierOpening()?.cancel(), []);
  return (
    <div
      className={`home-shell ${variant === 'dossier' ? 'dossier-shell' : ''}`}
      data-stage-entrance={entrancePhase}
    >
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <div className={`home-frame ${busy || openingBusy ? 'home-analysis-busy' : ''}`}>
        <header
          className="home-header"
          inert={entrancePhase === 'preparing'}
          aria-hidden={entrancePhase === 'preparing' || undefined}
        >
          <AnalysisIsland />
        </header>
        <main id="main-content" className="home-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function HomeFrame({ children, variant, entrancePhase }: HomeFrameProps) {
  return (
    <HomeAnalysisProvider>
      <HomeFrameContent variant={variant} entrancePhase={entrancePhase}>
        {children}
      </HomeFrameContent>
    </HomeAnalysisProvider>
  );
}
