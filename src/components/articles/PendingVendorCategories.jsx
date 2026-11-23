import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getPendingCategories, setPendingCategories, vendorCategoryLabel } from '@/config/recruitment';

// Catégories choisies depuis un article, pré-sélectionnées dans la création du profil prestataire.
// La personne peut en retirer. Elles sont enregistrées avec le compte (voir ProfileSelection).
export default function PendingVendorCategories() {
  const [cats, setCats] = useState(() => getPendingCategories());
  if (cats.length === 0) return null;
  const remove = (k) => {
    const next = cats.filter((c) => c !== k);
    setCats(next);
    setPendingCategories(next);
  };
  return (
    <div className="space-y-2" data-testid="pending-categories">
      <p className="text-sm font-medium text-stone-700">Vos activités (issues de l'article)</p>
      <div className="flex flex-wrap gap-2">
        {cats.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 text-sm">
            {vendorCategoryLabel(k, 'fr')}
            <button type="button" onClick={() => remove(k)} aria-label={`Retirer ${vendorCategoryLabel(k, 'fr')}`} className="hover:text-rose-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
