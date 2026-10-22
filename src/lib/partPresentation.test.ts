import { describe, expect, it } from 'vitest';
import {
  getDamagePresentation,
  getPartDecision,
  getPartDetections,
  getPartIllustration,
  resolveSourcePhotoIndex,
} from './partPresentation';
import type { Photo } from '../types';

const photos: Photo[] = [
  {
    photo_id: 'avant_01',
    original_url: '/media/photos/avant_01.jpg',
    parts_url: '',
    damages_url: '',
  },
  {
    photo_id: 'côté droit',
    original_url: '/media/photos/c%C3%B4t%C3%A9%20droit.png',
    parts_url: '',
    damages_url: '',
  },
];

describe('part presentation from saved engine labels', () => {
  it.each([
    ['Aile avant gauche', 'front-fender-left'],
    ['p_Aile avant gauche', 'front-fender-left'],
    ['right_front_fender', 'front-fender-right'],
    ['Aile arrière droite', 'rear-fender-right'],
    ['left_rear_fender', 'rear-fender-left'],
    ['Calandre', 'grille'],
    ['Capot', 'hood'],
    ['Coffre', 'trunk'],
    ['Feu arrière gauche', 'rear-light-left'],
    ['rear_light_right', 'rear-light-right'],
    ['Pare-brise avant', 'windshield'],
    ['Pare-brise arrière', 'rear-windshield'],
    ['Pare-chocs avant', 'front-bumper'],
    ['Pare-chocs arrière', 'rear-bumper'],
    ['Phare avant droit', 'headlight-right'],
    ['left_headlight', 'headlight-left'],
    ['Pneu', 'tire'],
    ['Porte avant gauche', 'front-door-left'],
    ['front_door_right', 'front-door-right'],
    ['Porte arrière droite', 'rear-door-right'],
    ['left_rear_door', 'rear-door-left'],
    ['Rétroviseur gauche', 'side-mirror-left'],
    ['side_mirror_right', 'side-mirror-right'],
    ['Roue', 'wheel'],
    ['Bas de caisse', 'rocker-panel'],
    ['Vitre', 'window'],
  ])('maps %s to %s', (name, expected) => expect(getPartIllustration({ name })).toBe(expected));

  it.each(['Aile avant', 'retroviseur', 'unrecognized', ''])(
    'does not invent a side or an unknown part: %s',
    (name) => {
      expect(getPartIllustration({ name })).toBe('unknown');
    },
  );

  it.each([
    ['d_bosse', 'Bosse'],
    ['d_brise', 'Bris de vitrage'],
    ['d_casse', 'Casse'],
    ['d_crevaison', 'Crevaison'],
    ['d_fissure', 'Fissure'],
    ['d_lampe_casse', 'Optique cassée'],
    ['d_piece_manquante', 'Pièce manquante'],
    ['d_rayure', 'Rayure'],
    ['Déformation', 'Bosse'],
  ])('translates %s without changing severity', (type, label) =>
    expect(getDamagePresentation(type).label).toBe(label),
  );

  it('keeps an unfamiliar damage label readable', () => {
    expect(getDamagePresentation('Dommage particulier')).toMatchObject({
      label: 'Dommage particulier',
      tone: 'slate',
    });
  });

  it('preserves duplicate detection rows and blocked decisions', () => {
    const detections = [{ detection_id: 'one' }, { detection_id: 'one', chiffrage_bloque: true }];
    const part = { name: 'Capot', action: 'repair' as const, detection_ids: ['one'] };
    expect(getPartDetections(part, detections)).toHaveLength(2);
    expect(getPartDecision(part, detections)).toBe('À vérifier');
    expect(getPartDecision({ name: 'Capot' }, [])).toBe('À vérifier');
  });
});

describe('source photograph resolution', () => {
  it.each(['avant_01', 'avant_01.jpg', '/old/photos/avant_01.jpg', 'C:\\photos\\avant_01.jpg'])(
    'resolves %s',
    (reference) => {
      expect(resolveSourcePhotoIndex(reference, photos)).toBe(0);
    },
  );
  it('decodes source filenames and ignores signed URL parameters', () => {
    expect(
      resolveSourcePhotoIndex('https://example.test/c%C3%B4t%C3%A9%20droit.png?token=abc', photos),
    ).toBe(1);
  });
  it('does not guess from partial names or ambiguous basenames', () => {
    expect(resolveSourcePhotoIndex('avant', photos)).toBeUndefined();
    expect(
      resolveSourcePhotoIndex('avant_01.jpg', [...photos, { ...photos[0], photo_id: 'another' }]),
    ).toBeUndefined();
    expect(resolveSourcePhotoIndex('other.jpg', photos)).toBeUndefined();
  });
});
