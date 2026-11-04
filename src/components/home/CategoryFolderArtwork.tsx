/** Category-specific automotive photo inserts; depends on generated local WebP assets and the shared pocket's open state. */
import type { Category } from '../../lib/workflows';
import '../../styles/category-folder-artwork.css';

const artworkByCategory: Record<Category['type'], string> = {
  forfait_expertise: 'expertise',
  chiffrage_rapide: 'quick-estimate',
  verification: 'before-after',
};

export function CategoryFolderArtwork({ category }: { category: Category }) {
  return (
    <div className="category-folder-artwork" aria-hidden="true">
      <img
        src={`/images/categories/${artworkByCategory[category.type]}.webp`}
        alt=""
        width={768}
        height={512}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
