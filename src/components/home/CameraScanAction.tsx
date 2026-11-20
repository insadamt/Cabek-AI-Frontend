/** Gate new capture attempts behind camera selection; completed captures retry AI directly using saved photos. */
import { useState, type Ref } from 'react';
import { AnimatedText } from '../AnimatedText';
import { ZoomCameraPicker } from './ZoomCameraPicker';
import type { PhotoPhase } from '../../workflowTypes';

export function CameraScanAction({
  label,
  disabled,
  dossierId,
  phase,
  needsCapture,
  onScan,
  buttonRef,
}: {
  label: string;
  disabled: boolean;
  dossierId?: string;
  phase?: PhotoPhase;
  needsCapture: boolean;
  onScan: (channels?: number[]) => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={buttonRef}
        className="capture-scanner"
        type="button"
        disabled={disabled}
        onClick={() => (needsCapture && dossierId ? setOpen(true) : onScan())}
      >
        <AnimatedText text={label} />
      </button>
      {open && dossierId && !disabled && (
        <ZoomCameraPicker
          key={`${dossierId}-${phase}`}
          dossierId={dossierId}
          phase={phase}
          onClose={() => setOpen(false)}
          onConfirm={(channels) => {
            setOpen(false);
            onScan(channels);
          }}
        />
      )}
    </>
  );
}
