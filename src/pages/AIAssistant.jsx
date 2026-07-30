import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, Star, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

// Options fixes du parcours guidé
const EVENT_TYPES = [
  { value: 'Wedding', label: 'Mariage' },
  { value: 'Birthday', label: 'Anniversaire' },
  { value: 'Corporate', label: 'Événement d\'Entreprise' },
  { value: 'Conference', label: 'Conférence' },
  { value: 'Religious', label: 'Cérémonie Religieuse / Dot' },
  { value: 'Funeral', label: 'Funérailles' },
  { value: 'Other', label: 'Autre' },
];

const BUDGET_RANGES = [
  { value: 'low', label: 'Moins de 100 000 FCFA', max: 100000 },
  { value: 'mid', label: '100 000 - 300 000 FCFA', max: 300000 },
  { value: 'high', label: '300 000 - 1 000 000 FCFA', max: 1000000 },
  { value: 'top', label: 'Plus de 1 000 000 FCFA', max: Infinity },
  { value: 'any', label: 'Peu importe', max: Infinity },
];

const CULTURAL_ZONES = [
  'Peu importe', 'Bamiléké', 'Aire Sawa', 'Aire Grassfields',
  'Aire Fang-Béti', 'Grand Nord (Soudano-Sahélien)', 'Bamoun', 'Bakweri'
];

function BotBubble({ children }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F4C542] flex items-center justify-center mr-2">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[85%] bg-white border border-stone-200 text-[#2C2C2C] rounded-2xl px-4 py-3 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%] bg-[#FF6B35] text-white rounded-2xl px-4 py-3 shadow-sm text-sm">
        {children}
      </div>
    </div>
  );
}

function OptionButtons({ options, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {options.map((opt) => (
        <button
          key={opt.value || opt}
          onClick={() => onSelect(opt)}
          className="text-sm px-4 py-2 bg-[#FFF0E8] hover:bg-[#FF6B35] hover:text-white text-[#2C2C2C] rounded-full transition-colors border border-[#F4C542]/30"
        >
          {opt.label || opt}
        </button>
      ))}
    </div>
  );
}

function ServiceResultCard({ service, navigate }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 hover:border-[#FF6B35] transition-colors">
      <div className="flex justify-between items-start gap-2 mb-1">
        <h4 className="font-bold text-[#2C2C2C]">{service.title}</h4>
        {service.vendor_verified && (
          <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Vérifié
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-stone-500 mb-2">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {service.location || 'Non précisé'}</span>
        {service.rating > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {service.rating.toFixed(1)} ({service.review_count || 0} avis)
          </span>
        )}
      </div>
      <p className="text-sm text-stone-600 mb-2 line-clamp-2">{service.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#FF6B35]">À partir de {service.price_min?.toLocaleString() || '?'} FCFA</span>
        <button
          onClick={() => navigate(`${createPageUrl('ServiceDetails')}?id=${service.id}`)}
          className="flex items-center gap-1 text-xs font-medium text-[#FF6B35] hover:underline"
        >
          Voir le service <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [step, setStep] = useState('event_type'); // event_type -> category -> city -> budget -> cultural -> results
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]); // { from: 'bot'|'user', node: JSX }
  const [categories, setCategories] = useState([]);
  const [cityInput, setCityInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [noMatch, setNoMatch] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const types = await base44.entities.ServiceType.list();
        setCategories(types.filter(t => !t.status || t.status === 'active'));
      } catch (e) {
        console.error('Erreur chargement catégories', e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    // Message d'accueil initial
    setHistory([
      {
        from: 'bot',
        node: (
          <div>
            <p className="text-sm mb-1">Bonjour 👋 Je suis l'Assistant EventCrafter.</p>
            <p className="text-sm">Répondez à quelques questions et je vous proposerai les meilleurs prestataires pour votre événement.</p>
          </div>
        )
      },
      {
        from: 'bot',
        node: <p className="text-sm font-medium">Quel type d'événement organisez-vous ?</p>
      }
    ]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, results]);

  const pushUser = (label) => {
    setHistory(prev => [...prev, { from: 'user', node: <span>{label}</span> }]);
  };

  const pushBot = (node) => {
    setHistory(prev => [...prev, { from: 'bot', node }]);
  };

  const handleEventType = (opt) => {
    pushUser(opt.label);
    setAnswers(prev => ({ ...prev, eventType: opt.value }));
    pushBot(<p className="text-sm font-medium">Quelle catégorie de prestataire recherchez-vous ?</p>);
    setStep('category');
  };

  const handleCategory = (opt) => {
    pushUser(opt.name || opt);
    setAnswers(prev => ({ ...prev, category: opt.name || null }));
    pushBot(<p className="text-sm font-medium">Dans quelle ville ou quartier ? (ou laissez vide si peu importe)</p>);
    setStep('city');
  };

  const handleCitySubmit = () => {
    const city = cityInput.trim();
    pushUser(city || 'Peu importe');
    setAnswers(prev => ({ ...prev, city: city || null }));
    pushBot(<p className="text-sm font-medium">Quel est votre budget approximatif ?</p>);
    setStep('budget');
  };

  const handleBudget = (opt) => {
    pushUser(opt.label);
    setAnswers(prev => ({ ...prev, budgetMax: opt.max }));
    pushBot(<p className="text-sm font-medium">Une préférence culturelle particulière ?</p>);
    setStep('cultural');
  };

  const handleCultural = async (zone) => {
    pushUser(zone);
    const finalAnswers = { ...answers, culturalZone: zone === 'Peu importe' ? null : zone };
    setAnswers(finalAnswers);
    pushBot(<p className="text-sm">Je recherche les meilleurs prestataires pour vous... 🔍</p>);
    setStep('results');
    setSearching(true);
    await runSearch(finalAnswers);
    setSearching(false);
  };

  const runSearch = async (criteria) => {
    try {
      const [allServices, allVendors] = await Promise.all([
        base44.entities.Service.list(),
        base44.entities.VendorProfile.list()
      ]);

      const scoreAndFilter = (relaxCity, relaxBudget, relaxCultural) => {
        return allServices
          .filter(s => {
            if (criteria.category && s.category !== criteria.category) return false;
            if (!relaxCity && criteria.city) {
              const loc = (s.location || '').toLowerCase();
              if (!loc.includes(criteria.city.toLowerCase())) return false;
            }
            if (!relaxBudget && criteria.budgetMax && criteria.budgetMax !== Infinity) {
              if ((s.price_min || 0) > criteria.budgetMax) return false;
            }
            if (!relaxCultural && criteria.culturalZone) {
              if (!s.cultural_zones || !s.cultural_zones.includes(criteria.culturalZone)) return false;
            }
            return true;
          })
          .map(s => {
            const vendor = allVendors.find(v => v.user_id === (s.planner_id || s.created_by));
            return { ...s, _vendorPlan: vendor?.plan || 'free' };
          })
          .sort((a, b) => {
            const aVerified = a.vendor_verified ? 1 : 0;
            const bVerified = b.vendor_verified ? 1 : 0;
            if (bVerified !== aVerified) return bVerified - aVerified;
            const planScore = { gold: 2, premium: 1, free: 0 };
            const planDiff = (planScore[b._vendorPlan] || 0) - (planScore[a._vendorPlan] || 0);
            if (planDiff !== 0) return planDiff;
            return (b.rating || 0) - (a.rating || 0);
          });
      };

      // Recherche stricte d'abord, puis on assouplit progressivement si rien trouvé
      let matches = scoreAndFilter(false, false, false);
      let relaxed = false;
      if (matches.length === 0) {
        matches = scoreAndFilter(false, true, true); // garder ville, lâcher budget/culture
        relaxed = matches.length > 0;
      }
      if (matches.length === 0) {
        matches = scoreAndFilter(true, true, true); // tout lâcher sauf catégorie
        relaxed = matches.length > 0;
      }

      const top = matches.slice(0, 5);

      if (top.length === 0) {
        setNoMatch(true);
        setResults([]);
      } else {
        setNoMatch(false);
        setResults(top);
        if (relaxed) {
          pushBot(<p className="text-sm italic text-stone-500">Je n'ai pas trouvé de correspondance exacte, voici les options les plus proches :</p>);
        }
      }
    } catch (e) {
      console.error('Erreur recherche assistant', e);
      setNoMatch(true);
      setResults([]);
    }
  };

  const restart = () => {
    setAnswers({});
    setResults(null);
    setNoMatch(false);
    setCityInput('');
    setStep('event_type');
    setHistory([
      { from: 'bot', node: <p className="text-sm font-medium">Parfait, recommençons. Quel type d'événement organisez-vous ?</p> }
    ]);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col bg-[#F9F7F3]">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 sticky top-20 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F4C542] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#2C2C2C] font-['Poppins']">Assistant EventCrafter</h1>
            <p className="text-xs text-stone-500">Trouvez le bon prestataire en quelques questions</p>
          </div>
        </div>
      </div>

      {/* Zone de conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-6" ref={scrollRef}>
        <div className="max-w-3xl mx-auto">
          {history.map((h, idx) => (
            h.from === 'bot' ? <BotBubble key={idx}>{h.node}</BotBubble> : <UserBubble key={idx}>{h.node}</UserBubble>
          ))}

          {/* Options selon l'étape en cours */}
          {step === 'event_type' && (
            <BotBubble>
              <OptionButtons options={EVENT_TYPES} onSelect={handleEventType} />
            </BotBubble>
          )}

          {step === 'category' && (
            <BotBubble>
              <OptionButtons
                options={[{ name: 'Tous les Services' }, ...categories]}
                onSelect={(opt) => handleCategory(opt.name === 'Tous les Services' ? { name: null } : opt)}
              />
            </BotBubble>
          )}

          {step === 'city' && (
            <BotBubble>
              <div className="flex gap-2 mt-2">
                <Input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="ex. Douala, Bonapriso..."
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCitySubmit(); }}
                  className="flex-1"
                />
                <Button onClick={handleCitySubmit} className="bg-[#FF6B35] hover:bg-[#e05a2b]">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </BotBubble>
          )}

          {step === 'budget' && (
            <BotBubble>
              <OptionButtons options={BUDGET_RANGES} onSelect={handleBudget} />
            </BotBubble>
          )}

          {step === 'cultural' && (
            <BotBubble>
              <OptionButtons options={CULTURAL_ZONES} onSelect={handleCultural} />
            </BotBubble>
          )}

          {step === 'results' && (
            <>
              {searching && (
                <div className="flex items-center gap-2 text-stone-500 text-sm px-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Recherche en cours...
                </div>
              )}

              {!searching && results && results.length > 0 && (
                <div className="space-y-3 mb-4">
                  {results.map(service => (
                    <ServiceResultCard key={service.id} service={service} navigate={navigate} />
                  ))}
                </div>
              )}

              {!searching && noMatch && (
                <BotBubble>
                  <p className="text-sm mb-3">
                    Je n'ai trouvé aucun prestataire correspondant à votre recherche pour le moment.
                    Publiez une demande, et les prestataires intéressés viendront directement vers vous !
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl('PostRequest'))}
                    className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white"
                  >
                    Publier une Demande
                  </Button>
                </BotBubble>
              )}

              {!searching && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={restart}>
                    Faire une nouvelle recherche
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-stone-200 bg-white px-4 py-3 text-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <p className="text-xs text-stone-400">
          Les prix affichés sont des prix minimum — un devis précis sera établi après contact avec le prestataire.
        </p>
      </div>
    </div>
  );
}
