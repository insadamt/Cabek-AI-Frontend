/** Category-first landing with physical glass folders; reuses HomeFrame and the shared GSAP motion system. */
import { ArrowUpRight } from 'lucide-react';
import { useEffect } from 'react';
import { HomeFrame } from '../components/home/HomeFrame';
import { categories, categoryPath } from '../lib/workflows';
import { openCategory } from '../lib/categoryMotion';
import { useWorkflowReveal } from '../hooks/useWorkflowReveal';

export function Categories() {
  const ref = useWorkflowReveal('categories');
  useEffect(() => {
    document.title = 'CABEK AI — Votre parcours';
  }, []);
  return (
    <HomeFrame>
      <div className="category-home" ref={ref}>
        <div className="category-intro" data-workflow-reveal>
          <p className="eyebrow">CABEK AI · VOS DOSSIERS</p>
          <h1>
            Chaque véhicule.
            <br />
            <span>Le bon parcours.</span>
          </h1>
          <p>Choisissez votre espace pour commencer.</p>
        </div>
        <nav className="category-folders" aria-label="Catégories de dossiers">
          {categories.map((category) => (
            <a
              key={category.type}
              href={categoryPath(category.type)}
              className="category-choice"
              data-workflow-reveal
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                openCategory(
                  categoryPath(category.type),
                  event.currentTarget.querySelector<HTMLElement>('.category-object')!,
                );
              }}
            >
              <div
                className="category-object dossier-folder"
                data-flip-id={`category-${category.type}`}
                aria-hidden="true"
              >
                <div className="folder-back" />
                <div className="category-paper">
                  <span>CABEK AI</span>
                  <i />
                  <i />
                  <i />
                </div>
                <div className="category-pocket">
                  <span>{category.number}</span>
                  <span>
                    {category.type === 'verification'
                      ? 'AVANT / APRÈS'
                      : category.type === 'chiffrage_rapide'
                        ? 'CHIFFRAGE'
                        : 'EXPERTISE'}
                  </span>
                </div>
              </div>
              <div className="category-caption">
                <h2>{category.title}</h2>
                <ArrowUpRight size={20} aria-hidden="true" />
              </div>
              <p>{category.description}</p>
            </a>
          ))}
        </nav>
      </div>
    </HomeFrame>
  );
}
