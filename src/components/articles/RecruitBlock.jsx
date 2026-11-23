import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RECRUITMENT_MODE, ROUTES, vendorSignupUrl, waitlistUrl, vendorCategoryLabel } from '@/config/recruitment';

const NB = ' '; // espace insécable avant « ? » en français

const TXT = {
  fr: {
    title: "Rejoignez l'aventure EventCrafter",
    sub: "La marketplace des prestataires d'événements au Cameroun ouvre bientôt.",
    vendor: `Vous êtes prestataire${NB}? Rejoignez EventCrafter`,
    vendorGo: 'Inscrire mon activité',
    family: `Vous organisez un événement${NB}? Rejoignez la liste d'attente`,
    familyGo: 'Me faire prévenir au lancement',
    readyTitle: "Prêt à passer à l'action ?",
    readySub: 'Des prestataires vérifiés pour réaliser chaque idée de cet article.',
    see: 'Voir les prestataires',
  },
  en: {
    title: 'Join the EventCrafter adventure',
    sub: 'The marketplace for event vendors in Cameroon is opening soon.',
    vendor: 'Are you a vendor? Join EventCrafter',
    vendorGo: 'Register my business',
    family: 'Planning an event? Join the waiting list',
    familyGo: 'Notify me at launch',
    readyTitle: 'Ready to make it happen?',
    readySub: 'Verified vendors to bring every idea in this article to life.',
    see: 'See vendors',
  },
};

// Bloc du bas d'article.
//  - RECRUITMENT_MODE = true  → deux boutons (inscription prestataire / liste d'attente)
//  - RECRUITMENT_MODE = false → bloc « Trouver des prestataires » (marketplace)
export default function RecruitBlock({ widget, language = 'fr', accent = '#E2B85C' }) {
  const t = TXT[language] || TXT.fr;
  const keys = widget.en.actions.find((a) => a.type === 'findVendors')?.vendorCategories || [];

  if (RECRUITMENT_MODE) {
    return (
      <div className="rounded-3xl p-6 md:p-8 my-10 text-white bg-[#2B1D14]" data-testid="recruit-block">
        <h3 className="text-2xl md:text-3xl mb-1" style={{ fontFamily: 'Lora, serif' }}>{t.title}</h3>
        <p className="mb-5 text-[#D8CBB9]">{t.sub}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            to={vendorSignupUrl(keys)}
            data-testid="recruit-vendor"
            className="flex flex-col gap-1.5 rounded-2xl p-5 text-[#2B1D14] transition hover:brightness-95"
            style={{ background: accent }}
          >
            <b className="text-base md:text-lg leading-snug">{t.vendor}</b>
            <span className="text-sm font-bold inline-flex items-center gap-1">{t.vendorGo} <ArrowRight className="w-4 h-4" /></span>
          </Link>
          <Link
            to={waitlistUrl(widget.number)}
            data-testid="recruit-family"
            className="flex flex-col gap-1.5 rounded-2xl p-5 border border-white/20 bg-white/10 hover:bg-white/20 transition"
          >
            <b className="text-base md:text-lg leading-snug">{t.family}</b>
            <span className="text-sm font-bold inline-flex items-center gap-1">{t.familyGo} <ArrowRight className="w-4 h-4" /></span>
          </Link>
        </div>
      </div>
    );
  }

  const labels = widget[language].actions.find((a) => a.type === 'findVendors')?.vendorCategories || keys;
  return (
    <div className="rounded-3xl p-6 md:p-8 my-10 text-white bg-[#2B1D14]" data-testid="vendors-block">
      <h3 className="text-2xl md:text-3xl mb-1" style={{ fontFamily: 'Lora, serif' }}>{t.readyTitle}</h3>
      <p className="mb-5 text-[#D8CBB9]">{t.readySub}</p>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        {keys.map((k, i) => (
          <Link
            key={k}
            to={`${ROUTES.marketplace}?category=${encodeURIComponent(k)}`}
            className="flex flex-col gap-2 rounded-2xl p-4 border border-white/15 bg-white/10 hover:bg-white/20 transition"
          >
            <b>{labels[i] || vendorCategoryLabel(k, language)}</b>
            <span className="text-sm font-bold" style={{ color: accent }}>{t.see} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
