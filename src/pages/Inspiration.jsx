import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from '@/components/LanguageContext';

export default function Inspiration() {
  const { t, language } = useLanguage();

  const trArticle = (article, field) => {
    const enField = article?.[`${field}_en`];
    return (language === 'en' && enField) ? enField : article?.[field];
  };
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const init = async () => {
      try {
        const data = await base44.entities.Inspiration.list();
        setArticles(data);
      } catch (e) {
        // handle error
      }
    };
    init();
  }, []);

  const filteredArticles = filter === "All" ? articles : articles.filter(a => a.category === filter);

  const categories = ["All", "Tradition", "Attire", "Ceremony", "Food", "Decor"];

  const categoryLabels = {
    All: t('inspiration.categoryAll'),
    Tradition: t('inspiration.categoryTradition'),
    Attire: t('inspiration.categoryAttire'),
    Ceremony: t('inspiration.categoryCeremony'),
    Food: t('inspiration.categoryFood'),
    Decor: t('inspiration.categoryDecor')
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-stone-900 text-white py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
           <img src="https://images.unsplash.com/photo-1544391784-9db2e2e718b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Badge className="bg-rose-500 hover:bg-rose-600 mb-4 border-0">{t('inspiration.badge')}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('inspiration.heroTitle')}</h1>
          <p className="text-xl text-stone-300">
            {t('inspiration.heroSubtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="flex justify-center mb-12 overflow-x-auto pb-4">
          <div className="flex gap-2 p-1 bg-white rounded-full border border-stone-200 shadow-sm">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === cat
                    ? "bg-stone-900 text-white shadow-md"
                    : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map(article => (
            <Dialog key={article.id}>
              <DialogTrigger asChild>
                <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 flex flex-col h-full cursor-pointer">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={article.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                      alt={trArticle(article, 'title')}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 text-stone-900 backdrop-blur hover:bg-white">{article.category}</Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-2 text-white text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        <span>{t('inspiration.clickToLearnMore')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    {article.region && (
                      <div className="text-xs font-bold text-rose-500 uppercase tracking-wide mb-2">{article.region}</div>
                    )}
                    <h3 className="text-xl font-bold text-stone-900 mb-3 group-hover:text-rose-600 transition-colors">
                      {trArticle(article, 'title')}
                    </h3>
                    <p className="text-stone-500 mb-6 line-clamp-3 flex-grow">
                      {trArticle(article, 'summary')}
                    </p>

                    <div className="flex items-center text-rose-600 text-sm font-medium group-hover:gap-2 transition-all">
                      <span>{t('inspiration.readMore')}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold mb-2">{trArticle(article, 'title')}</DialogTitle>
                  {article.region && (
                    <Badge variant="outline" className="w-fit">{article.region}</Badge>
                  )}
                </DialogHeader>
                <div className="mt-4">
                  <img
                    src={article.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                    alt={trArticle(article, 'title')}
                    className="w-full h-64 md:h-96 object-cover rounded-xl mb-6"
                  />
                  <div className="prose prose-stone max-w-none">
                    {(trArticle(article, 'content') || '').split('\n').map((p, i) => (
                      <p key={i} className="mb-4 text-stone-700 leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </div>
  );
}
