// Retain only the most recently opened dossier so decoded assets survive navigation without an unbounded cache.

let preparedImages = new Map<string, HTMLImageElement>();

export function retainPreparedImages(images: Map<string, HTMLImageElement>) {
  preparedImages = images;
}
export function getPreparedImage(source: string) {
  return preparedImages.get(source);
}
