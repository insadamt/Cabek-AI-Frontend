import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FolderClosed,
  LayoutGrid,
  Menu,
  ScanLine,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Brand } from './Brand';
import { HelpDialog } from './HelpDialog';
import { isPreview } from '../lib/api';
import { navigate, useNavigation } from '../hooks/useNavigation';
import { useSelectionIndicator } from '../hooks/useSelectionIndicator';

export function Layout({ children }: { children: ReactNode }) {
  const { pathname, searchParams, location } = useNavigation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const selectedStatus = searchParams.get('status');
  const detail = pathname.startsWith('/dossiers/');
  const navigationRef = useSelectionIndicator<HTMLElement>(
    `${pathname}-${selectedStatus}`,
    '.active',
  );
  const navItems = [
    { name: 'Vue d’ensemble', icon: LayoutGrid, href: '/', active: pathname === '/' },
    {
      name: 'Tous les dossiers',
      icon: FolderClosed,
      href: '/dossiers',
      active: pathname === '/dossiers' && !selectedStatus,
    },
    {
      name: 'En analyse',
      icon: ScanLine,
      href: '/dossiers?status=processing',
      active: pathname === '/dossiers' && selectedStatus === 'processing',
    },
    {
      name: 'Résultats',
      icon: FileCheck2,
      href: '/dossiers?status=completed',
      active: pathname === '/dossiers' && selectedStatus === 'completed',
    },
  ];
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);
  useEffect(() => {
    const viewport = matchMedia('(max-width: 767px)');
    const updateNavigationMode = () => setMobileNavigation(viewport.matches);
    updateNavigationMode();
    viewport.addEventListener('change', updateNavigationMode);
    return () => viewport.removeEventListener('change', updateNavigationMode);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <button
        className={`sidebar-scrim ${menuOpen ? 'is-visible' : ''}`}
        aria-label="Fermer la navigation"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        disabled={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}
        aria-label="Navigation principale"
        inert={mobileNavigation && !menuOpen}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeMenu();
        }}
      >
        <a
          className="brand-link"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate('/');
          }}
        >
          <Brand />
        </a>
        <button
          className="icon-button mobile-close"
          onClick={closeMenu}
          aria-label="Fermer la navigation"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          <span className="workspace-symbol">C</span>
          <div>
            <strong>Espace expertise</strong>
            <span>Expertise automobile</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <div className="nav-caption">ESPACE DE TRAVAIL</div>
        <nav ref={navigationRef} className="sidebar-navigation">
          <span className="selection-indicator" aria-hidden="true" />
          {navItems.map((item) => (
            <a
              key={item.href}
              className={`nav-link ${item.active ? 'active' : ''}`}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              onClick={(event) => {
                if (!event.metaKey && !event.ctrlKey) {
                  event.preventDefault();
                  navigate(item.href);
                }
              }}
            >
              <item.icon size={18} strokeWidth={1.7} />
              <span>{item.name}</span>
              {item.active && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-symbol">✳</span>
            <h3>
              La précision,
              <br />
              en toute simplicité.
            </h3>
            <p>Un espace pensé pour vos expertises du quotidien.</p>
            <button onClick={() => setHelpOpen(true)}>
              Découvrir le guide <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="sidebar-help" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={17} />
            Aide et informations
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-footer">
            <span className="footer-logo">C</span>
            <div>
              <strong>CABEK AI</strong>
              <span>Votre espace professionnel</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menuButtonRef}
              className="icon-button mobile-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir la navigation"
              aria-expanded={menuOpen}
            >
              <Menu size={20} />
            </button>
            <span>Espace de travail</span>
            <ChevronRight size={13} />
            <strong>{detail ? 'Dossier' : pathname === '/' ? 'Vue d’ensemble' : 'Dossiers'}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="topbar-divider" />
            <button className="connection-status" onClick={() => setHelpOpen(true)}>
              <span className={isPreview ? 'connection-outline' : 'connection-dot'} />
              {isPreview ? 'Mode aperçu' : 'API configurée'}
            </button>
            <button
              className="icon-button"
              aria-label="Ouvrir le guide d’utilisation"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={19} strokeWidth={1.5} />
            </button>
          </div>
        </header>
        {isPreview && (
          <div className="preview-banner">
            <span>
              <span className="preview-dot" />
              Aperçu en lecture seule{' '}
              <span className="preview-banner-detail">· Données et illustrations d’exemple</span>
            </span>
            <button onClick={() => setHelpOpen(true)}>
              Connecter l’API <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="main-footer">
          <span>© {new Date().getFullYear()} CABEK AI</span>
          <span>L’intelligence au service de l’expertise.</span>
        </footer>
      </div>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
