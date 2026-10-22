import { useState } from 'react';
import { ChevronDown, Images, ScanLine, Wallet } from 'lucide-react';
import type { Detection, Part, Photo } from '../../types';
import { resolveMediaUrl } from '../../lib/api';
import { getDamagePresentation, resolveSourcePhotoIndex } from '../../lib/partPresentation';
import { getPhotoDisplayUrls } from '../../lib/photoDisplayUrls';
import { AnimatedDetails } from '../AnimatedDetails';
import { DamageBadge } from './DamageBadge';
import { FinancialDetails } from './FinancialDetails';
import { PartIllustration } from './PartIllustration';

const severityLabels: Record<string, string> = {
  low: 'Légère',
  medium: 'Modérée',
  high: 'Importante',
};

interface PartDetailsProps {
  part: Part;
  detections: Detection[];
  photos: Photo[];
  onShowPhoto: (index: number) => void;
}

export function PartDetails({ part, detections, photos, onShowPhoto }: PartDetailsProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const sources = [
    ...new Set([
      ...(part.source_images ?? []),
      ...detections.flatMap((detection) => detection.images_sources ?? []),
    ]),
  ];
  const resolvedSources = sources.map((source) => resolveSourcePhotoIndex(source, photos));
  const photoIndices = [
    ...new Set(resolvedSources.filter((index): index is number => index !== undefined)),
  ];
  const visiblePhotoIndices = showAllPhotos ? photoIndices : photoIndices.slice(0, 4);
  const hasUnavailableSources = resolvedSources.some((index) => index === undefined);

  return (
    <div className="drawer-part-details">
      <div className="drawer-part-art">
        <PartIllustration part={part} />
        <span>Illustration générique</span>
      </div>
      <section className="drawer-section">
        <h3>
          <ScanLine size={17} aria-hidden="true" />
          Dommages identifiés
        </h3>
        {detections.length ? (
          detections.map((detection, index) => (
            <div className="drawer-damage-row" key={`${detection.detection_id}-${index}`}>
              <DamageBadge type={detection.type} />
              <span>
                <small>Gravité</small>
                {severityLabels[detection.niveau ?? ''] ?? 'Non précisée'}
              </span>
            </div>
          ))
        ) : (
          <p>Aucun détail de dommage associé à cette pièce.</p>
        )}
      </section>
      <section className="drawer-section">
        <h3>
          <Wallet size={17} aria-hidden="true" />
          Chiffrage de la pièce
        </h3>
        {part.financial ? (
          <FinancialDetails financial={part.financial} />
        ) : (
          <p>Chiffrage indisponible pour cette pièce.</p>
        )}
      </section>
      {!!sources.length && (
        <section className="drawer-section">
          <h3>
            <Images size={17} aria-hidden="true" />
            Photos sources
          </h3>
          <div className="drawer-source-photos">
            {visiblePhotoIndices.map((index) => (
              <button
                type="button"
                key={index}
                className="source-photo-button"
                onClick={() => onShowPhoto(index)}
              >
                <Images size={22} aria-hidden="true" />
                <img
                  src={resolveMediaUrl(getPhotoDisplayUrls(photos[index]).original)}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
                <span>Voir la photo {index + 1}</span>
              </button>
            ))}
          </div>
          {photoIndices.length > 4 && (
            <button
              type="button"
              className="text-link drawer-show-more-photos"
              onClick={() => setShowAllPhotos(!showAllPhotos)}
            >
              {showAllPhotos
                ? 'Réduire les vues'
                : `Voir les ${photoIndices.length - 4} autres vues`}
            </button>
          )}
          {hasUnavailableSources && (
            <p className="unresolved-source">Certaines vues sources ne sont pas disponibles.</p>
          )}
        </section>
      )}
      {!!detections.length && (
        <AnimatedDetails
          className="drawer-detection-info"
          summary={
            <>
              Informations de détection <ChevronDown size={16} className="details-chevron" />
            </>
          }
        >
          <dl>
            {detections.map((detection, index) => (
              <div key={`${detection.detection_id}-${index}`}>
                <dt>{getDamagePresentation(detection.type).label} · Confiance</dt>
                <dd>
                  {typeof detection.confiance === 'number' &&
                  Number.isFinite(detection.confiance) &&
                  detection.confiance >= 0 &&
                  detection.confiance <= 1
                    ? `${Math.round(detection.confiance * 100)} %`
                    : 'Non précisée'}
                </dd>
              </div>
            ))}
          </dl>
        </AnimatedDetails>
      )}
    </div>
  );
}
