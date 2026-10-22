import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Photo } from '../../types';
import { ImageViewer } from '../ImageViewer';
import { DossierPhotoWorkspace } from './DossierPhotoWorkspace';
import { DossierResultWorkspace } from './DossierResultWorkspace';

vi.mock('../Modal', () => ({
  Modal: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));
vi.mock('../../hooks/useComparisonImages', () => ({
  useComparisonImages: (photo: Photo, mode: 'parts' | 'damages') => ({
    displayed: {
      photoId: photo.photo_id,
      mode,
      originalUrl: photo.original_url,
      annotationUrl: mode === 'parts' ? photo.parts_url : photo.damages_url,
    },
    ready: true,
    error: false,
    retryImages: vi.fn(),
  }),
}));

const photos: Photo[] = ['front', 'rear'].map((photo_id) => ({
  photo_id,
  original_url: `/photos/${photo_id}.jpg`,
  parts_url: `/photos/${photo_id}-parts.jpg`,
  damages_url: `/photos/${photo_id}-damages.jpg`,
}));
const defaults = {
  photos,
  status: 'completed' as const,
  loading: false,
  error: null,
  onRetry: vi.fn(),
};

describe('photo inspection states', () => {
  it('routes top-level originals into the result workspace without an analysis', () => {
    const markup = renderToStaticMarkup(
      <DossierResultWorkspace
        dossierId="DOS-001"
        response={{
          dossier_id: 'DOS-001',
          status: 'not_analyzed',
          vehicle: { marque: '', modele: '', matricule: '' },
          photos: [
            {
              photo_id: 'before-scan',
              original_url: '/original.jpg',
              preview_url: '/original.webp',
            },
          ],
          progress: null,
          error: null,
          result: null,
        }}
        status="not_analyzed"
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );
    expect(markup).toContain('Photographie originale — before-scan');
    expect(markup).not.toContain('Type d’annotation');
    expect(markup).not.toContain('type="range"');
  });

  it.each(['not_analyzed', 'queued', 'processing', 'failed', 'completed'] as const)(
    'shows original previews in %s without inventing annotation controls',
    (status) => {
      const markup = renderToStaticMarkup(
        <DossierPhotoWorkspace
          {...defaults}
          status={status}
          photos={[
            {
              photo_id: 'original-only',
              original_url: '/photos/front.jpg',
              preview_url: '/preview/front.webp',
            },
          ]}
        />,
      );
      expect(markup).toMatch(/src="[^"]*\/preview\/front.webp"/);
      expect(markup).toContain('Photographie originale — original-only');
      expect(markup).not.toContain('Type d’annotation');
      expect(markup).not.toContain('type="range"');
      expect(markup).not.toContain('Comparaison à venir');
    },
  );

  it('supports original media when a preview is unavailable', () => {
    const markup = renderToStaticMarkup(
      <DossierPhotoWorkspace
        {...defaults}
        status="not_analyzed"
        photos={[{ photo_id: 'legacy', original_url: '/photos/legacy.jpg' }]}
      />,
    );
    expect(markup).toMatch(/src="[^"]*\/photos\/legacy.jpg"/);
    expect(markup).not.toContain('Type d’annotation');
  });

  it('uses the returned preview URL for the thumbnail', () => {
    const markup = renderToStaticMarkup(
      <DossierPhotoWorkspace
        {...defaults}
        photos={[{ ...photos[0], original_preview_url: '/preview/front.webp' }]}
      />,
    );
    expect(markup).toMatch(/src="[^"]*\/preview\/front.webp" alt="" loading="lazy"/);
  });

  it('keeps unavailable photographs distinct from a pending request', () => {
    const empty = renderToStaticMarkup(<DossierPhotoWorkspace {...defaults} photos={[]} />);
    const loading = renderToStaticMarkup(
      <DossierPhotoWorkspace {...defaults} photos={[]} loading />,
    );
    expect(empty).toContain('Aucune photo disponible');
    expect(empty).not.toContain('Agrandir la comparaison');
    expect(loading).toContain('Chargement des photographies…');
    expect(loading).not.toContain('Aucune photo disponible');
  });

  it('does not fabricate annotated photos while an analysis is processing', () => {
    const markup = renderToStaticMarkup(
      <DossierPhotoWorkspace {...defaults} photos={[]} status="processing" />,
    );
    expect(markup).toContain('L’analyse est en cours.');
    expect(markup).not.toContain('class="comparison');
    expect(markup).not.toContain('Type d’annotation');
  });

  it('offers retry on result failure without claiming the dossier has no photos', () => {
    const markup = renderToStaticMarkup(
      <DossierPhotoWorkspace {...defaults} photos={[]} error={new Error('offline')} />,
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Réessayer');
    expect(markup).not.toContain('Aucune photo disponible');
  });

  it('retains a saved comparison if refreshing the result fails', () => {
    const markup = renderToStaticMarkup(
      <DossierPhotoWorkspace {...defaults} error={new Error('offline')} />,
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Photographie originale — front');
    expect(markup).not.toContain('Agrandir la comparaison');
    expect(markup).not.toContain('viewer-modal');
    expect(markup).toContain('aria-label="Afficher la photo 2"');
  });

  it('disables both navigation directions for one photograph', () => {
    const markup = renderToStaticMarkup(
      <DossierPhotoWorkspace {...defaults} photos={photos.slice(0, 1)} />,
    );
    expect(markup).toContain('disabled="" aria-label="Photo précédente"');
    expect(markup).toContain('disabled="" aria-label="Photo suivante"');
  });

  it('enlarges the selected photo, annotation mode and comparison position', () => {
    const markup = renderToStaticMarkup(
      <ImageViewer
        photos={photos}
        initialSelection={{ photoIndex: 1, mode: 'damages', split: 73 }}
        onClose={() => {}}
      />,
    );
    expect(markup).toContain('Photographie originale — rear');
    expect(markup).toContain('Annotation des dommages — rear');
    expect(markup).toMatch(/type="range"[^>]*value="73"/);
    expect(markup).toContain('Photo 2 sur 2');
  });

  it('keeps an enlarged selection in range when fewer photos are available', () => {
    const markup = renderToStaticMarkup(
      <ImageViewer
        photos={photos.slice(0, 1)}
        initialSelection={{ photoIndex: 5, mode: 'parts', split: 50 }}
        onClose={() => {}}
      />,
    );
    expect(markup).toContain('Photographie originale — front');
    expect(markup).toContain('Photo 1 sur 1');
  });
});
