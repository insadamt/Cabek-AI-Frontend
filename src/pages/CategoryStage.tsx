/**
 * Presents three shared glass folders, absorbing the chosen category into the island before entering its workflow.
 * Depends on DossierFolder, GSAP category motion, persisted tunnel sessions and the existing category collections.
 */
import { useEffect, useRef, useState } from 'react';
import { HomeFrame } from '../components/home/HomeFrame';
import { DossierFolder } from '../components/home/DossierFolder';
import { TunnelStage } from '../components/home/TunnelStage';
import { useNavigation } from '../hooks/useNavigation';
import { useTunnelCapture } from '../hooks/useTunnelCapture';
import { categories, categoryForType, categoryPath, type Category } from '../lib/workflows';
import { absorbCategoryFolder } from '../lib/categoryFolderMotion';

export function CategoryStage() {
  const { navigate, searchParams } = useNavigation();
  const { session } = useTunnelCapture();
  const selected =
    session && searchParams.get('reprendre') === '1'
      ? categoryForType(session.identity.type)
      : searchParams.get('scene') === '1'
        ? (categories.find((category) => category.slug === searchParams.get('parcours')) ?? null)
        : null;
  const [absorbing, setAbsorbing] = useState(false);
  const folders = useRef<HTMLDivElement>(null);
  const transition = useRef<(() => void) | undefined>(undefined);
  const locked = useRef(false);

  useEffect(() => () => transition.current?.(), []);
  useEffect(() => {
    const previous = document.title;
    document.title = 'CABEK AI — Choisissez votre parcours';
    return () => {
      document.title = previous;
    };
  }, []);

  function selectCategory(category: Category) {
    if (locked.current) return;
    const allFolders = Array.from(
      folders.current?.querySelectorAll<HTMLElement>('.dossier-folder') ?? [],
    );
    const folder = allFolders.find((element) => element.dataset.categoryFolder === category.type);
    const island = document.querySelector<HTMLElement>('.ai-activity-island');
    if (!folder || !island) return;
    locked.current = true;
    setAbsorbing(true);
    transition.current?.();
    transition.current = absorbCategoryFolder(
      folder,
      allFolders.filter((element) => element !== folder),
      island,
      () => {
        locked.current = false;
        setAbsorbing(false);
        if (category.type === 'forfait_expertise') {
          navigate(categoryPath(category.type), { ejectFolders: true });
        } else {
          navigate(`/?parcours=${category.slug}&scene=1`);
        }
      },
      () => {
        locked.current = false;
        setAbsorbing(false);
      },
    );
  }

  return (
    <HomeFrame>
      <section
        className="category-stage"
        aria-label="Les parcours CABEK AI"
        data-category={selected?.type}
      >
        {selected && selected.type !== 'forfait_expertise' ? (
          <TunnelStage
            category={selected}
            onBack={() => {
              navigate('/');
            }}
          />
        ) : (
          <div ref={folders} className="category-folder-landing" aria-busy={absorbing}>
            <div className="category-folder-heading">
              <p className="eyebrow">CABEK AI</p>
              <h1>Chaque véhicule a son histoire.</h1>
              <p>Choisissez votre parcours.</p>
            </div>
            <div
              className="category-folder-grid"
              role="group"
              aria-label="Choisir un parcours"
              inert={absorbing}
            >
              {categories.map((category) => (
                <div
                  key={category.type}
                  className="category-folder-choice"
                  data-category={category.type}
                >
                  <DossierFolder
                    category={category}
                    isActive
                    isOpen={false}
                    onSelect={() => selectCategory(category)}
                  />
                </div>
              ))}
            </div>
            <p className="category-folder-footnote">Expertise · Estimation · Photographies</p>
          </div>
        )}
      </section>
    </HomeFrame>
  );
}
