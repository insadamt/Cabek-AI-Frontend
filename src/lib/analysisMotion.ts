import gsap from 'gsap';
import { observeReducedMotion } from './motion';

export function waitForAnalysisDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    function cancel() {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

interface DocumentFlightOptions {
  paper: HTMLElement;
  island: HTMLElement;
  returning: boolean;
  signal: AbortSignal;
}

interface DocumentFlightGeometry {
  paperWidth: number;
  paperHeight: number;
  paperBounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
  islandBounds: Pick<DOMRect, 'left' | 'width' | 'bottom'>;
  paperStyle: Pick<CSSStyleDeclaration, 'borderRadius' | 'borderColor' | 'boxShadow'>;
}

export function createDocumentFusionTimeline(
  flight: HTMLElement,
  geometry: DocumentFlightGeometry,
  onContact: () => void,
) {
  const { paperWidth, paperHeight, paperBounds, islandBounds, paperStyle } = geometry;
  const centeredX = islandBounds.left + islandBounds.width / 2 - paperWidth / 2;
  const feedingScaleX = 0.3;
  const feedingScaleY = 0.36;
  const restingPosition = {
    x: paperBounds.left + (paperBounds.width - paperWidth) / 2,
    y: paperBounds.top + (paperBounds.height - paperHeight) / 2,
    scaleX: paperBounds.width / paperWidth,
    scaleY: paperBounds.height / paperHeight,
    rotation: 0,
    borderRadius: paperStyle.borderRadius,
    borderColor: paperStyle.borderColor,
    boxShadow: paperStyle.boxShadow,
  };

  // Feeding intact paper through the viewport edge makes release reveal the same content in reverse.

  gsap.set(flight, restingPosition);
  return gsap
    .timeline({ paused: true })
    .to(
      flight,
      {
        x: centeredX,
        y: islandBounds.bottom + paperHeight * 0.3 + 44 - paperHeight / 2,
        scaleX: 0.52,
        scaleY: 0.6,
        rotation: -3,
        duration: 0.46,
        ease: 'power2.in',
      },
      0,
    )
    .to(
      flight,
      {
        y: islandBounds.bottom + paperHeight * 0.18 - 2 - paperHeight / 2,
        scaleX: feedingScaleX,
        scaleY: feedingScaleY,
        rotation: 0,
        duration: 0.32,
        ease: 'power2.out',
      },
      0.46,
    )
    .call(onContact, [], 0.78)
    .to(
      flight,
      {
        y: islandBounds.bottom - (paperHeight * feedingScaleY) / 2 - 2 - paperHeight / 2,
        duration: 0.62,
        ease: 'power1.inOut',
      },
      0.78,
    )
    .to(
      flight,
      {
        boxShadow: '0px 0px 0px 0px rgba(0, 0, 0, 0)',
        duration: 0.3,
        ease: 'power2.inOut',
      },
      0.78,
    );
}

export function flyAnalysisDocument({ paper, island, returning, signal }: DocumentFlightOptions) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const paperBounds = paper.getBoundingClientRect();
    if (paperBounds.width <= 0 || paperBounds.height <= 0) return resolve();
    const islandBounds = island.getBoundingClientRect();
    const viewport = document.createElement('div');
    viewport.className = 'analysis-flight-viewport';
    viewport.setAttribute('aria-hidden', 'true');
    viewport.inert = true;

    // The island's lower edge clips the sheet, hiding its final merge without an opacity fade.

    viewport.style.clipPath = `inset(${Math.max(0, islandBounds.bottom - 1)}px 0 0)`;
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.classList.add('analysis-flying-document');

    // The portal escapes the carousel's clipping and perspective while retaining native sheet text.

    Object.assign(clone.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: `${paper.offsetWidth}px`,
      height: `${paper.offsetHeight}px`,
      maxHeight: 'none',
      margin: '0',
      visibility: 'visible',
      pointerEvents: 'none',
      transformOrigin: '50% 50%',
    });
    viewport.append(clone);
    document.body.append(viewport);
    const animation = createDocumentFusionTimeline(
      clone,
      {
        paperWidth: paper.offsetWidth,
        paperHeight: paper.offsetHeight,
        paperBounds,
        islandBounds,
        paperStyle: getComputedStyle(paper),
      },
      () => {
        if (!returning) island.dataset.fusion = 'absorbing';
      },
    );

    function cleanUp() {
      stopObserving();
      signal.removeEventListener('abort', cancel);
      delete island.dataset.fusion;
      viewport.remove();
    }
    function finish() {
      cleanUp();
      resolve();
    }
    function cancel() {
      animation.kill();
      cleanUp();
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal.addEventListener('abort', cancel, { once: true });
    const stopObserving = observeReducedMotion(() => {
      animation.progress(returning ? 0 : 1);
    });
    animation.eventCallback(returning ? 'onReverseComplete' : 'onComplete', finish);
    animation.progress(returning ? 1 : 0, true);
    if (returning) {
      island.dataset.fusion = 'releasing';
      animation.reverse();
    } else animation.play();
  });
}
