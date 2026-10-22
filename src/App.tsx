import { Component, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { EmptyState } from './components/EmptyState';
import { useNavigation } from './hooks/useNavigation';
import { Dashboard } from './pages/Dashboard';
import { Dossier } from './pages/Dossier';
import { Home } from './pages/Home';
import { HomeFrame } from './components/home/HomeFrame';
import { useRouteMotion } from './hooks/useRouteMotion';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="fatal-error">
          <EmptyState
            title="Cet écran n’a pas pu s’afficher"
            description="Rechargez l’application pour retrouver votre espace. Aucun dossier n’a été modifié."
            onRetry={() => window.location.reload()}
            actionLabel="Recharger l’application"
          />
        </div>
      );
    return this.props.children;
  }
}

export default function App() {
  const { pathname, navigate } = useNavigation();
  const routeRef = useRouteMotion(pathname);
  const match = /^\/dossiers\/([^/]+)\/?$/.exec(pathname);
  let dossierId: string | undefined;
  try {
    if (match) dossierId = decodeURIComponent(match[1]);
  } catch {
    // An invalid deep link is handled by the missing-page view.
  }
  return (
    <ErrorBoundary>
      <div ref={routeRef} className="route-viewport">
        {pathname === '/' ? (
          <Home />
        ) : dossierId ? (
          <HomeFrame variant="dossier">
            <Dossier key={dossierId} dossierId={dossierId} />
          </HomeFrame>
        ) : (
          <Layout>
            {pathname === '/dossiers' ? (
              <Dashboard />
            ) : (
              <div className="page">
                <EmptyState
                  title="Cette page est introuvable"
                  description="Retrouvez vos expertises depuis votre espace dossiers."
                  onRetry={() => navigate('/dossiers')}
                  actionLabel="Voir les dossiers"
                />
              </div>
            )}
          </Layout>
        )}
      </div>
    </ErrorBoundary>
  );
}
