/** Limits island error presentation without changing workflow state; depends on React effect cleanup and stable operation identities. */
import { useEffect, useState } from 'react';

export const islandErrorDuration = 5000;

export function useIslandErrorTimeout(errorKey: string | null) {
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  useEffect(() => {
    setDismissedError(null);
    if (!errorKey) return;
    // Polling updates keep the same operation key so persistent failures cannot restart their own notice.
    const timer = setTimeout(() => setDismissedError(errorKey), islandErrorDuration);
    return () => clearTimeout(timer);
  }, [errorKey]);
  return errorKey !== null && dismissedError === errorKey;
}
