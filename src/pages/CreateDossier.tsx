/** Collection creation enters the same cinematic tunnel; depends on persisted drafts and the existing category routes. */
import { HomeFrame } from '../components/home/HomeFrame';
import { TunnelStage } from '../components/home/TunnelStage';
import { categories, categoryPath } from '../lib/workflows';
import { navigate } from '../hooks/useNavigation';
import type { CreatableDossierType } from '../workflowTypes';

export function CreateDossier({ type }: { type: CreatableDossierType }) {
  const category = categories.find((item) => item.type === type)!;
  if (category.type === 'forfait_expertise') return null;
  return (
    <HomeFrame>
      <section className="category-stage" data-category={type}>
        <TunnelStage category={category} onBack={() => navigate(categoryPath(type))} />
      </section>
    </HomeFrame>
  );
}
