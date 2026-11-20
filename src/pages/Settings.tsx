/**
 * Presents focused maintenance panels inside Cabek's shared frame and neutral visual system.
 * Depends on hash-based navigation and existing controls; panel changes preserve unsaved fields.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Lightbulb,
  ListFilter,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { navigate } from '../hooks/useNavigation';
import { useSettingsSection } from '../hooks/useSettingsSection';
import { LightingSettings } from '../components/LightingSettings';
import { OperationSettings } from '../components/OperationSettings';
import { CameraSettings } from '../components/CameraSettings';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { HardwareDiagnostics } from '../components/HardwareDiagnostics';
import { DiagnosticLogs } from '../components/DiagnosticLogs';
import { SettingsGuide } from '../components/SettingsGuide';
import { isPreview } from '../lib/api';
import { restoreSettingsDefaults } from '../lib/restoreSettingsDefaults';
import type { DiagnosticSnapshot } from '../lib/diagnosticsApi';
import '../styles/settings.css';
import '../styles/diagnostics.css';
import '../styles/settings-controls.css';
import '../styles/settings-guide.css';

const sections = [
  {
    id: 'operation-settings-title',
    label: 'Fonctionnement',
    description: 'Mode de capture',
    group: 'Installation',
    icon: SlidersHorizontal,
  },
  {
    id: 'diagnostics-title',
    label: 'Diagnostics',
    description: 'État des services',
    group: 'Maintenance',
    icon: Activity,
  },
  {
    id: 'lighting-settings-title',
    label: 'Éclairage',
    description: 'Couleurs et effets',
    group: 'Installation',
    icon: Lightbulb,
  },
  {
    id: 'hardware-diagnostics-title',
    label: 'Tests manuels',
    description: 'Matériel et parcours',
    group: 'Maintenance',
    icon: Wrench,
  },
  {
    id: 'diagnostic-logs-title',
    label: 'Journaux',
    description: 'Événements et export',
    group: 'Maintenance',
    icon: ListFilter,
  },
  {
    id: 'settings-guide-title',
    label: 'Documentation',
    description: 'Guide et dépannage',
    group: 'Ressources',
    icon: BookOpen,
  },
];
const sectionIds = sections.map(({ id }) => id);

export function Settings() {
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const activeSection = useSettingsSection(sectionIds, page);
  useEffect(() => {
    // StrictMode remounts immediately; only a real departure resets hardware tests.
    clearTimeout(exitTimer.current);
    const restore = () => {
      void restoreSettingsDefaults();
    };
    window.addEventListener('pagehide', restore);
    return () => {
      window.removeEventListener('pagehide', restore);
      exitTimer.current = setTimeout(restore, 0);
    };
  }, []);

  useEffect(() => {
    if (!sectionIds.includes(window.location.hash.slice(1))) heading.current?.focus();
  }, []);

  const panels: Record<string, ReactNode> = {
    'operation-settings-title': (
      <>
        <CameraSettings active={activeSection === 'operation-settings-title'} />
        <OperationSettings />
      </>
    ),
    'diagnostics-title': <DiagnosticsPanel onSnapshot={setSnapshot} />,
    'lighting-settings-title': <LightingSettings />,
    'hardware-diagnostics-title': <HardwareDiagnostics />,
    'diagnostic-logs-title': <DiagnosticLogs snapshot={snapshot} />,
    'settings-guide-title': <SettingsGuide />,
  };

  return (
    <div className="settings-page" ref={page}>
      <button className="settings-back" onClick={() => navigate('/')}>
        <ArrowLeft size={15} aria-hidden="true" />
        Retour à l’accueil
      </button>
      <div className="settings-container">
        <header className="settings-heading">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              Paramètres
            </h1>
            <p>Gérez le fonctionnement et la maintenance de votre tunnel.</p>
          </div>
          <a className="settings-guide-link" href="#settings-guide-title">
            <BookOpen size={15} aria-hidden="true" />
            Consulter le guide
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </header>
        <div className="settings-layout">
          <aside className="settings-sidebar">
            <nav className="settings-navigation" aria-label="Sections des paramètres">
              {['Installation', 'Maintenance', 'Ressources'].map((group) => (
                <div className="settings-nav-group" key={group}>
                  <p className="settings-nav-label">{group}</p>
                  {sections
                    .filter((section) => section.group === group)
                    .map(({ id, label, description, icon: Icon }) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        aria-current={activeSection === id ? 'location' : undefined}
                        aria-controls={`${id}-panel`}
                      >
                        <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                        <span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                        <ChevronRight
                          size={14}
                          className="settings-nav-chevron"
                          aria-hidden="true"
                        />
                      </a>
                    ))}
                </div>
              ))}
            </nav>
            <p className="settings-sidebar-caption">Configuration du tunnel</p>
          </aside>
          <div className="settings-sections">
            {isPreview && (
              <p className="settings-preview-note" role="status">
                <span>Aperçu</span>
                Connectez l’API pour utiliser les commandes du tunnel.
              </p>
            )}
            {/* Keep panels mounted so navigation retains fields, test results and log filters. */}
            {sections.map(({ id }) => (
              <div
                className="settings-section"
                id={`${id}-panel`}
                key={id}
                hidden={activeSection !== id}
              >
                {panels[id]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
