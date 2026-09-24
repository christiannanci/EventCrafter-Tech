import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from '@/components/LanguageContext';

import { base44 } from "@/api/apiClient";

export default function CategoryFilter({ selected, onSelect }) {
  const { t } = useLanguage();

  const tr = (val) => {
    if (!val) return val;
    const translated = t(`dynamicLabels.${val}`);
    return translated === `dynamicLabels.${val}` ? val : translated;
  };

  const [categories, setCategories] = React.useState([
    { id: 'all', label: t('categories.All') || 'Tous les Services' }
  ]);

  React.useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await base44.entities.ServiceType.list();
        const activeTypes = types.filter(t => !t.status || t.status === 'active');
        
        const mapped = activeTypes.map(type => ({
          id: type.name, // Using name for compatibility with legacy category string
          label: tr(type.name)
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
