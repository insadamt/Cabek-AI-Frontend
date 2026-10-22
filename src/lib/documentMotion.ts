export function waitForDocumentMotion(paper: HTMLElement, open: boolean, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const destination = open ? 'open' : 'closed';
    function cleanUp() {
      paper.removeEventListener('document-motion-settled', checkState);
      signal.removeEventListener('abort', cancel);
    }
    function checkState() {
      if (paper.dataset.motionState !== destination) return;
      cleanUp();
      resolve();
    }
    function cancel() {
      cleanUp();
      reject(new DOMException('Aborted', 'AbortError'));
    }
    if (signal.aborted) return cancel();
    paper.addEventListener('document-motion-settled', checkState);
    signal.addEventListener('abort', cancel, { once: true });
    checkState();
  });
}
