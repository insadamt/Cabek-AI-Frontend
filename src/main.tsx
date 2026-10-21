import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import App from './App';
import './styles/base.css';
import './styles/layout.css';
import './styles/overview.css';
import './styles/dashboard.css';
import './styles/dashboard-responsive.css';
import './styles/dossier.css';
import './styles/scan.css';
import './styles/results.css';
import './styles/parts.css';
import './styles/dossier-responsive.css';
import './styles/viewer.css';
import './styles/home.css';
import './styles/dossier-carousel.css';
import './styles/folder-glass.css';
import './styles/folder-document.css';
import './styles/home-responsive.css';
import './styles/folder-mobile.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
