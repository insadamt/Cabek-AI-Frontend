/**
 * Art-directed category footage, with final-frame posters as the dependable resting state.
 * Depends on local cinematic assets and GSAP; it keeps rendering and model controls out of the UI.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import gsap from 'gsap';
import { createCategoryClipPlayback } from '../../lib/categoryClipPlayback';
import type { Category } from '../../lib/workflows';

const assetNames: Record<Category['type'], string> = {
  forfait_expertise: 'expertise',
  chiffrage_rapide: 'quick',
  verification: 'verification',
};

function subscribeToMotionPreference(listener: () => void) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener?.('change', listener);
  return () => preference.removeEventListener?.('change', listener);
}

export function useStageReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
}

interface VisualLayer {
  category: Category;
  sequence: number;
}

interface CategoryClipProps {
  category: Category;
  selected: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}

function CategoryClip({ category, selected, reducedMotion, onReady }: CategoryClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<ReturnType<typeof createCategoryClipPlayback> | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [posterStatus, setPosterStatus] = useState<'pending' | 'ready' | 'failed'>('pending');
  const [videoFailed, setVideoFailed] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [waitingExpired, setWaitingExpired] = useState(false);
  const assetPath = `/cinematic/${assetNames[category.type]}`;
  const showVideo =
    !reducedMotion && !videoFailed && !waitingExpired && !(videoEnded && posterStatus === 'ready');
  const showFallback =
    posterStatus !== 'ready' &&
    !(showVideo && frameReady) &&
    (waitingExpired || (!showVideo && (frameReady || posterStatus === 'failed')));
  const canReveal =
    (showVideo && frameReady) || (posterStatus === 'ready' && !showVideo) || showFallback;
  // The resting pose must not flash before an introduction starts from its first frame.

  const showPoster = posterStatus === 'ready' && (!showVideo || frameReady);

  const bindVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video) setFrameReady(false);
    playbackRef.current?.attachVideo(video);
  }, []);

  useEffect(() => {
    const playback = createCategoryClipPlayback({
      source: `${assetPath}.mp4`,
      selected: selectedRef.current,
      onFrameReady: () => setFrameReady(true),
      onPlaybackFailure: () => setVideoFailed(true),
      onWaitingTimeout: () => setWaitingExpired(true),
      onComplete: () => setVideoEnded(true),
    });
    playbackRef.current = playback;
    playback.attachVideo(videoRef.current);
    return () => {
      playback.dispose();
      playbackRef.current = null;
    };
  }, []);

  useEffect(() => {
    playbackRef.current?.setSelected(selected);
  }, [selected]);

  useEffect(() => {
    if (!canReveal) return;
    playbackRef.current?.markReady();
    onReady();
  }, [canReveal, onReady]);

  return (
    <>
      {showFallback && (
        <div className="category-stage-media-fallback">
          <span>{category.number}</span>
          <p>{category.title}</p>
        </div>
      )}
      <img
        className="category-stage-poster"
        src={`${assetPath}.webp`}
        alt=""
        decoding="async"
        style={{ visibility: showPoster ? 'visible' : 'hidden' }}
        onLoad={() => setPosterStatus('ready')}
        onError={() => setPosterStatus('failed')}
      />
      {showVideo && (
        <video
          ref={bindVideo}
          className={`category-stage-video ${frameReady ? 'is-ready' : ''}`}
          src={`${assetPath}.mp4`}
          poster={`${assetPath}.webp`}
          muted
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
        />
      )}
    </>
  );
}

export function CategoryStageVisual({ category }: { category: Category }) {
  const reducedMotion = useStageReducedMotion();
  const initialLayer = useRef<VisualLayer>({ category, sequence: 0 });
  const visibleLayer = useRef(initialLayer.current);
  const sequence = useRef(0);
  const selectedType = useRef(category.type);
  const layerElements = useRef(new Map<number, HTMLDivElement>());
  const transition = useRef<gsap.core.Timeline | null>(null);
  const [layers, setLayers] = useState<VisualLayer[]>([initialLayer.current]);
  selectedType.current = category.type;

  useLayoutEffect(() => {
    transition.current?.kill();
    const visible = visibleLayer.current;
    const element = layerElements.current.get(visible.sequence);
    if (element) gsap.set(element, { opacity: 1, scale: 1 });
    setLayers(
      visible.category.type === category.type
        ? [visible]
        : [visible, { category, sequence: ++sequence.current }],
    );
  }, [category.type]);

  const revealLayer = useCallback(
    (layer: VisualLayer) => {
      if (layer.category.type !== selectedType.current) return;
      if (layer.sequence === visibleLayer.current.sequence) return;
      const incoming = layerElements.current.get(layer.sequence);
      const outgoing = layerElements.current.get(visibleLayer.current.sequence);
      if (!incoming) return;
      transition.current?.kill();
      visibleLayer.current = layer;

      if (reducedMotion) {
        gsap.set(incoming, { opacity: 1, scale: 1 });
        setLayers([layer]);
        return;
      }

      // Keep the outgoing scene until the incoming clip has decoded a frame or its poster is ready.

      gsap.set(incoming, { opacity: 0, scale: 1.018 });
      transition.current = gsap.timeline({
        onComplete: () => {
          if (visibleLayer.current.sequence === layer.sequence) setLayers([layer]);
        },
      });
      if (outgoing) transition.current.to(outgoing, { opacity: 0, duration: 0.38 }, 0);
      transition.current.to(
        incoming,
        { opacity: 1, scale: 1, duration: 0.65, ease: 'power3.out' },
        0,
      );
    },
    [reducedMotion],
  );

  useLayoutEffect(() => {
    if (!reducedMotion) return;
    transition.current?.progress(1);
  }, [reducedMotion]);

  useEffect(
    () => () => {
      transition.current?.kill();
    },
    [],
  );

  return (
    <div className="category-stage-visual" aria-hidden="true">
      {layers.map((layer) => (
        <div
          key={layer.sequence}
          className="category-stage-media-layer"
          ref={(element) => {
            if (element) layerElements.current.set(layer.sequence, element);
            else layerElements.current.delete(layer.sequence);
          }}
          style={{ opacity: layer.sequence === visibleLayer.current.sequence ? 1 : 0 }}
        >
          <CategoryClip
            category={layer.category}
            selected={layer.category.type === category.type}
            reducedMotion={reducedMotion}
            onReady={() => revealLayer(layer)}
          />
        </div>
      ))}
    </div>
  );
}
