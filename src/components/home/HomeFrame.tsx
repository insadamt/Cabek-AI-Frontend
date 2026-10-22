import { LayoutGrid } from 'lucide-react';
import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { useDossierOpening } from '../../hooks/useDossierOpening';
import { getDossierOpening } from '../../lib/dossierOpeningState';
import { HomeAnalysisProvider, useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { AnalysisIsland } from './AnalysisIsland';
import { navigate } from '../../hooks/useNavigation';

function navigateFromLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  navigate(event.currentTarget.getAttribute('href')!);
}

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
          <nav aria-label="Navigation principale" className="home-navigation">
            <a
              href="/"
              aria-current={variant === 'home' ? 'page' : undefined}
              onClick={navigateFromLink}
            >
              Accueil
            </a>
            <a href="/dossiers" onClick={navigateFromLink}>
              Dossiers
            </a>
          </nav>
          <AnalysisIsland />
          <a
            className="home-list-link"
            href="/dossiers"
            onClick={navigateFromLink}
            aria-label="Tous les dossiers"
          >
            <LayoutGrid size={19} />
          </a>
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
