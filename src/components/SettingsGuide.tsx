/** Provide operator documentation beside the settings it explains, including troubleshooting.
 * Depends on native disclosure elements and existing section anchors; reading runs no commands. */
import { Activity, ArrowUpRight, BookOpen, Lightbulb, ListFilter } from 'lucide-react';

export function SettingsGuide() {
  return (
    <section className="settings-card settings-guide" aria-labelledby="settings-guide-title">
      <header className="settings-card-header">
        <div>
          <span className="eyebrow">POUR VOUS ACCOMPAGNER</span>
          <h2 id="settings-guide-title" tabIndex={-1}>
            Documentation
          </h2>
        </div>
        <BookOpen size={24} aria-hidden="true" />
      </header>
      <p className="settings-description">
        Les bons réglages, dans le bon ordre. Ce guide reste accessible même lorsque les services du
        tunnel sont indisponibles.
      </p>
      <ol className="settings-guide-steps" aria-label="Parcours de vérification conseillé">
        <li>
          <Activity size={18} aria-hidden="true" />
          <strong>01 · Vérifier</strong>
          <p>Lancez « Tout tester » dans Diagnostics pour repérer le service à vérifier.</p>
          <a href="#diagnostics-title">
            Voir les diagnostics <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </li>
        <li>
          <Lightbulb size={18} aria-hidden="true" />
          <strong>02 · Tester</strong>
          <p>Si nécessaire, testez l’éclairage ou le parcours concerné depuis ce PC.</p>
          <a href="#hardware-diagnostics-title">
            Voir les tests manuels <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </li>
        <li>
          <ListFilter size={18} aria-hidden="true" />
          <strong>03 · Comprendre</strong>
          <p>Filtrez les journaux, puis exportez les événements utiles au diagnostic.</p>
          <a href="#diagnostic-logs-title">
            Voir les journaux <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </li>
      </ol>
      <div className="settings-guide-topics">
        <details open>
          <summary>Quel mode de fonctionnement choisir ?</summary>
          <div>
            <p>
              <strong>Normal :</strong> l’extérieur passe au vert et l’intérieur s’éteint à la fin
              des photographies.
            </p>
            <p>
              <strong>Lent :</strong> l’extérieur reste rouge, l’intérieur reste allumé et le tunnel
              reste réservé jusqu’à la fin de l’analyse IA, y compris l’attente des métadonnées et
              la cotation.
            </p>
            <p>
              Le changement s’applique à la prochaine capture. Les parcours de vérification avant /
              après terminent toujours leur séquence à la fin des photographies.
            </p>
            <a href="#operation-settings-title">
              Régler le fonctionnement <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </details>
        <details>
          <summary>Comment interpréter les diagnostics ?</summary>
          <div>
            <p>
              « Tout tester » contrôle le navigateur et les services sans allumer de lumière,
              capturer de photographies ou lancer d’analyse IA.
            </p>
            <dl className="settings-guide-statuses">
              <div>
                <dt>Disponible</dt>
                <dd>
                  Le contrôle a réussi. Cela ne confirme pas le fonctionnement physique d’un
                  appareil.
                </dd>
              </div>
              <div>
                <dt>À vérifier / Erreur</dt>
                <dd>Lisez le message et l’action proposée, puis relancez le contrôle concerné.</dd>
              </div>
              <div>
                <dt>Désactivé / Non testé</dt>
                <dd>
                  Le service est désactivé dans l’installation, ou aucun contrôle n’a encore été
                  effectué.
                </dd>
              </div>
            </dl>
            <p>En mode aperçu, seuls les contrôles du navigateur sont disponibles.</p>
          </div>
        </details>
        <details>
          <summary>Comment tester l’éclairage extérieur ?</summary>
          <div>
            <p>
              Les boutons Rouge, Bleu, Vert et Blanc appliquent immédiatement une couleur à pleine
              intensité. Pour un réglage personnalisé, choisissez l’effet, la couleur et
              l’intensité, puis cliquez sur « Tester l’éclairage ».
            </p>
            <p>
              Les animations proposent une durée de cycle, une vitesse et une répétition. Utilisez «
              Éteindre » pour arrêter un effet ; ce bouton reste accessible pendant l’envoi d’un
              test. Quitter les paramètres demande le retour à l’éclairage par défaut.
            </p>
            <p>
              Une commande confirmée indique sa réception initiale. Vérifiez aussi le ruban
              physiquement. La prochaine commande de capture remplace le test manuel.
            </p>
            <a href="#lighting-settings-title">
              Ouvrir les réglages d’éclairage <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </details>
        <details>
          <summary>Que font les tests manuels ?</summary>
          <div>
            <p>
              <strong>Éclairage intérieur :</strong> « Lire l’état » consulte le relais Shelly ; les
              boutons d’allumage et d’arrêt commandent les lumières réelles.
            </p>
            <p>
              <strong>Cotation :</strong> utilisez les identifiants de marque, modèle et pièce de
              votre catalogue. Le test consulte un prix réel sans modifier de dossier.
            </p>
            <p>
              <strong>Capture et analyse :</strong> chargez un dossier destiné aux tests, puis
              cochez la confirmation avant de lancer une action. La capture peut démarrer
              automatiquement l’analyse pour les parcours IA. Les règles d’éligibilité restent
              vérifiées par le serveur.
            </p>
          </div>
        </details>
        <details>
          <summary>Comment préparer un export utile au dépannage ?</summary>
          <div>
            <ol>
              <li>Exécutez les diagnostics pour disposer d’un état récent.</li>
              <li>
                Dans les journaux, choisissez la source et filtrez par niveau, période, composant ou
                dossier. La source « Worker du dossier » nécessite un identifiant de dossier.
              </li>
              <li>
                Mettez l’actualisation en pause et chargez les événements précédents si nécessaire.
              </li>
              <li>
                Cliquez sur « Exporter le diagnostic et les logs » pour télécharger le fichier JSON.
              </li>
            </ol>
            <p>
              L’export comprend les événements affichés, les filtres et le dernier diagnostic reçu.
              Les événements du navigateur restent consultables si l’API est indisponible ; leur
              conservation après rechargement dépend du stockage local.
            </p>
          </div>
        </details>
        <details>
          <summary>Une commande est refusée ou un service ne répond plus ?</summary>
          <div>
            <p>
              <strong>Tunnel réservé :</strong> attendez la fin de la capture ou de l’analyse en
              cours avant de commander manuellement les lumières.
            </p>
            <p>
              <strong>Accès local requis :</strong> ouvrez l’application sur le PC du tunnel. Les
              commandes de maintenance sont réservées à cet accès local.
            </p>
            <p>
              <strong>API indisponible :</strong> vérifiez que CABEK AI est démarré et que la
              connexion est disponible, puis relancez le diagnostic concerné. Consultez les journaux
              du navigateur pour retrouver l’erreur.
            </p>
            <p>
              <strong>Commande reçue, ruban éteint :</strong> vérifiez l’alimentation et la
              connexion du matériel. Les animations nécessitent le firmware RGB compatible.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
