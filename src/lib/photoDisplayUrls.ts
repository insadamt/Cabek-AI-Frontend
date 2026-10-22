import type { OriginalPhoto, Photo } from '../types';

export function getPhotoDisplayUrls(photo: Photo) {
  // Older saved responses and local illustrations may not provide WebP previews.

  return {
    original: photo.original_preview_url || photo.original_url,
    parts: photo.parts_preview_url || photo.parts_url,
    damages: photo.damages_preview_url || photo.damages_url,
    critical: photo.critical_preview_url || photo.critical_url,
  };
}

export function getOriginalPhotoDisplayUrl(photo: OriginalPhoto | Photo): string {
  // Completed snapshots and current originals use different preview field names.

  return (
    ('original_preview_url' in photo ? photo.original_preview_url : undefined) ||
    photo.preview_url ||
    photo.original_url
  );
}
