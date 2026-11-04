/** Coordinates directional page exits and collection entrances; depends on scoped GSAP journeys and existing folder flight ownership. */
import type gsap from 'gsap';
import { runJourneyMotion } from './journeyMotion';
type JourneyTimeline = ReturnType<typeof gsap.timeline>;
type MotionVars = gsap.TweenVars;

export function addPageExit(timeline: JourneyTimeline, scope: HTMLElement) {
  function move(selector: string, motion: MotionVars) {
    const nodes = scope.querySelectorAll(selector);
    if (nodes.length) timeline.to(nodes, motion, 0);
  }
  // Animate the title itself so its absolutely positioned Back control keeps its frame anchor.

  move('.category-folder-heading, .category-heading h1, .category-heading .workflow-primary', {
    opacity: 0,
    y: -14,
    duration: 0.2,
  });
  move('.capture-stage-nav, .category-heading .back-link', { opacity: 0, x: -22, duration: 0.22 });
  move('.capture-controls, .category-browse-controls', { opacity: 0, x: 22, duration: 0.22 });
  move('.home-bottom-bar, .carousel-navigation, .capture-finale', {
    opacity: 0,
    y: 18,
    duration: 0.22,
  });
  move('.category-stage-content', { opacity: 0, scale: 0.96, y: 12, duration: 0.28 });
}

export function exitPage(scope: HTMLElement, onComplete: () => void, onCancel?: () => void) {
  const inert = scope.inert;
  scope.inert = true;
  return runJourneyMotion({
    deferRestore: true,
    build: (timeline) => {
      addPageExit(timeline, scope);
      const folders = scope.querySelectorAll('.carousel-folder-slot, .category-folder-choice');
      if (folders.length)
        timeline.to(folders, { opacity: 0, y: '-=28', scale: '-=0.04', duration: 0.26 }, 0);
    },
    restore: () => {
      scope.inert = inert;
    },
    onComplete,
    onCancel,
  });
}

export function addCollectionEntrance(
  timeline: JourneyTimeline,
  scope: HTMLElement,
  start: number,
) {
  function reveal(selector: string, from: MotionVars, offset = 0, duration = 0.24) {
    const nodes = scope.querySelectorAll(selector);
    if (nodes.length)
      timeline.fromTo(
        nodes,
        from,
        { opacity: 1, x: 0, y: 0, scale: 1, duration, ease: 'power2.out' },
        start + offset,
      );
  }
  reveal('.category-heading h1, .category-heading .workflow-primary', { opacity: 0, y: -14 });
  reveal('.category-heading .back-link', { opacity: 0, x: -18 });
  reveal('.category-browse-controls .segmented-control', { opacity: 0, x: -18 }, 0.03, 0.26);
  reveal('.category-filters', { opacity: 0, x: 18 }, 0.03, 0.26);
  reveal('.home-bottom-bar .home-folder-search', { opacity: 0, y: 18 }, 0.08, 0.28);
  reveal('.home-bottom-bar .home-open-dossier', { opacity: 0, y: 18, scale: 0.94 }, 0.12, 0.28);
  reveal('.carousel-navigation', { opacity: 0, y: 10 }, 0.1);
  reveal('.home-bottom-bar .dossier-menu-trigger', { opacity: 0, y: 10 }, 0.14);
}

export function enterEmptyCollection(scope: HTMLElement, onComplete: () => void) {
  const inert = scope.inert;
  scope.inert = true;
  const handoff = scope.dataset.handoff;
  delete scope.dataset.handoff;
  return runJourneyMotion({
    build: (timeline) => {
      addCollectionEntrance(timeline, scope, 0);
      const message = scope.querySelectorAll('.home-state');
      timeline.fromTo(message, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.24 }, 0.08);
    },
    restore: () => {
      scope.inert = inert;
      if (handoff) scope.dataset.handoff = handoff;
    },
    onComplete: () => {
      delete scope.dataset.handoff;
      onComplete();
    },
  });
}
