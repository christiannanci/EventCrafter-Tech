import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, Star, MapPin, CheckCircle2, ArrowRight, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { fuzzySearch } from '@/components/FuzzySearch';
import { useLanguage } from '@/components/LanguageContext';

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

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { t } = useLanguage();

  const EVENT_TYPES = [
    { value: 'Wedding', label: t('aiAssistant.eventWedding') },
    { value: 'Birthday', label: t('aiAssistant.eventBirthday') },
    { value: 'Corporate', label: t('aiAssistant.eventCorporate') },
    { value: 'Conference', label: t('aiAssistant.eventConference') },
    { value: 'Religious', label: t('aiAssistant.eventReligious') },
    { value: 'Funeral', label: t('aiAssistant.eventFuneral') },
    { value: 'Other', label: t('aiAssistant.eventOther') },
  ];

  const BUDGET_RANGES = [
    { value: 'low', label: t('aiAssistant.budgetLow'), max: 100000 },
    { value: 'mid', label: t('aiAssistant.budgetMid'), max: 300000 },
    { value: 'high', label: t('aiAssistant.budgetHigh'), max: 1000000 },
    { value: 'top', label: t('aiAssistant.budgetTop'), max: Infinity },
    { value: 'any', label: t('aiAssistant.anyPreference'), max: Infinity },
  ];

  const CULTURAL_ZONES = [
    t('aiAssistant.anyPreference'), 'Bamiléké', 'Aire Sawa', 'Aire Grassfields',
    'Aire Fang-Béti', 'Grand Nord (Soudano-Sahélien)', 'Bamoun', 'Bakweri'
  ];

  function ServiceResultCard({ service }) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 hover:border-[#FF6B35] transition-colors">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className="font-bold text-[#2C2C2C]">{service.title}</h4>
          {service.vendor_verified && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('aiAssistant.verifiedLabel')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500 mb-2">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {service.location || t('aiAssistant.locationNotSpecified')}</span>
          {service.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {service.rating.toFixed(1)} ({service.review_count || 0} {t('aiAssistant.reviewsWord')})
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 mb-2 line-clamp-2">{service.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#FF6B35]">{t('aiAssistant.startingFromLabel')} {service.price_min?.toLocaleString() || '?'} FCFA</span>
          <button
            onClick={() => navigate(`${createPageUrl('ServiceDetails')}?id=${service.id}`)}
            className="flex items-center gap-1 text-xs font-medium text-[#FF6B35] hover:underline"
          >
            {t('aiAssistant.viewServiceLink')} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  const [step, setStep] = useState('event_type');
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cityInput, setCityInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [noMatch, setNoMatch] = useState(false);

  const [freeQuestion, setFreeQuestion] = useState('');
  const [freeSearching, setFreeSearching] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const types = await base44.entities.ServiceType.list();
        setCategories(types.filter(tp => !tp.status || tp.status === 'active'));
      } catch (e) {
        console.error('Erreur chargement catégories', e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setHistory([
      {
        from: 'bot',
        node: (
          <div>
            <p className="text-sm mb-1">{t('aiAssistant.greetingLine1')}</p>
            <p className="text-sm">{t('aiAssistant.greetingLine2')}</p>
          </div>
        )
      },
      {
        from: 'bot',
        node: <p className="text-sm font-medium">{t('aiAssistant.askEventType')}</p>
      }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

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
    pushBot(<p className="text-sm font-medium">{t('aiAssistant.askCategory')}</p>);
    setStep('category');
  };

  const handleCategory = (opt) => {
    pushUser(opt.name || opt);
    setAnswers(prev => ({ ...prev, category: opt.name || null }));
    pushBot(<p className="text-sm font-medium">{t('aiAssistant.askCity')}</p>);
    setStep('city');
  };

  const handleCitySubmit = () => {
    const city = cityInput.trim();
    pushUser(city || t('aiAssistant.anyPreference'));
    setAnswers(prev => ({ ...prev, city: city || null }));
    pushBot(<p className="text-sm font-medium">{t('aiAssistant.askBudget')}</p>);
    setStep('budget');
  };

  const handleBudget = (opt) => {
    pushUser(opt.label);
    setAnswers(prev => ({ ...prev, budgetMax: opt.max }));
    pushBot(<p className="text-sm font-medium">{t('aiAssistant.askCultural')}</p>);
    setStep('cultural');
  };

  const handleCultural = async (zone) => {
    pushUser(zone);
    const finalAnswers = { ...answers, culturalZone: zone === t('aiAssistant.anyPreference') ? null : zone };
    setAnswers(finalAnswers);
    pushBot(<p className="text-sm">{t('aiAssistant.searching')}</p>);
    setStep('results');
    setSearching(true);
    await runSearch(finalAnswers);
    setSearching(false);
  };

  const runSearch = async (criteria) => {
    try {
      const [rawServices, allVendors] = await Promise.all([
        base44.entities.Service.list(),
        base44.entities.VendorProfile.list()
      ]);
      const allServices = rawServices.filter(s => !s.is_hidden && !s.is_suspended);

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

      let matches = scoreAndFilter(false, false, false);
      let relaxed = false;
      if (matches.length === 0) {
        matches = scoreAndFilter(false, true, true);
        relaxed = matches.length > 0;
      }
      if (matches.length === 0) {
        matches = scoreAndFilter(true, true, true);
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
          pushBot(<p className="text-sm italic text-stone-500">{t('aiAssistant.noMatchFound')}</p>);
        }
      }
    } catch (e) {
      console.error('Erreur recherche assistant', e);
      setNoMatch(true);
      setResults([]);
    }
  };

  const isContractQuestion = (text) => {
    return /contrat|contract|signer|signature|litige|dispute|dossier/i.test(text);
  };

  const contractStatusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      pending_signature: 'En attente de signature',
      signed: 'Signe',
      active: 'Actif',
      completed: 'Termine',
      cancelled: 'Annule',
      disputed: 'En litige'
    };
    return labels[status] || status;
  };

  const handleContractQuestion = async (question) => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        pushBot(
          <div>
            <p className="text-sm mb-3">
              Pour consulter vos contrats, vous devez d'abord vous connecter a votre compte.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Login'))}
              size="sm"
              className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white"
            >
              Se connecter
            </Button>
          </div>
        );
        return;
      }

      const allContracts = await base44.entities.Contract.list('-created_date', 20);
      const myContracts = allContracts.filter(
        c => c.client_account_id === currentUser.id || c.provider_account_id === currentUser.id
      );

      if (myContracts.length === 0) {
        pushBot(
          <p className="text-sm">
            Vous n'avez pour le moment aucun contrat enregistre sur la plateforme. Un contrat est cree automatiquement lorsqu'un prestataire et un client valident ensemble les termes d'une prestation.
          </p>
        );
        return;
      }

      const isVendorSideDashboard = myContracts.some(c => c.provider_account_id === currentUser.id);
      const dashboardLink = isVendorSideDashboard ? createPageUrl('VendorDashboard') + '?tab=dossiers' : createPageUrl('ClientDashboard');

      pushBot(
        <div>
          <p className="text-sm mb-3">
            Voici {myContracts.length > 1 ? `vos ${myContracts.length} contrats` : 'votre contrat'} :
          </p>
          <div className="space-y-2">
            {myContracts.slice(0, 5).map(c => (
              <div key={c.id} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#2C2C2C] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-stone-400" /> {c.contract_number || `Contrat #${c.id?.slice(0, 8)}`}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FFF0E8] text-[#FF6B35]">
                    {contractStatusLabel(c.status)}
                  </span>
                </div>
                {c.contract_amount ? (
                  <p className="text-xs text-stone-500">Montant : {c.contract_amount.toLocaleString()} FCFA</p>
                ) : null}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate(dashboardLink)}
            className="flex items-center gap-1 text-xs font-medium text-[#FF6B35] hover:underline mt-3"
          >
            Gerer mes contrats <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      );
    } catch (e) {
      console.error('Erreur recherche contrats', e);
      pushBot(<p className="text-sm text-red-500">Une erreur est survenue lors de la recuperation de vos contrats. Reessayez ou consultez directement votre tableau de bord.</p>);
    }
  };

  const handleFreeQuestion = async () => {
    const question = freeQuestion.trim();
    if (!question) return;

    pushUser(question);
    setFreeQuestion('');
    setFreeSearching(true);

    if (isContractQuestion(question)) {
      await handleContractQuestion(question);
      setFreeSearching(false);
      return;
    }

    try {
      const rawServices = await base44.entities.Service.list();
      const allServices = rawServices.filter(s => !s.is_hidden && !s.is_suspended);
      const searchResults = fuzzySearch(
        question,
        allServices,
        ['title', 'description', 'city', 'location', 'category'],
        45
      );

      if (searchResults && searchResults.length > 0) {
        const top = searchResults.slice(0, 5);
        pushBot(
          <div>
            <p className="text-sm mb-3">{t('aiAssistant.foundResultsFor')} "{question}" :</p>
            <div className="space-y-3">
              {top.map(service => (
                <ServiceResultCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        );
      } else {
        pushBot(
          <div>
            <p className="text-sm mb-3">
              {t('aiAssistant.noResultsFor')} "{question}". {t('aiAssistant.tryOtherKeywords')}
            </p>
            <Button
              onClick={() => navigate(createPageUrl('PostRequest'))}
              size="sm"
              className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white"
            >
              {t('aiAssistant.postRequestButton')}
            </Button>
          </div>
        );
      }
    } catch (e) {
      console.error('Erreur recherche libre', e);
      pushBot(<p className="text-sm text-red-500">{t('aiAssistant.searchErrorMessage')}</p>);
    } finally {
      setFreeSearching(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setResults(null);
    setNoMatch(false);
    setCityInput('');
    setStep('event_type');
    setHistory([
      { from: 'bot', node: <p className="text-sm font-medium">{t('aiAssistant.restartMessage')}</p> }
    ]);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col bg-[#F9F7F3]">
      <div className="bg-white border-b border-stone-200 px-4 py-4 sticky top-20 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F4C542] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#2C2C2C] font-['Poppins']">{t('aiAssistant.assistantTitle')}</h1>
            <p className="text-xs text-stone-500">{t('aiAssistant.assistantSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6" ref={scrollRef}>
        <div className="max-w-3xl mx-auto">
          {history.map((h, idx) => (
            h.from === 'bot' ? <BotBubble key={idx}>{h.node}</BotBubble> : <UserBubble key={idx}>{h.node}</UserBubble>
          ))}

          {step === 'event_type' && (
            <BotBubble>
              <OptionButtons options={EVENT_TYPES} onSelect={handleEventType} />
            </BotBubble>
          )}

          {step === 'category' && (
            <BotBubble>
              <OptionButtons
                options={[{ name: t('aiAssistant.allServicesOption') }, ...categories]}
                onSelect={(opt) => handleCategory(opt.name === t('aiAssistant.allServicesOption') ? { name: null } : opt)}
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
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('aiAssistant.searching')}
                </div>
              )}

              {!searching && results && results.length > 0 && (
                <div className="space-y-3 mb-4">
                  {results.map(service => (
                    <ServiceResultCard key={service.id} service={service} />
                  ))}
                </div>
              )}

              {!searching && noMatch && (
                <BotBubble>
                  <p className="text-sm mb-3">
                    {t('aiAssistant.noVendorFoundTitle')}
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl('PostRequest'))}
                    className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white"
                  >
                    {t('aiAssistant.postRequestButton')}
                  </Button>
                </BotBubble>
              )}

              {!searching && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={restart}>
                    {t('aiAssistant.newSearchButton')}
                  </Button>
                </div>
              )}
            </>
          )}

          {freeSearching && (
            <div className="flex items-center gap-2 text-stone-500 text-sm px-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('aiAssistant.searching')}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-stone-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-400">{t('aiAssistant.questionPromptSuffix')}</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={freeQuestion}
              onChange={(e) => setFreeQuestion(e.target.value)}
              placeholder={t('aiAssistant.freeSearchPlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter' && !freeSearching) handleFreeQuestion(); }}
              className="flex-1"
              disabled={freeSearching}
            />
            <Button
              onClick={handleFreeQuestion}
              disabled={freeSearching || !freeQuestion.trim()}
              className="bg-[#FF6B35] hover:bg-[#e05a2b]"
            >
              {freeSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-stone-400 mt-2 text-center">
            {t('aiAssistant.priceDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
