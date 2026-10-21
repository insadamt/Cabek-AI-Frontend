export function getVisibleDossierNumber(
  activePosition: number,
  progress: number,
  total: number,
): number {
  if (total <= 0) return 0;

  // Follow the centered folder during motion without committing the URL selection early.

  const nearestPosition = activePosition + Math.round(progress);
  return (((nearestPosition % total) + total) % total) + 1;
}
