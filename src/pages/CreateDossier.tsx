/** Creation screen with the shared physical vehicle sheet; only quick estimates and verification are creatable. */
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { HomeFrame } from '../components/home/HomeFrame';
import { DossierCreationForm } from '../components/dossier/DossierCreationForm';
import { categoryForType, categoryPath } from '../lib/workflows';
import { navigate } from '../hooks/useNavigation';
import { useWorkflowReveal } from '../hooks/useWorkflowReveal';
import type { CreatableDossierType } from '../workflowTypes';

export function CreateDossier({ type }: { type: CreatableDossierType }) {
  const ref = useWorkflowReveal('create');
  const category = categoryForType(type);
  useEffect(() => {
    document.title = `Créer · ${category.title} — CABEK AI`;
  }, [category]);
  return (
    <HomeFrame>
      <div className="workflow-create-page" ref={ref}>
        <button
          className="back-link"
          onClick={() => navigate(window.history.state?.returnTo ?? categoryPath(type))}
        >
          <ArrowLeft size={15} /> {category.title}
        </button>
        <div className="workflow-create-sheet" data-workflow-reveal>
          <header>
            <img src="/brand/cabek-logo.png" alt="Cabek" />
            <span>{category.title}</span>
          </header>
          <DossierCreationForm type={type} />
        </div>
      </div>
    </HomeFrame>
  );
}
