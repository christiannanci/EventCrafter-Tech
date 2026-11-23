import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { ROUTES } from '@/config/recruitment';
import { useArticles, imageUrl } from '@/components/articles/useArticles';

// Cartes des 25 articles dans la page Inspiration. Chaque carte ouvre /articles/article-NN.
// `filter` : "All" ou une clé de rubrique (Tradition, Food, Decor, Attire, Ceremony).
export default function ArticleCards({ filter = 'All' }) {
  const lang = useLanguage()?.language === 'en' ? 'en' : 'fr';
  const { data } = useArticles();
  if (!data) return null;
  const list = data.widgets.filter((w) => filter === 'All' || w.category === filter);
  if (list.length === 0) return null;
  const more = lang === 'fr' ? "Lire l'article" : 'Read article';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8" data-testid="article-cards">
      {list.map((w) => {
        const cat = data.categories.find((c) => c.key === w.category);
        return (
          <Link
            key={w.number}
            to={ROUTES.article(w.number)}
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 flex flex-col h-full"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
              <img
                src={imageUrl('thumbnails', lang, w.number)}
                alt={w.media?.hero?.alt?.[lang] || w[lang].title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-stone-900">
                {cat?.icon} {w[lang].category}
              </span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-stone-900 mb-3 group-hover:text-rose-600 transition-colors">{w[lang].title}</h3>
              <p className="text-stone-500 mb-6 line-clamp-3 flex-grow">{w[lang].hook}</p>
              <div className="flex items-center text-rose-600 text-sm font-medium group-hover:gap-2 transition-all">
                <span>{more}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
