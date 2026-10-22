import { CircleCheck } from 'lucide-react';
import type { AnalysisResult } from '../types';
import { getPartDetections } from '../lib/partPresentation';
import { PartCard } from './dossier/PartCard';

export function PartsList({
  result,
  onOpenPart,
  selectedPartIndex,
}: {
  result: AnalysisResult;
  onOpenPart: (partIndex: number) => void;
  selectedPartIndex?: number;
}) {
  return (
    <section className="parts-section estimate-parts-section" aria-label="Pièces et dommages">
      <div className="section-title">
        <h2>Pièces et dommages</h2>
        <span className="count-pill">{result.parts.length}</span>
      </div>
      <p className="section-description">Illustrations génériques</p>
      {!result.parts.length && (
        <div className="surface no-damage">
          <CircleCheck size={30} strokeWidth={1.3} />
          <h3>Aucune pièce endommagée répertoriée</h3>
          <p>Les photos et les éventuelles détections restent à vérifier avant toute décision.</p>
        </div>
      )}
      <div className="estimate-parts-grid">
        {result.parts.map((part, index) => (
          <PartCard
            key={`${part.part_id ?? 'part'}-${index}`}
            part={part}
            detections={getPartDetections(part, result.detections)}
            selected={selectedPartIndex === index}
            onOpenDetails={() => onOpenPart(index)}
          />
        ))}
      </div>
    </section>
  );
}
