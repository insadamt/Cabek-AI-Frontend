/**
 * Owns category footage playback, visible loading time and media resource release.
 * Depends on browser media/events; keeps outgoing frames intact until their node detaches.
 */
interface CategoryClipPlaybackOptions {
  source: string;
  selected: boolean;
  onFrameReady: () => void;
  onPlaybackFailure: () => void;
  onWaitingTimeout: () => void;
  onComplete: () => void;
}

export function createCategoryClipPlayback(options: CategoryClipPlaybackOptions) {
  let selected = options.selected;
  let video: HTMLVideoElement | null = null;
  let disposed = false;
  let ready = false;
  let remainingWait = 4000;
  let waitStarted = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let releaseVideo: (() => void) | undefined;
  let playbackAttempt = 0;

  function suspendDeadline() {
    if (timeout === undefined) return;
    clearTimeout(timeout);
    timeout = undefined;
    remainingWait = Math.max(0, remainingWait - (performance.now() - waitStarted));
  }

  function startDeadline() {
    if (disposed || ready || !selected || document.hidden || timeout !== undefined) return;
    waitStarted = performance.now();
    timeout = setTimeout(() => {
      timeout = undefined;
      ready = true;
      options.onWaitingTimeout();
    }, remainingWait);
  }

  function playWhenVisible() {
    const currentVideo = video;
    const attempt = ++playbackAttempt;
    if (disposed || !selected || document.hidden) {
      suspendDeadline();
      currentVideo?.pause();
      return;
    }
    startDeadline();
    if (!currentVideo || currentVideo.ended) return;

    function rejectPlayback() {
      if (!disposed && attempt === playbackAttempt && video === currentVideo)
        options.onPlaybackFailure();
    }

    try {
      void currentVideo.play()?.catch(rejectPlayback);
    } catch {
      rejectPlayback();
    }
  }

  document.addEventListener('visibilitychange', playWhenVisible);
  startDeadline();

  return {
    attachVideo(nextVideo: HTMLVideoElement | null) {
      if (disposed || video === nextVideo) return;
      ++playbackAttempt;
      releaseVideo?.();
      releaseVideo = undefined;
      video = nextVideo;
      if (!nextVideo) return;

      let frameCallback: number | undefined;
      let frameReady = false;
      let released = false;

      // React StrictMode reattaches the same node after cleanup has aborted its source.

      if (nextVideo.getAttribute('src') !== options.source)
        nextVideo.setAttribute('src', options.source);

      function publishFrame() {
        frameCallback = undefined;
        if (released || disposed || frameReady) return;
        frameReady = true;
        ready = true;
        suspendDeadline();
        options.onFrameReady();
      }

      function handlePlaying() {
        if (frameReady || frameCallback !== undefined) return;
        if (nextVideo?.requestVideoFrameCallback)
          frameCallback = nextVideo.requestVideoFrameCallback(publishFrame);
        else publishFrame();
      }

      function handleFailure() {
        if (!released && !disposed) options.onPlaybackFailure();
      }

      function handleComplete() {
        if (released || disposed) return;
        publishFrame();
        options.onComplete();
      }

      nextVideo.addEventListener('playing', handlePlaying);
      nextVideo.addEventListener('error', handleFailure);
      nextVideo.addEventListener('ended', handleComplete);
      releaseVideo = () => {
        released = true;
        nextVideo.removeEventListener('playing', handlePlaying);
        nextVideo.removeEventListener('error', handleFailure);
        nextVideo.removeEventListener('ended', handleComplete);
        if (frameCallback !== undefined) nextVideo.cancelVideoFrameCallback?.(frameCallback);
        nextVideo.pause();

        // Pausing alone retains decoding and downloads after category layers disappear.

        nextVideo.removeAttribute('src');
        nextVideo.load();
      };
      playWhenVisible();
    },
    setSelected(nextSelected: boolean) {
      if (selected === nextSelected) return;
      selected = nextSelected;
      playWhenVisible();
    },
    markReady() {
      ready = true;
      suspendDeadline();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ++playbackAttempt;
      suspendDeadline();
      document.removeEventListener('visibilitychange', playWhenVisible);
      releaseVideo?.();
      releaseVideo = undefined;
      video = null;
    },
  };
}
