import { LayoutGrid } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { HomeAnalysisProvider, useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { AnalysisIsland } from './AnalysisIsland';
import { navigate } from '../../hooks/useNavigation';

function navigateFromLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  navigate(event.currentTarget.getAttribute('href')!);
}

function HomeFrameContent({ children }: { children: ReactNode }) {
  const { busy } = useHomeAnalysis();
  return (
    <div className="home-shell">
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <div className={`home-frame ${busy ? 'home-analysis-busy' : ''}`}>
        <header className="home-header">
          <nav aria-label="Navigation principale" className="home-navigation">
            <a href="/" aria-current="page" onClick={navigateFromLink}>
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

export function HomeFrame({ children }: { children: ReactNode }) {
  return (
    <HomeAnalysisProvider>
      <HomeFrameContent>{children}</HomeFrameContent>
    </HomeAnalysisProvider>
  );
}
