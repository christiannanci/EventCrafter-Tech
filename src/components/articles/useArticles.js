import { useEffect, useState } from 'react';
import { ASSETS } from '@/config/recruitment';

// Charge public/article-assets/articles.json une seule fois et le garde en mémoire.
let cache = null;
let pending = null;

export function loadArticles() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch(`${ASSETS}/articles.json`)
      .then((r) => {
        if (!r.ok) throw new Error('articles.json introuvable');
        return r.json();
      })
      .then((d) => { cache = d; return d; })
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}

export function useArticles() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!cache) {
      loadArticles().then((d) => alive && setData(d)).catch((e) => alive && setError(e));
    }
    return () => { alive = false; };
  }, []);
  return { data, error, loading: !data && !error };
}

export const pad2 = (n) => String(n).padStart(2, '0');

// L'adresse peut être « article-NN », le numéro seul ou l'identifiant long de l'article.
export function findWidget(data, slug) {
  if (!data || !slug) return null;
  const m = String(slug).match(/^(?:article-)?(\d{1,2})$/);
  if (m) return data.widgets.find((w) => w.number === Number(m[1])) || null;
  return data.widgets.find((w) => w.id === slug) || null;
}

export const imageUrl = (kind, lang, n) => `${ASSETS}/images/${kind}/${lang}/article-${pad2(n)}.png`;
