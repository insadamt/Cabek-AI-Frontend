/**
 * Distinguishes return visits from fresh loads so Back restores the studio without replaying its entrance.
 * Depends on application-memory visit tracking and navigation timing for full-document history restoration.
 */
let stageVisited = false;

export function shouldRestoreStageVisit() {
  if (stageVisited) return true;
  if (typeof performance === 'undefined') return false;
  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  return navigation?.type === 'back_forward';
}

export function rememberStageVisit() {
  //
  // Session storage would also suppress deliberate refreshes; in-memory state resets with a fresh document.
  //
  stageVisited = true;
}
