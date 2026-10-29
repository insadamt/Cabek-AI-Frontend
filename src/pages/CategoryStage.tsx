/**
 * Places three readable workflow panels beside the continuous vehicle scene so the studio stays prominent.
 * Depends on HomeFrame branding, the scene completion callback, scoped GSAP reveal and workflow routes.
 */
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { HomeFrame } from '../components/home/HomeFrame';
import { CategoryStageVisual } from '../components/home/CategoryStageVisual';
import { useNavigation } from '../hooks/useNavigation';
import { useCategoryStageReveal } from '../hooks/useCategoryStageReveal';
import { categories, categoryPath, collectionUrl, type Category } from '../lib/workflows';
import '../styles/category-stage.css';

export function CategoryStage() {
  const { pathname, searchParams, navigate } = useNavigation();
  const selected =
    categories.find((item) => item.slug === searchParams.get('parcours')) ?? categories[0];
  const initiallyParked = useRef(
    categories.some((category) => category.slug === searchParams.get('parcours')),
  ).current;
  const [introComplete, setIntroComplete] = useState(initiallyParked);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const dockRef = useCategoryStageReveal(introComplete);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'CABEK AI — Choisissez votre parcours';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  function selectCategory(category: Category) {
    if (category.type === selected.type && searchParams.get('parcours') === category.slug) return;

    // A category changes the preview without adding a history entry before the collection is opened.

    navigate(
      collectionUrl(pathname, searchParams, { parcours: category.slug }),
      window.history.state ?? {},
      true,
    );
  }

  function handleCategoryKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const selectedIndex = categories.findIndex((category) => category.type === selected.type);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (selectedIndex + 1) % categories.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (selectedIndex + categories.length - 1) % categories.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = categories.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectCategory(categories[nextIndex]);
    buttonsRef.current[nextIndex]?.focus();
  }

  return (
    <HomeFrame>
      <section className="category-stage" aria-label="Les parcours CABEK AI">
        <div
          ref={dockRef}
          className="category-stage-dock"
          data-intro-complete={introComplete}
          inert={!introComplete}
          aria-hidden={!introComplete || undefined}
        >
          <div
            className="category-stage-tabs"
            role="tablist"
            aria-label="Choisir un parcours"
            aria-orientation="vertical"
            onKeyDown={handleCategoryKeys}
          >
            {categories.map((category, index) => {
              const selectedCategory = category.type === selected.type;
              return (
                <button
                  key={category.type}
                  ref={(element) => {
                    buttonsRef.current[index] = element;
                  }}
                  id={`category-stage-tab-${category.type}`}
                  className={selectedCategory ? 'selected' : ''}
                  data-category-reveal
                  role="tab"
                  type="button"
                  aria-selected={selectedCategory}
                  aria-controls="category-stage-panel"
                  tabIndex={selectedCategory ? 0 : -1}
                  onClick={() => selectCategory(category)}
                >
                  <span className="category-stage-tab-index" aria-hidden="true">
                    {category.number}
                  </span>
                  <span className="category-stage-tab-title">{category.title}</span>
                </button>
              );
            })}
          </div>
          <a
            className="category-stage-open"
            data-category-action
            href={categoryPath(selected.type)}
            aria-label={`Ouvrir les dossiers — ${selected.title}`}
            onClick={(event) => {
              if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                return;
              event.preventDefault();
              navigate(categoryPath(selected.type));
            }}
          >
            Ouvrir les dossiers
            <span>
              <ArrowUpRight size={19} strokeWidth={1.7} aria-hidden="true" />
            </span>
          </a>
        </div>
        <div
          id="category-stage-panel"
          className="category-stage-content"
          role="tabpanel"
          aria-labelledby={`category-stage-tab-${selected.type}`}
        >
          <CategoryStageVisual
            category={selected}
            initiallyParked={initiallyParked}
            onIntroComplete={handleIntroComplete}
          />
        </div>
      </section>
    </HomeFrame>
  );
}
