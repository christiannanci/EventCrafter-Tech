import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhoneInput, { isValidPhone, toE164 } from '@/components/PhoneInput';
import { useLanguage } from '@/components/LanguageContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TXT = {
  fr: {
    title: "Rejoignez la liste d'attente",
    sub: "Soyez prévenu(e) dès l'ouverture de la marketplace EventCrafter et trouvez les meilleurs prestataires pour votre événement.",
    name: 'Prénom (facultatif)', email: 'Email', phone: 'Téléphone / WhatsApp', city: 'Ville (facultatif)',
    either: 'Indiquez au moins un email ou un numéro de téléphone.',
    badEmail: "L'adresse email n'est pas valide.", badPhone: "Le numéro de téléphone n'est pas valide.",
    consent: "J'accepte d'être contacté(e) par EventCrafter au sujet du lancement. Mes coordonnées ne servent qu'à cela.",
    consentErr: 'Merci de cocher la case pour continuer.',
    submit: "Me prévenir au lancement", sending: 'Envoi…',
    okTitle: 'Merci, vous êtes sur la liste !', okText: 'Nous vous écrirons dès que la marketplace ouvre.',
    already: 'Vous êtes déjà sur la liste. Merci !', err: "Impossible d'enregistrer votre demande pour le moment. Réessayez dans un instant.",
    back: "Retourner lire l'article", home: "Retour à l'accueil",
  },
  en: {
    title: 'Join the waiting list',
    sub: 'Be the first to know when the EventCrafter marketplace opens and find the best vendors for your event.',
    name: 'First name (optional)', email: 'Email', phone: 'Phone / WhatsApp', city: 'City (optional)',
    either: 'Please give at least an email or a phone number.',
    badEmail: 'The email address is not valid.', badPhone: 'The phone number is not valid.',
    consent: 'I agree to be contacted by EventCrafter about the launch. My details are used for that only.',
    consentErr: 'Please tick the box to continue.',
    submit: 'Notify me at launch', sending: 'Sending…',
    okTitle: "Thank you, you're on the list!", okText: 'We will write to you as soon as the marketplace opens.',
    already: "You're already on the list. Thank you!", err: 'We could not save your request right now. Please try again in a moment.',
    back: 'Back to the article', home: 'Back to home',
  },
};

export default function Waitlist() {
  const lang = useLanguage()?.language === 'en' ? 'en' : 'fr';
  const t = TXT[lang];
  const [params] = useSearchParams();
  const article = /^\d{1,2}$/.test(params.get('article') || '') ? params.get('article').padStart(2, '0') : null;
  const source = (params.get('source') || 'direct').slice(0, 30);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState(''); // anti-robots : champ invisible, doit rester vide
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [done, setDone] = useState(null); // 'ok' | 'already'

  const submit = async (e) => {
    e.preventDefault();
    const errs = [];
    const hasEmail = email.trim() !== '';
    const hasPhone = !!phone && phone.replace(/\D/g, '').length > 3;
    if (!hasEmail && !hasPhone) errs.push(t.either);
    if (hasEmail && !EMAIL_REGEX.test(email.trim())) errs.push(t.badEmail);
    if (hasPhone && !isValidPhone(phone)) errs.push(t.badPhone);
    if (!consent) errs.push(t.consentErr);
    setErrors(errs);
    if (errs.length) return;

    if (trap) { setDone('ok'); return; } // robot : on fait semblant sans rien enregistrer

    setLoading(true);
    try {
      const { error } = await supabase.from('waitlist').insert({
        name: name.trim() || null,
        email: hasEmail ? email.trim().toLowerCase() : null,
        phone: hasPhone ? toE164(phone) : null,
        city: city.trim() || null,
        article,
        source,
        language: lang,
      });
      if (error) {
        if (error.code === '23505') setDone('already'); // déjà inscrit
        else throw error;
      } else {
        setDone('ok');
      }
    } catch (err) {
      console.error('waitlist', err);
      setErrors([t.err]);
    } finally {
      setLoading(false);
    }
  };

  const backTo = article ? `/articles/article-${article}` : '/';

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-stone-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-stone-900 mb-2">{done === 'already' ? t.already : t.okTitle}</h1>
          {done === 'ok' && <p className="text-stone-600 mb-6">{t.okText}</p>}
          <Link to={backTo} className="text-rose-600 font-medium hover:underline">{article ? t.back : t.home}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-stone-50 px-4 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">{t.title}</h1>
        <p className="text-stone-500 text-center mb-6">{t.sub}</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium text-stone-700">{t.name}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" maxLength={60} autoComplete="given-name" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">{t.email}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="mt-1" autoComplete="email" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">{t.phone}</label>
            <PhoneInput value={phone} onChange={setPhone} placeholder="6 70 00 00 00" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">{t.city}</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala, Yaoundé…" className="mt-1" maxLength={60} />
          </div>

          {/* champ piège pour les robots (invisible pour les personnes) */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
          </div>

          <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t.consent}</span>
          </label>

          {errors.length > 0 && (
            <ul className="bg-red-50 text-red-600 text-sm p-3 rounded-lg list-disc list-inside space-y-1">
              {errors.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.sending}</> : t.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}
