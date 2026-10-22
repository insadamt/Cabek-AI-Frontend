import { ArrowUpRight } from 'lucide-react';
import { transitionHomeView } from '../../lib/homeViewTransition';
import { searchIconPaths, returnIconPaths } from '../../lib/searchReturnMotion';

interface SearchReturnControlProps {
  search: string;
  focused: boolean;
  disabled: boolean;
  onReturn: () => void;
}

export function SearchReturnControl({
  search,
  focused,
  disabled,
  onReturn,
}: SearchReturnControlProps) {
  return (
    <div
      className="home-search-return home-grid-search"
      data-flip-id="home-search"
      data-mode={focused ? 'return' : 'search'}
    >
      {/* Keep one surface and icon mounted so collapse can interpolate instead of replacing them. */}
      <svg className="search-return-icon" viewBox="0 0 24 24" aria-hidden="true">
        {(focused ? returnIconPaths : searchIconPaths).map((path, index) => (
          <path key={index} data-search-icon-path={index} d={path} />
        ))}
      </svg>
      <form
        className="search-return-form"
        role={focused ? undefined : 'search'}
        aria-hidden={focused || undefined}
        inert={focused || disabled}
        onSubmit={(event) => {
          event.preventDefault();
          if (focused || disabled) return;
          const nextSearch = String(new FormData(event.currentTarget).get('search') ?? '').trim();
          transitionHomeView(`/?${new URLSearchParams({ search: nextSearch })}`);
        }}
      >
        <input
          key={search}
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Rechercher un dossier…"
          aria-label="Rechercher un dossier"
          className="search-return-query"
        />
        <button className="search-return-submit" type="submit" aria-label="Rechercher">
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </form>
      <button
        className="home-search-back search-return-back"
        type="button"
        aria-hidden={!focused || undefined}
        inert={!focused}
        disabled={disabled}
        onClick={onReturn}
      >
        <span className="search-return-label">Retour</span>
      </button>
    </div>
  );
}
