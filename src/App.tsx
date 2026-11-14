/**
 * Routes category/dossier screens while retaining one cached studio across navigation.
 * Depends on navigation, route motion and BayRuntimeCacheProvider; page frames remain route-owned.
 */
import { Categories } from './pages/Categories';
import { CreateDossier } from './pages/CreateDossier';
import { parseWorkflowRoute } from './lib/workflows';
import { Component, type ReactNode } from 'react';
import { EmptyState } from './components/EmptyState';
import { useNavigation } from './hooks/useNavigation';
import { Dossier } from './pages/Dossier';
import { Home } from './pages/Home';
import { HomeFrame } from './components/home/HomeFrame';
import { useRouteMotion } from './hooks/useRouteMotion';
import { ScannerPreview } from './pages/ScannerPreview';
import { BayRuntimeCacheProvider } from './components/home/BayRuntimeCacheProvider';
import { TunnelCaptureProvider } from './hooks/useTunnelCapture';

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
  const workflowRoute = parseWorkflowRoute(pathname);
  let dossierId: string | undefined;
  try {
    if (match) dossierId = decodeURIComponent(match[1]);
  } catch {
    // An invalid deep link is handled by the missing-page view.
  }
  return (
    <ErrorBoundary>
      <TunnelCaptureProvider>
        <BayRuntimeCacheProvider>
          <div ref={routeRef} className="route-viewport">
            {pathname === '/' ? (
              <Categories />
            ) : pathname === '/preview/expertise' ? (
              <ScannerPreview />
            ) : workflowRoute?.creating && workflowRoute.category.type !== 'forfait_expertise' ? (
              <CreateDossier key={workflowRoute.category.type} type={workflowRoute.category.type} />
            ) : workflowRoute ? (
              <Home key={workflowRoute.category.type} category={workflowRoute.category} />
            ) : dossierId ? (
              <HomeFrame variant="dossier">
                <Dossier key={dossierId} dossierId={dossierId} />
              </HomeFrame>
            ) : (
              <HomeFrame>
                <div className="home-state">
                  <EmptyState
                    title="Cette page est introuvable"
                    description="Retrouvez vos expertises depuis l’accueil."
                    onRetry={() => navigate('/')}
                    actionLabel="Retour à l’accueil"
                  />
                </div>
              </HomeFrame>
            )}
          </div>
        </BayRuntimeCacheProvider>
      </TunnelCaptureProvider>
    </ErrorBoundary>
  );
}
