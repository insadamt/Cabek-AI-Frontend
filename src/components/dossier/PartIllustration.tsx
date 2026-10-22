import { Layers3 } from 'lucide-react';
import { useState } from 'react';
import type { Part } from '../../types';
import { getPartIllustration } from '../../lib/partPresentation';

export function PartIllustration({ part }: { part: Part }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="part-reference-art" aria-hidden="true">
      {failed ? (
        <Layers3 size={32} strokeWidth={1.2} />
      ) : (
        <img
          src={`/images/parts/${getPartIllustration(part)}.webp`}
          alt=""
          width={240}
          height={180}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
