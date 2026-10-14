import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from '@/components/LanguageContext';

import { base44 } from "@/api/apiClient";

// Genere un UUID pour creer un ServiceType via le code
function generateServiceTypeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Nouvelles categories a garantir dans ServiceType. Idempotent : ne cree que celles qui manquent.
const NEW_SERVICE_TYPES = [
  {
    name: "Agregateur de service",
    abbreviation: "AGR",
    description: "Plateforme ou intermediaire qui regroupe et met en relation plusieurs prestataires de services evenementiels.",
    code_service: "SRV_AGR",
    code_typeservice: "CAT_AGREGATEUR",
    status: "active"
  },
  {
    name: "Evenement Mariage",
    abbreviation: "MAR",
    description: "Organisation complete ou partielle d'evenements de mariage (ceremonie, reception, prestations associees).",
    code_service: "SRV_MAR",
    code_typeservice: "CAT_EVENEMENT_MARIAGE",
    status: "active"
  }
];

async function ensureNewServiceTypesExist(existingTypes) {
  const existingNames = (existingTypes || []).map(t => t.name);
  const missing = NEW_SERVICE_TYPES.filter(type => !existingNames.includes(type.name));
  if (missing.length === 0) return [];
  const created = [];
  for (const type of missing) {
    try {
      const result = await base44.entities.ServiceType.create({ id: generateServiceTypeId(), ...type });
      created.push(result || type);
    } catch (e) {
      console.error("Echec de la creation de la categorie", type.name, e);
    }
  }
  return created;
}

export default function CategoryFilter({ selected, onSelect }) {
  const { t, language } = useLanguage();

  const tr = (val, nameEn) => {
    if (!val) return val;
    if (language === 'en' && nameEn) return nameEn;
    const translated = t(`dynamicLabels.${val}`);
    return translated === `dynamicLabels.${val}` ? val : translated;
  };

  const [categories, setCategories] = React.useState([
    { id: 'all', label: t('categories.All') || 'Tous les Services' }
  ]);

  React.useEffect(() => {
    const fetchTypes = async () => {
      try {
        let types = await base44.entities.ServiceType.list();
        const created = await ensureNewServiceTypesExist(types);
        if (created.length > 0) {
          types = [...types, ...created];
        }
        const activeTypes = types.filter(t => !t.status || t.status === 'active');

        const mapped = activeTypes.map(type => ({
          id: type.name, // Using name for compatibility with legacy category string
          label: tr(type.name, type.name_en)
        }));

        setCategories([
          { id: 'all', label: t('categories.All') || 'Tous les Services' },
          ...mapped
        ]);
      } catch (err) {
        console.error("Failed to fetch service types", err);
      }
    };
    fetchTypes();
  }, [t]);

  return (
    <div className="flex flex-wrap gap-2 pb-6">
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selected === cat.id ? "default" : "outline"}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "rounded-full px-4 text-sm",
            selected === cat.id 
              ? "bg-rose-600 hover:bg-rose-700 border-rose-600 text-white" 
              : "border-stone-200 text-stone-600 hover:border-rose-200 hover:text-rose-600 bg-white"
          )}
        >
          {cat.label}
        </Button>
      ))}
    </div>
  );
}