/**
 * Exercises media loading races without a browser or GPU.
 * Depends on Vitest timers and real EventTargets to verify hidden time and resource ownership.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCategoryClipPlayback } from './categoryClipPlayback';

function createVideo() {
  const attributes = new Map<string, string>([['src', '/cinematic/expertise.mp4']]);
  return Object.assign(new EventTarget(), {
    ended: false,
    play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: vi.fn((name: string, value: string) => attributes.set(name, value)),
    removeAttribute: vi.fn((name: string) => attributes.delete(name)),
  });
}

function createSession({ hidden = false, selected = true } = {}) {
  const page = Object.assign(new EventTarget(), { hidden });
  vi.stubGlobal('document', page);
  const callbacks = {
    onFrameReady: vi.fn(),
    onPlaybackFailure: vi.fn(),
    onWaitingTimeout: vi.fn(),
    onComplete: vi.fn(),
  };
  const playback = createCategoryClipPlayback({
    source: '/cinematic/expertise.mp4',
    selected,
    ...callbacks,
  });
  const video = createVideo();
  function setHidden(nextHidden: boolean) {
    page.hidden = nextHidden;
    page.dispatchEvent(new Event('visibilitychange'));
  }
  return { page, playback, video, setHidden, ...callbacks };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('cinematic category playback lifecycle', () => {
  it('counts only visible waiting time and resumes the remaining budget', () => {
    const { playback, video, setHidden, onWaitingTimeout } = createSession({ hidden: true });
    playback.attachVideo(video as unknown as HTMLVideoElement);
    vi.advanceTimersByTime(20000);
    expect(video.play).not.toHaveBeenCalled();
    expect(onWaitingTimeout).not.toHaveBeenCalled();

    setHidden(false);
    vi.advanceTimersByTime(1000);
    setHidden(true);
    vi.advanceTimersByTime(20000);
    expect(onWaitingTimeout).not.toHaveBeenCalled();
    setHidden(false);
    vi.advanceTimersByTime(2999);
    expect(onWaitingTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onWaitingTimeout).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it('times out even when neither the poster nor a video node becomes available', () => {
    const { playback, onWaitingTimeout } = createSession();
    vi.advanceTimersByTime(4000);
    expect(onWaitingTimeout).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(4000);
    expect(onWaitingTimeout).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it('keeps outgoing footage allocated during crossfade, then unloads it exactly once', () => {
    const { playback, video, onWaitingTimeout } = createSession();
    playback.attachVideo(video as unknown as HTMLVideoElement);
    vi.advanceTimersByTime(1000);
    playback.setSelected(false);
    vi.advanceTimersByTime(10000);
    expect(onWaitingTimeout).not.toHaveBeenCalled();
    expect(video.pause).toHaveBeenCalled();
    expect(video.getAttribute('src')).toBe('/cinematic/expertise.mp4');
    expect(video.load).not.toHaveBeenCalled();

    playback.dispose();
    playback.dispose();
    expect(video.removeAttribute).toHaveBeenCalledExactlyOnceWith('src');
    expect(video.load).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows a blocked autoplay to settle onto a poster or bounded visual fallback', async () => {
    const { playback, video, onPlaybackFailure, onWaitingTimeout } = createSession();
    video.play.mockRejectedValue(new Error('Autoplay denied'));
    playback.attachVideo(video as unknown as HTMLVideoElement);
    await Promise.resolve();
    expect(onPlaybackFailure).toHaveBeenCalledOnce();
    playback.attachVideo(null);
    vi.advanceTimersByTime(4000);
    expect(onWaitingTimeout).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it('ignores late autoplay rejection after deselection or teardown', async () => {
    const { playback, video, onPlaybackFailure } = createSession();
    let rejectPlay!: (reason: Error) => void;
    video.play.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectPlay = reject;
      }),
    );
    playback.attachVideo(video as unknown as HTMLVideoElement);
    playback.setSelected(false);
    playback.dispose();
    rejectPlay(new Error('Aborted by pause'));
    await Promise.resolve();
    expect(onPlaybackFailure).not.toHaveBeenCalled();
  });

  it('reveals a decoded frame and cancels its readiness timeout before completion', () => {
    const { playback, video, onFrameReady, onComplete, onWaitingTimeout } = createSession();
    let decodedFrame!: VideoFrameRequestCallback;
    const framedVideo = Object.assign(video, {
      requestVideoFrameCallback: vi.fn((callback: VideoFrameRequestCallback) => {
        decodedFrame = callback;
        return 1;
      }),
      cancelVideoFrameCallback: vi.fn(),
    });
    playback.attachVideo(framedVideo as unknown as HTMLVideoElement);
    video.dispatchEvent(new Event('playing'));
    expect(onFrameReady).not.toHaveBeenCalled();
    decodedFrame(0, {} as VideoFrameCallbackMetadata);
    expect(onFrameReady).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10000);
    expect(onWaitingTimeout).not.toHaveBeenCalled();
    video.dispatchEvent(new Event('ended'));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onFrameReady).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it('cancels late frame callbacks and restores an unloaded source on StrictMode remount', () => {
    const { playback, video, page, onFrameReady } = createSession();
    let decodedFrame!: VideoFrameRequestCallback;
    const framedVideo = Object.assign(video, {
      requestVideoFrameCallback: vi.fn((callback: VideoFrameRequestCallback) => {
        decodedFrame = callback;
        return 7;
      }),
      cancelVideoFrameCallback: vi.fn(),
    });
    const removeListener = vi.spyOn(page, 'removeEventListener');
    playback.attachVideo(framedVideo as unknown as HTMLVideoElement);
    video.dispatchEvent(new Event('playing'));
    playback.dispose();
    expect(framedVideo.cancelVideoFrameCallback).toHaveBeenCalledWith(7);
    decodedFrame(0, {} as VideoFrameCallbackMetadata);
    expect(onFrameReady).not.toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    const remounted = createCategoryClipPlayback({
      source: '/cinematic/expertise.mp4',
      selected: true,
      onFrameReady,
      onPlaybackFailure: vi.fn(),
      onWaitingTimeout: vi.fn(),
      onComplete: vi.fn(),
    });
    remounted.attachVideo(framedVideo as unknown as HTMLVideoElement);
    expect(video.getAttribute('src')).toBe('/cinematic/expertise.mp4');
    expect(video.play).toHaveBeenCalledTimes(2);
    remounted.dispose();
  });

  it('cancels waiting when a reduced-motion poster or static fallback becomes usable', () => {
    const { playback, onWaitingTimeout } = createSession();
    playback.markReady();
    vi.advanceTimersByTime(10000);
    expect(onWaitingTimeout).not.toHaveBeenCalled();
    playback.dispose();
  });
});
