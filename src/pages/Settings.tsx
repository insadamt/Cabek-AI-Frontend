/** Central settings destination reached by five island clicks; depends on HomeFrame and hardware settings sections. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { navigate } from '../hooks/useNavigation';
import { LightingSettings } from '../components/LightingSettings';
import { OperationSettings } from '../components/OperationSettings';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { HardwareDiagnostics } from '../components/HardwareDiagnostics';
import { DiagnosticLogs } from '../components/DiagnosticLogs';
import type { DiagnosticSnapshot } from '../lib/diagnosticsApi';
import '../styles/settings.css';
import '../styles/diagnostics.css';

export function Settings() {
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="settings-page">
      <button className="settings-back" onClick={() => navigate('/')}>
        <ArrowLeft size={16} />
        Retour à l’accueil
      </button>
      <header className="settings-heading">
        <span className="settings-heading-icon">
          <Settings2 size={24} />
        </span>
        <div>
          <p className="eyebrow">CABEK AI</p>
          <h1 ref={heading} tabIndex={-1}>
            Paramètres
          </h1>
          <p>Configuration et tests du tunnel.</p>
        </div>
      </header>
      <div className="settings-layout">
        <nav className="settings-navigation" aria-label="Sections des paramètres">
          <a href="#operation-settings-title">Mode de fonctionnement</a>
          <a href="#diagnostics-title">Diagnostics</a>
          <a href="#hardware-diagnostics-title">Tests manuels</a>
          <a href="#diagnostic-logs-title">Journaux et erreurs</a>
          <a href="#lighting-settings-title">Matériel & éclairage</a>
        </nav>
        <div className="settings-sections">
          <OperationSettings />
          <DiagnosticsPanel onSnapshot={setSnapshot} />
          <LightingSettings />
          <HardwareDiagnostics />
          <DiagnosticLogs snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}
