/** Central settings destination reached by five island clicks; depends on HomeFrame and hardware settings sections. */
import { useEffect, useRef } from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { navigate } from '../hooks/useNavigation';
import { LightingSettings } from '../components/LightingSettings';
import '../styles/settings.css';

export function Settings() {
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
          <a href="#lighting-settings-title" aria-current="page">
            Matériel & éclairage
          </a>
        </nav>
        <LightingSettings />
      </div>
    </div>
  );
}
