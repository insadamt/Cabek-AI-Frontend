/**
 * The category landing is a cinematic selection stage, with one explicit action into each collection.
 * Depends on HomeFrame branding, workflow routes, local footage and the shared selection indicator.
 */
import { ArrowUpRight, Camera, ScanLine, SplitSquareHorizontal } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { HomeFrame } from '../components/home/HomeFrame';
import { CategoryStageVisual, useStageReducedMotion } from '../components/home/CategoryStageVisual';
import { useNavigation } from '../hooks/useNavigation';
import { useSelectionIndicator } from '../hooks/useSelectionIndicator';
import { categories, categoryPath, collectionUrl, type Category } from '../lib/workflows';
import '../styles/category-stage.css';

const sceneCopy: Record<
  Category['type'],
  { title: [string, string]; description: string; label: string; icon: typeof Camera }
> = {
  forfait_expertise: {
    title: ['L’expertise.', 'Sous tous les angles.'],
    description: 'Du passage dans le tunnel au rapport d’expertise. Tout commence ici.',
    label: 'Forfait / Devis d’expertise',
    icon: ScanLine,
  },
  chiffrage_rapide: {
    title: ['Une estimation.', 'Une vision claire.'],
    description: 'Les photos de votre véhicule. Une estimation pour avancer.',
    label: 'Chiffrage rapide',
    icon: Camera,
  },
  verification: {
    title: ['Avant. Après.', 'La différence en images.'],
    description: 'Retrouvez chaque côté du véhicule, avant et après sa réparation.',
    label: 'Photos avant / après',
    icon: SplitSquareHorizontal,
  },
};

export function CategoryStage() {
  const { pathname, searchParams, navigate } = useNavigation();
  const selected =
    categories.find((item) => item.slug === searchParams.get('parcours')) ?? categories[0];
  const reducedMotion = useStageReducedMotion();
  const copyRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorRef = useSelectionIndicator<HTMLDivElement>(selected.type);
  const selectedCopy = sceneCopy[selected.type];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'CABEK AI — Choisissez votre parcours';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useLayoutEffect(() => {
    const copy = copyRef.current;
    if (!copy) return;
    if (reducedMotion) {
      gsap.set(copy, { opacity: 1, y: 0 });
      return;
    }
    // Keep the selected label, heading and destination coherent while their surface reveals.

    const animation = gsap.fromTo(
      copy,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.32,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      },
    );
    return () => {
      animation.kill();
    };
  }, [selected, reducedMotion]);

  function selectCategory(category: Category) {
    if (category.type === selected.type) return;

    // Selection is a view preference; opening a collection remains the deliberate navigation step.

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
        nextIndex = (selectedIndex + 1) % categories.length;
        break;
      case 'ArrowLeft':
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
        <div className="category-stage-topline" aria-hidden="true">
          <span>À CHAQUE VÉHICULE, SON PARCOURS.</span>
          <span>{selected.number} / 03</span>
        </div>

        <div className="category-stage-selection">
          <p className="category-stage-selection-label">Choisissez votre parcours</p>
          <div
            ref={indicatorRef}
            className="category-stage-tabs segmented-control"
            role="tablist"
            aria-label="Choisir un parcours"
            onKeyDown={handleCategoryKeys}
          >
            <span className="selection-indicator" aria-hidden="true" />
            {categories.map((category, index) => {
              const selectedCategory = category.type === selected.type;
              const Icon = sceneCopy[category.type].icon;
              return (
                <button
                  key={category.type}
                  ref={(element) => {
                    buttonsRef.current[index] = element;
                  }}
                  id={`category-stage-tab-${category.type}`}
                  className={selectedCategory ? 'selected' : ''}
                  role="tab"
                  type="button"
                  aria-selected={selectedCategory}
                  aria-controls="category-stage-panel"
                  tabIndex={selectedCategory ? 0 : -1}
                  onClick={() => selectCategory(category)}
                >
                  <span className="category-stage-tab-number">{category.number}</span>
                  <span className="category-stage-tab-title">{category.title}</span>
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="category-stage-panel"
          className="category-stage-content"
          role="tabpanel"
          aria-labelledby={`category-stage-tab-${selected.type}`}
        >
          <CategoryStageVisual category={selected} />
          <div className="category-stage-copy" ref={copyRef}>
            <p className="category-stage-eyebrow">
              <span aria-hidden="true" />
              {selectedCopy.label}
            </p>
            <h1>
              {selectedCopy.title[0]}
              <span>{selectedCopy.title[1]}</span>
            </h1>
            <p className="category-stage-description">{selectedCopy.description}</p>
          </div>
          <a
            className="category-stage-open"
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
              <ArrowUpRight size={21} strokeWidth={1.7} aria-hidden="true" />
            </span>
          </a>
        </div>

        <p className="category-stage-credit">
          Ferrari 458 Italia ·{' '}
          <a
            href="https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6"
            target="_blank"
            rel="noreferrer"
          >
            vicent091036
          </a>{' '}
          ·{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>{' '}
          · Matériaux et mise en scène adaptés
        </p>
      </section>
    </HomeFrame>
  );
}
