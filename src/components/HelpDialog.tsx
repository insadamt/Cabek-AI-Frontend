import { ArrowUpRight, FileCheck2, Image, ScanLine, Settings2 } from 'lucide-react';
import { Modal } from './Modal';
import { apiBaseUrl, isPreview } from '../lib/api';

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Votre espace d’expertise" onClose={onClose} className="help-dialog">
      <p className="modal-intro">De vos photos à une expertise claire, en quelques étapes.</p>
      <div className="help-step">
        <span>
          <ScanLine size={20} />
        </span>
        <div>
          <h3>01. Retrouvez votre dossier</h3>
          <p>
            Recherchez un véhicule, une immatriculation ou une référence. Vérifiez le véhicule avant
            de lancer l’analyse.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>
          <Image size={20} />
        </span>
        <div>
          <h3>02. Suivez l’analyse</h3>
          <p>
            Le suivi indique les photos réellement traitées. Vous pouvez revenir aux dossiers
            pendant le traitement.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>
          <FileCheck2 size={20} />
        </span>
        <div>
          <h3>03. Consultez l’expertise</h3>
          <p>
            Explorez les pièces, comparez les annotations et téléchargez le rapport. Un résultat
            peut conserver des prix incomplets.
          </p>
        </div>
      </div>
      <div className="connection-help">
        <h3>
          <Settings2 size={16} />
          {isPreview ? 'Connecter votre API' : 'Service connecté'}
        </h3>
        {isPreview ? (
          <>
            <p>
              Vous consultez des données d’exemple. Pour utiliser vos dossiers, renseignez l’adresse
              de votre service dans <code>.env</code>, puis redémarrez le frontend.
            </p>
            <pre>VITE_API_BASE_URL=http://localhost:8000</pre>
            <p className="small-copy">
              Utilisez le port affiché par votre API. Le serveur de développement transmet les
              requêtes au service. En production, autorisez l’origine du frontend dans
              CABEK_CORS_ORIGINS côté serveur.
            </p>
          </>
        ) : (
          <>
            <p>Les dossiers proviennent de votre service CABEK AI.</p>
            <a className="text-link" href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">
              Documentation du service <ArrowUpRight size={14} />
            </a>
          </>
        )}
      </div>
      <p className="help-note">
        Une analyse réussie est conservée définitivement. Les montants restent provisoires et
        doivent être vérifiés par un expert.
      </p>
    </Modal>
  );
}
