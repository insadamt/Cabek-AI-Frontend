import {
  CircleDot,
  Grid2X2,
  HelpCircle,
  LightbulbOff,
  Minus,
  Slash,
  Unlink,
  Zap,
} from 'lucide-react';
import { getDamagePresentation } from '../../lib/partPresentation';

const damageIcons = {
  d_bosse: CircleDot,
  d_brise: Grid2X2,
  d_casse: Unlink,
  d_crevaison: CircleDot,
  d_fissure: Zap,
  d_lampe_casse: LightbulbOff,
  d_piece_manquante: Minus,
  d_rayure: Slash,
};

export function DamageBadge({ type }: { type?: string }) {
  const damage = getDamagePresentation(type);
  const Icon = damageIcons[damage.key as keyof typeof damageIcons] ?? HelpCircle;
  return (
    <span className={`damage-badge damage-badge-${damage.tone}`}>
      <Icon size={13} aria-hidden="true" />
      {damage.label}
    </span>
  );
}
