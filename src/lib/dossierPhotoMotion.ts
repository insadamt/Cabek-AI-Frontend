import gsap from 'gsap';
import type { OriginalPhoto } from '../types';
import { resolveMediaUrl } from './api';
import { getOriginalPhotoDisplayUrl } from './photoDisplayUrls';
import { getPreparedImage } from './preparedImages';
import { observeReducedMotion, prefersReducedMotion } from './motion';

interface PhotoFlightOptions {
  folder: HTMLElement;
  island: HTMLElement;
  photos: OriginalPhoto[];
  signal: AbortSignal;
  sequential?: boolean;
}

export function flyDossierPhotos({
  folder,
  island,
  photos,
  signal,
  sequential = false,
}: PhotoFlightOptions) {
  signal.throwIfAborted();
  if (!photos.length || prefersReducedMotion()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const origin = island.getBoundingClientRect();
    const destination = folder.getBoundingClientRect();
    const flight = document.createElement('div');
    flight.className = 'dossier-photo-flight';
    flight.setAttribute('aria-hidden', 'true');
    flight.inert = true;
    const timeline = gsap.timeline({ paused: true });
    (sequential ? photos : photos.slice(0, 4)).forEach((photo, index) => {
      const card = document.createElement('div');
      card.className = 'dossier-photo-flight-card';
      const source = resolveMediaUrl(getOriginalPhotoDisplayUrl(photo));

      // Decorative cards reuse prepared previews to avoid adding image work during navigation.

      if (sequential || getPreparedImage(source)) {
        const image = document.createElement('img');
        image.src = source;
        image.alt = '';
        card.append(image);
      }
      if (!sequential && index === 3 && photos.length > 4) {
        const count = document.createElement('span');
        count.textContent = `+${photos.length - 4}`;
        card.append(count);
      }
      flight.append(card);
      // A short overlapping stack communicates collection transfer without adding a separate wait.

      timeline
        .fromTo(
          card,
          {
            x: origin.left + origin.width / 2 - 40,
            y: origin.bottom - 8,
            scale: 0.3,
            opacity: 0,
            rotation: (index - 1.5) * 4,
          },
          {
            x: destination.left + destination.width / 2 - 40,
            y: destination.top + destination.height * 0.3,
            scale: 0.8,
            opacity: 1,
            duration: 0.25,
            ease: 'power2.out',
          },
          index * (sequential ? 0.18 : 0.035),
        )
        .to(
          card,
          {
            y: destination.top + destination.height * 0.65,
            scale: 0.4,
            opacity: 0,
            duration: 0.15,
            ease: 'power2.in',
          },
          index * (sequential ? 0.18 : 0.035) + 0.25,
        );
    });
    document.body.append(flight);
    function cleanUp() {
      stopObserving();
      signal.removeEventListener('abort', cancel);
      window.removeEventListener('resize', settle);
      flight.remove();
      timeline.kill();
    }
    function cancel() {
      cleanUp();
      reject(new DOMException('Aborted', 'AbortError'));
    }
    function settle() {
      timeline.progress(1);
    }
    const stopObserving = observeReducedMotion(settle);
    signal.addEventListener('abort', cancel, { once: true });
    window.addEventListener('resize', settle);
    timeline.eventCallback('onComplete', () => {
      cleanUp();
      resolve();
    });
    timeline.play();
  });
}
