import gsap from 'gsap';
import { flushSync } from 'react-dom';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { animateGridFolderPositions, captureGridFolderPositions } from '../lib/gridFolderMotion';
import type { DossierSummary } from '../types';

export function useGridFolderSelection(sectionRef: RefObject<HTMLElement | null>) {
  const [selectedFolder, setSelectedFolder] = useState<DossierSummary | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const returning = useRef(false);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const scrollPosition = useRef(0);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function selectFolder(dossier: DossierSummary) {
    if (selectedFolder || busy || !sectionRef.current) return;
    const grid = sectionRef.current.querySelector<HTMLElement>('.home-folder-grid')!;
    scrollPosition.current = grid.scrollTop;
    selectedButton.current = document.activeElement as HTMLButtonElement;
    const positions = captureGridFolderPositions(sectionRef.current);
    const selectedPreview = sectionRef.current.querySelector<HTMLElement>(
      `[data-folder-id="${CSS.escape(dossier.dossier_id)}"] .home-grid-folder-preview`,
    )!;
    sectionRef.current.style.setProperty(
      '--focused-folder-width',
      `${selectedPreview.offsetWidth}px`,
    );
    setBusy(true);
    const neighboringFolders = Array.from(
      grid.querySelectorAll<HTMLElement>('.home-grid-folder'),
    ).filter((folder) => folder.dataset.folderId !== dossier.dossier_id);
    animation.current = gsap.timeline().to(neighboringFolders, {
      opacity: 0,
      duration: reducedMotion() ? 0 : 0.12,
      onComplete: () => {
        if (!sectionRef.current) return;
        flushSync(() => {
          setSelectedFolder(dossier);
        });
        grid.scrollTop = 0;
        animation.current = animateGridFolderPositions(
          sectionRef.current,
          positions,
          reducedMotion(),
          () => {
            // Measure extraction after the folder settles so extraction uses its final position.

            sectionRef.current
              ?.querySelector('.home-grid-folder:not([hidden]) .dossier-folder')
              ?.dispatchEvent(new Event('folder-layout-settled'));
            setDocumentOpen(true);
            setBusy(false);
            sectionRef.current
              ?.querySelector<HTMLButtonElement>('.home-search-back')
              ?.focus({ preventScroll: true });
          },
        );
        gsap.set(neighboringFolders, { clearProps: 'opacity' });
      },
    });
  }

  function restoreGrid() {
    if (!sectionRef.current) return;
    const positions = captureGridFolderPositions(sectionRef.current);
    flushSync(() => setSelectedFolder(null));
    sectionRef.current.querySelector<HTMLElement>('.home-folder-grid')!.scrollTop =
      scrollPosition.current;
    returning.current = false;
    animation.current = animateGridFolderPositions(
      sectionRef.current,
      positions,
      reducedMotion(),
      () => {
        setBusy(false);
        selectedButton.current?.focus({ preventScroll: true });
      },
    );
  }

  function returnToGrid() {
    if (!selectedFolder || busy) return;
    returning.current = true;
    setBusy(true);
    setDocumentOpen(false);
  }

  function handleDocumentMotionChange(moving: boolean) {
    // Return the paper to its pocket before moving the folder back to its original grid cell.

    if (!moving && returning.current) {
      returning.current = false;
      queueMicrotask(restoreGrid);
    }
  }

  useEffect(
    () => () => {
      animation.current?.kill();
    },
    [],
  );
  return {
    selectedFolder,
    documentOpen,
    busy,
    selectFolder,
    returnToGrid,
    handleDocumentMotionChange,
  };
}
