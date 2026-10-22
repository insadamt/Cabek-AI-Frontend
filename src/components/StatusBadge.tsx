import { Check, Circle, Clock3, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { ScanStatus } from '../types';
import { shortStatusLabels } from '../lib/format';
import { AnimatedText } from './AnimatedText';

const icons = {
  not_analyzed: Circle,
  queued: Clock3,
  processing: LoaderCircle,
  completed: Check,
  failed: TriangleAlert,
};

export function StatusBadge({ status }: { status: ScanStatus }) {
  const Icon = icons[status];
  return (
    <span className={`status-badge status-${status}`}>
      <AnimatedText text={status}>
        <Icon size={12} className={status === 'processing' ? 'spin' : ''} aria-hidden="true" />
        {shortStatusLabels[status]}
      </AnimatedText>
    </span>
  );
}
