import type { Detection, Part, Photo } from '../types';

export function normalizeModelLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const partFamilies = [
  ['front-fender', ['aile avant', 'front fender'], true],
  ['rear-fender', ['aile arriere', 'rear fender', 'rear quarter panel'], true],
  ['grille', ['calandre', 'grille'], false],
  ['hood', ['capot', 'hood', 'bonnet'], false],
  ['trunk', ['coffre', 'trunk', 'boot lid'], false],
  ['rear-light', ['feu arriere', 'rear light', 'tail light', 'taillight'], true],
  [
    'rear-windshield',
    ['pare brise arriere', 'rear windshield', 'rear windscreen', 'lunette arriere'],
    false,
  ],
  [
    'windshield',
    ['pare brise avant', 'front windshield', 'windshield', 'pare brise', 'windscreen'],
    false,
  ],
  ['front-bumper', ['pare chocs avant', 'front bumper'], false],
  ['rear-bumper', ['pare chocs arriere', 'rear bumper'], false],
  ['headlight', ['phare avant', 'phare', 'headlight', 'headlamp'], true],
  ['tire', ['pneu', 'tire', 'tyre'], false],
  ['front-door', ['porte avant', 'front door'], true],
  ['rear-door', ['porte arriere', 'rear door'], true],
  ['side-mirror', ['retroviseur', 'side mirror', 'wing mirror'], true],
  ['wheel', ['roue', 'wheel', 'jante'], false],
  ['rocker-panel', ['bas de caisse', 'rocker panel', 'side sill'], false],
  ['window', ['vitre', 'window', 'side glass'], false],
] as const;

export function getPartIllustration(part: Part) {
  const label = normalizeModelLabel(part.name || part.part_id || '');
  const family = partFamilies.find(([, aliases]) => aliases.some((alias) => label.includes(alias)));
  if (!family) return 'unknown';
  const [key, , hasSides] = family;
  if (!hasSides) return key;
  const left = /\b(left|gauche|g)\b/.test(label);
  const right = /\b(right|droite|droit|d)\b/.test(label);
  // An unspecified side must not be represented as a confidently identified left or right part.

  return left === right ? 'unknown' : `${key}-${left ? 'left' : 'right'}`;
}

const damageTypes = [
  ['d_bosse', 'Bosse', 'amber', ['dent', 'bosse', 'deformation']],
  ['d_brise', 'Bris de vitrage', 'violet', ['shattered glass', 'bris de vitrage', 'brise']],
  ['d_casse', 'Casse', 'terracotta', ['broken part', 'casse']],
  ['d_crevaison', 'Crevaison', 'slate', ['tire puncture', 'crevaison']],
  ['d_fissure', 'Fissure', 'indigo', ['crack', 'fissure']],
  ['d_lampe_casse', 'Optique cassée', 'rose', ['broken light', 'optique cassee', 'lampe casse']],
  ['d_piece_manquante', 'Pièce manquante', 'mauve', ['missing part', 'piece manquante']],
  ['d_rayure', 'Rayure', 'blue', ['scratch', 'rayure']],
] as const;

export function getDamagePresentation(type?: string) {
  const normalized = normalizeModelLabel(type || '');
  const match = damageTypes.find(
    ([key, , , aliases]) =>
      normalizeModelLabel(key) === normalized || aliases.some((alias) => alias === normalized),
  );
  return match
    ? { key: match[0], label: match[1], tone: match[2] }
    : { key: normalized || 'unknown', label: type || 'Dommage non précisé', tone: 'slate' };
}

export function getPartDetections(part: Part, detections: Detection[]) {
  // Keep repeated saved IDs: each row can carry a distinct observation from the engine.

  return detections.filter(
    (detection) => detection.detection_id && part.detection_ids?.includes(detection.detection_id),
  );
}

export function getPartDecision(part: Part, detections: Detection[]) {
  if (
    !part.name ||
    !part.action ||
    /non identifie/i.test(normalizeModelLabel(part.name)) ||
    detections.some((detection) => detection.chiffrage_bloque)
  )
    return 'À vérifier';
  return part.action === 'replace' ? 'Remplacer' : 'Réparer';
}

function getSourceFilename(reference: string) {
  try {
    return decodeURIComponent(
      reference.split(/[?#]/)[0].replace(/\\/g, '/').split('/').pop() || '',
    );
  } catch {
    return reference;
  }
}

export function resolveSourcePhotoIndex(reference: string, photos: Photo[]) {
  const filename = getSourceFilename(reference);
  const stem = filename.replace(/\.[^.]+$/, '');
  const matches = photos.flatMap((photo, index) => {
    const originalFilename = getSourceFilename(photo.original_url);
    const matchesId =
      reference === photo.photo_id || filename === photo.photo_id || stem === photo.photo_id;
    return matchesId || filename === originalFilename ? [index] : [];
  });
  // Duplicate basenames are ambiguous; never direct an expert to guessed evidence.

  return matches.length === 1 ? matches[0] : undefined;
}
