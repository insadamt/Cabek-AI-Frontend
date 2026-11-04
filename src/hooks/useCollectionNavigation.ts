/** Owns prepared collection navigation and page exits for a mounted screen; depends on cancellable journey services and readable API errors. */
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from './useNavigation';
import type { Category } from '../lib/workflows';
import { describeError } from '../lib/api';
import { navigatePreparedCollection } from '../lib/collectionNavigation';
import { exitPage } from '../lib/pageJourneyMotion';

export function useCollectionNavigation() {
  const { navigate } = useNavigation();
  const active = useRef<(() => void) | undefined>(undefined);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.();
    };
  }, []);

  function openCollection(
    category: Category,
    scope: HTMLElement | null,
    options: { folder?: HTMLElement; beforeNavigate?: () => void } = {},
  ) {
    if (!scope) return;
    active.current?.();
    setError('');
    active.current = navigatePreparedCollection({
      category,
      scope,
      ...options,
      navigate,
      onPending: (value) => {
        if (mounted.current) setPending(value);
      },
      onError: (failure) => {
        if (mounted.current) setError(describeError(failure));
      },
    });
  }

  function leavePage(scope: HTMLElement | null, complete: () => void) {
    active.current?.();
    if (!scope) {
      complete();
      return;
    }
    active.current = exitPage(scope, complete);
  }
  return { openCollection, leavePage, pending, error };
}
