import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles, Crown, PartyPopper, ArrowRight, BookOpen } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import { ROUTES } from "@/config/recruitment";
import { useArticles, imageUrl } from "@/components/articles/useArticles";

// Trois bannieres d'annonce qui defilent seules (6 s), avec points de pagination,
// pause au survol / au toucher, et bouton X pour masquer (memorise pour la session).
const SLIDES = [
  {
    id: "welcome",
    icon: PartyPopper,
    bg: "from-[#FF6B35] to-[#F7931E]",
    title: "Bienvenue sur EventCrafter",
    text: "La plateforme qui réunit organisateurs, prestataires et clients pour des événements réussis : mariages, anniversaires, entreprises et bien plus. Trouvez le bon professionnel en quelques clics.",
    cta: null,
  },
  {
    id: "even-ia",
    icon: Sparkles,
    bg: "from-[#0F766E] to-[#14B8A6]",
    title: "Découvrez EVEN IA, votre assistant intelligent",
    text: "Posez vos questions, obtenez des conseils sur mesure et laissez EVEN IA vous guider, jusqu'à la création complète de vos services. Moins de tâches répétitives, plus de clients.",
    cta: { label: "Essayer EVEN IA", to: "/AIAssistant" },
  },
  {
    id: "plans",
    icon: Crown,
    bg: "from-[#1E3A8A] to-[#4F46E5]",
    title: "Passez au niveau supérieur",
    text: "Souscrivez à un abonnement pour gagner en visibilité, recevoir plus de demandes qualifiées et afficher un statut de prestataire de confiance.",
    cta: { label: "Choisir un abonnement", to: "/Pricing" },
  },
];

const INTERVAL_MS = 6000;
const ARTICLES_INTERVAL_MS = 8000; // duree de la 4e diapositive (3 articles par cycle)
const ARTICLES_PER_CYCLE = 3;
const ARTICLES_SLIDE = { id: "articles" };
const STORAGE_KEY = "ec_banner_closed";

// 4e diapositive : 3 articles d'Inspiration qui defilent a chaque cycle (les 3 suivants au cycle d'apres).
function ArticlesParade({ widgets, lang, active, cycle }) {
  const n = widgets.length;
  const start = (Math.max(cycle - 1, 0) * ARTICLES_PER_CYCLE) % n;
  const picks = Array.from({ length: Math.min(ARTICLES_PER_CYCLE, n) }, (_, k) => widgets[(start + k) % n]);
  return (
    <div className="w-full shrink-0 bg-gradient-to-r from-[#7F1D1D] to-[#E11D48] text-white py-4 md:py-5">
      <style>{`@keyframes ec-in{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
.ec-in{animation:ec-in .7s ease-out both}
@media (prefers-reduced-motion: reduce){.ec-in{animation:none}}`}</style>
      <div className="flex items-center justify-between gap-3 px-5 pr-14 md:px-6 md:pr-16 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <h3 className="text-lg md:text-xl font-bold leading-tight">
            {lang === "fr" ? "Inspiration : nos articles" : "Inspiration: our articles"}
          </h3>
        </div>
        <Link
          to="/Inspiration"
          tabIndex={active ? 0 : -1}
          className="shrink-0 inline-flex items-center gap-1.5 bg-white text-stone-900 font-semibold text-xs md:text-sm px-3 py-1.5 rounded-full shadow hover:bg-stone-100 transition"
        >
          {lang === "fr" ? "Tout voir" : "See all"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-5 md:px-6">
        {picks.map((w, k) => (
          <Link
            key={w.number}
            to={ROUTES.article(w.number)}
            tabIndex={active ? 0 : -1}
            style={active ? { animationDelay: `${k * 250}ms` } : undefined}
            className={`${active ? "ec-in" : ""} group flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl p-2 transition ${k > 0 ? "hidden md:flex" : ""}`}
          >
            <img
              src={imageUrl("thumbnails", lang, w.number)}
              alt=""
              loading="lazy"
              className="w-16 h-16 rounded-lg object-cover shrink-0 bg-white/20"
            />
            <span className="text-sm font-semibold leading-snug line-clamp-3">{w[lang]?.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AnnouncementCarousel({ className = "" }) {
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [paused, setPaused] = useState(false);
  const lang = useLanguage()?.language === "en" ? "en" : "fr";
  const { data: articlesData } = useArticles();
  const widgets = articlesData?.widgets || [];
  const slides = widgets.length > 0 ? [...SLIDES, ARTICLES_SLIDE] : SLIDES;
  const [cycle, setCycle] = useState(0); // +1 juste avant chaque arrivee sur la 4e diapositive
  const touchX = useRef(null);

  const reduceMotion = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  const go = useCallback((i) => setIndex((i + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (closed || paused || reduceMotion) return;
    const delay = slides[index]?.id === "articles" ? ARTICLES_INTERVAL_MS : INTERVAL_MS;
    const t = setTimeout(() => {
      if (slides[(index + 1) % slides.length]?.id === "articles") setCycle((c) => c + 1);
      go(index + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [index, paused, closed, reduceMotion, go, slides]);

  const close = () => {
    setClosed(true);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  const onTouchStart = (e) => { setPaused(true); touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current != null) {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    }
    touchX.current = null;
    setPaused(false);
  };

  if (closed) return null;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Annonces EventCrafter"
      className={`relative w-full ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-md">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => {
            if (s.id === "articles") {
              return (
                <div key={s.id} role="group" aria-roledescription="diapositive"
                  aria-label={`${i + 1} sur ${slides.length}`} aria-hidden={i !== index} className="w-full shrink-0">
                  <ArticlesParade widgets={widgets} lang={lang} active={i === index} cycle={cycle} />
                </div>
              );
            }
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                role="group"
                aria-roledescription="diapositive"
                aria-label={`${i + 1} sur ${slides.length}`}
                aria-hidden={i !== index}
                className={`w-full shrink-0 bg-gradient-to-r ${s.bg} text-white p-5 pr-12 md:p-6 md:pr-14`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 min-h-[120px]">
                  <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold leading-tight">{s.title}</h3>
                    <p className="mt-1 text-sm md:text-[15px] text-white/90 leading-relaxed">{s.text}</p>
                  </div>
                  {s.cta && (
                    <Link
                      to={s.cta.to}
                      tabIndex={i === index ? 0 : -1}
                      className="shrink-0 inline-flex items-center justify-center gap-2 self-start md:self-center bg-white text-stone-900 font-semibold text-sm px-4 py-2.5 rounded-full shadow hover:bg-stone-100 transition"
                    >
                      {s.cta.label}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Fermer les annonces"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Choisir une annonce">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Annonce ${i + 1}`}
            onClick={() => go(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-stone-900" : "w-2 bg-stone-300 hover:bg-stone-400"}`}
          />
        ))}
      </div>
    </section>
  );
}
