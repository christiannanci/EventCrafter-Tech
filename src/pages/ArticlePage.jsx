import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, Link2, MessageCircle, Share2, Check } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/components/LanguageContext';
import { SITE_URL, ROUTES } from '@/config/recruitment';
import ArticleMarkdown from '@/components/articles/ArticleMarkdown';
import RecruitBlock from '@/components/articles/RecruitBlock';
import { useArticles, findWidget, imageUrl, pad2 } from '@/components/articles/useArticles';

const UI = {
  fr: { home: 'Accueil', insp: 'Inspiration', read: 'min de lecture', by: 'Par la rédaction EventCrafter', insight: 'En bref',
        dyk: 'Le saviez-vous ?', check: 'Votre checklist', done: 'faits', share: 'Partager', copy: 'Copier le lien', copied: 'Lien copié',
        toc: 'Dans cet article', related: 'À lire aussi', loading: 'Chargement…', missing: "Cet article n'existe pas.", back: "Retour à l'inspiration" },
  en: { home: 'Home', insp: 'Inspiration', read: 'min read', by: 'By EventCrafter Editorial', insight: 'In short',
        dyk: 'Did you know?', check: 'Your checklist', done: 'done', share: 'Share', copy: 'Copy link', copied: 'Link copied',
        toc: 'In this article', related: 'Keep reading', loading: 'Loading…', missing: 'This article does not exist.', back: 'Back to inspiration' },
};

const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

function useFonts() {
  useEffect(() => {
    if (document.getElementById('ec-article-fonts')) return;
    const l = document.createElement('link');
    l.id = 'ec-article-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Lora:ital,wght@0,500;0,600;1,500&display=swap';
    document.head.appendChild(l);
  }, []);
}

function Checklist({ items, number, label, doneLabel }) {
  const key = `ec-article-check-${number}`;
  const [done, setDone] = useState(() => lsGet(key) || []);
  const toggle = (j) => {
    const next = done.includes(j) ? done.filter((x) => x !== j) : [...done, j];
    setDone(next);
    lsSet(key, next);
  };
  return (
    <div className="my-6 rounded-2xl border border-[#E8DFD0] bg-white p-5" data-testid="checklist">
      <div className="flex items-center justify-between mb-2">
        <b>📌 {label}</b>
        <span className="text-sm text-stone-500">{done.length}/{items.length} {doneLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100 mb-3 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--acc)] transition-all" style={{ width: `${(100 * done.length) / items.length}%` }} />
      </div>
      {items.map((x, j) => (
        <label key={j} className="flex items-start gap-3 py-1.5 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={done.includes(j)} onChange={() => toggle(j)} />
          <span className={done.includes(j) ? 'line-through text-stone-400' : ''}>{x}</span>
        </label>
      ))}
    </div>
  );
}

function ArticleCard({ w, language, color }) {
  return (
    <Link to={ROUTES.article(w.number)} className="group flex gap-3 rounded-2xl bg-white border border-[#E8DFD0] overflow-hidden hover:shadow-md transition">
      <img src={imageUrl('thumbnails', language, w.number)} alt="" loading="lazy" className="w-24 h-28 object-cover shrink-0" />
      <div className="py-3 pr-3">
        <div className="text-xs font-bold mb-1" style={{ color }}>N° {pad2(w.number)}</div>
        <h5 className="font-semibold leading-snug group-hover:underline" style={{ fontFamily: 'Lora, serif' }}>{w[language].title}</h5>
      </div>
    </Link>
  );
}

export default function ArticlePage() {
  useFonts();
  const { slug } = useParams();
  const lang = useLanguage()?.language === 'en' ? 'en' : 'fr';
  const t = UI[lang];
  const { data, error, loading } = useArticles();
  const w = useMemo(() => findWidget(data, slug), [data, slug]);
  const [open, setOpen] = useState(() => new Set([0]));
  const [copied, setCopied] = useState(false);

  useEffect(() => { setOpen(new Set([0])); window.scrollTo?.({ top: 0 }); }, [slug]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-stone-500">{t.loading}</div>;
  if (error || !w) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-stone-600">{t.missing}</p>
        <Link to="/Inspiration" className="text-rose-600 font-medium hover:underline">{t.back}</Link>
      </div>
    );
  }

  const L = w[lang];
  const cat = data.categories.find((c) => c.key === w.category);
  const other = lang === 'fr' ? 'en' : 'fr';
  const url = `${SITE_URL}${ROUTES.article(w.number)}`;
  const description = (lang === 'en' && w.en.seo?.metaDescription) || L.hook;
  const related = data.widgets.filter((x) => x.number !== w.number && x.category === w.category).slice(0, 3);

  const toggle = (i) => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch (e) { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`${L.title} ${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const q = lang === 'fr' ? ['« ', ' »'] : ['“', '”'];

  return (
    <div className="bg-[#FBF7F0] text-[#2B1D14] pb-16" style={{ '--cat': cat.color, '--acc': cat.accent, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <SEOHead
        title={`${L.title} — EventCrafter`}
        description={description}
        ogImage={`${SITE_URL}/article-assets/images/share/${lang}/article-${pad2(w.number)}.png`}
        url={url}
        type="article"
      />
      <div className="max-w-6xl mx-auto px-4 pt-5">
        <nav className="text-sm text-stone-500 mb-4">
          <Link to="/" className="hover:underline">{t.home}</Link> / <Link to="/Inspiration" className="hover:underline">{t.insp}</Link> / <span>{L.category}</span>
        </nav>
        <img
          src={imageUrl('hero', lang, w.number)}
          alt={w.media?.hero?.alt?.[lang] || L.title}
          className="w-full rounded-3xl aspect-[16/9] object-cover bg-stone-200"
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-10 mt-8">
          <article className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>
              <span>{cat.icon}</span>{L.category} · N° {pad2(w.number)}
            </span>
            <h1 className="mt-2 text-3xl md:text-5xl leading-tight" style={{ fontFamily: 'Lora, serif', color: cat.color }}>{L.title}</h1>
            <p className="mt-2 italic text-stone-500">{w[other].title}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stone-600">
              <span>{t.by}</span><span>·</span><span>{L.readTimeMin} {t.read}</span>
              <span className="flex flex-wrap gap-1.5">
                {L.tribes.map((x) => <span key={x} className="rounded-full bg-white border border-[#E8DFD0] px-2.5 py-0.5 text-xs">{x}</span>)}
              </span>
            </div>
            <p className="mt-6 text-xl leading-relaxed" style={{ fontFamily: 'Lora, serif' }}>{L.hook}</p>
            <div className="mt-6 rounded-2xl border-l-4 bg-white p-5" style={{ borderColor: cat.accent }}>
              <b className="block text-sm uppercase tracking-wide mb-1" style={{ color: cat.color }}>{t.insight}</b>
              {L.quickInsight}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-500 mr-1">{t.share}</span>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] text-white text-sm font-semibold px-3.5 py-2"><MessageCircle className="w-4 h-4" />WhatsApp</a>
              <a href={fb} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#1877F2] text-white text-sm font-semibold px-3.5 py-2"><Share2 className="w-4 h-4" />Facebook</a>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DFD0] bg-white text-sm font-semibold px-3.5 py-2">
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}{copied ? t.copied : t.copy}
              </button>
            </div>

            <div className="mt-8">
              {L.sections.map((s, i) => (
                <React.Fragment key={i}>
                  <section id={`s${i}`} className="border-b border-[#E8DFD0] py-4 scroll-mt-24">
                    <button type="button" onClick={() => toggle(i)} className="w-full flex items-center justify-between gap-3 text-left md:cursor-default" aria-expanded={open.has(i)}>
                      <h2 className="text-2xl" style={{ fontFamily: 'Lora, serif', color: cat.color }}><span className="mr-2">{s.emoji}</span>{s.title}</h2>
                      <ChevronDown className={`w-5 h-5 shrink-0 md:hidden transition-transform ${open.has(i) ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`${open.has(i) ? 'block' : 'hidden'} md:block mt-2 text-[17px]`}><ArticleMarkdown src={s.content} /></div>
                  </section>
                  {s.emoji === '📜' && L.callouts.didYouKnow && (
                    <div className="my-6 rounded-2xl p-5 text-white" style={{ background: cat.color }} data-testid="did-you-know">
                      <b className="block mb-1">💡 {t.dyk}</b>{L.callouts.didYouKnow}
                    </div>
                  )}
                  {s.emoji === '🛠️' && L.callouts.checklist?.length > 0 && (
                    <Checklist items={L.callouts.checklist} number={w.number} label={t.check} doneLabel={t.done} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {L.callouts.pullQuote && (
              <blockquote className="my-10 text-center italic text-2xl md:text-3xl leading-snug" style={{ fontFamily: 'Lora, serif', color: cat.color }}>
                <span className="block w-14 h-[3px] mx-auto mb-5" style={{ background: cat.accent }} />
                {q[0]}{L.callouts.pullQuote}{q[1]}
              </blockquote>
            )}

            <RecruitBlock widget={w} language={lang} accent={cat.accent} />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl bg-white border border-[#E8DFD0] p-5">
              <h4 className="font-bold mb-3">{t.toc}</h4>
              <nav className="flex flex-col gap-2 text-sm">
                {L.sections.map((s, i) => (
                  <a key={i} href={`#s${i}`} className="hover:underline"><span className="mr-2">{s.emoji}</span>{s.title}</a>
                ))}
              </nav>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h4 className="text-2xl mb-4" style={{ fontFamily: 'Lora, serif' }}>{t.related}</h4>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((r) => <ArticleCard key={r.number} w={r} language={lang} color={cat.color} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
