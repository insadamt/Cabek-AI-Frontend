import { describe, expect, it, vi } from 'vitest';
import { waitForDocumentMotion } from './documentMotion';

function createPaper(state = 'closed') {
  return Object.assign(new EventTarget(), {
    dataset: { motionState: state },
  }) as unknown as HTMLElement;
}

describe('document journey synchronization', () => {
  it('waits for extraction to finish before allowing a flight', async () => {
    const paper = createPaper();
    const settled = vi.fn();
    const task = waitForDocumentMotion(paper, true, new AbortController().signal);
    void task.then(settled);
    paper.dataset.motionState = 'opening';
    paper.dispatchEvent(new Event('document-motion-settled'));
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    paper.dataset.motionState = 'open';
    paper.dispatchEvent(new Event('document-motion-settled'));
    await task;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('immediately accepts an already-open sheet', async () => {
    await expect(
      waitForDocumentMotion(createPaper('open'), true, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it('waits for insertion and removes listeners when navigation cancels the journey', async () => {
    const controller = new AbortController();
    const paper = createPaper('closing');
    const removeListener = vi.spyOn(paper, 'removeEventListener');
    const task = waitForDocumentMotion(paper, false, controller.signal);
    const rejection = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
    expect(removeListener).toHaveBeenCalledWith('document-motion-settled', expect.any(Function));
  });
});
