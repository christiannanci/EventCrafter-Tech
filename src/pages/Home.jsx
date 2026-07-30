import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import SEOHead from '@/components/SEOHead';
import { Input } from "@/components/ui/input";
import { Search, Calendar, Star, CheckCircle, ArrowRight, User, CheckCircle2, Quote, MapPin, SlidersHorizontal, Globe, BookOpen, ShieldCheck } from "lucide-react";
import { Service, ServiceType, Fonction, PlatformFeedback, VendorProfile, ClientProfile } from '@/api/entities';
import ServiceCard from '@/components/ServiceCard';
import LocationSelector from '@/components/LocationSelector';
import { createPageUrl } from '../utils';
import { useLanguage } from '@/components/LanguageContext';
import { useLocationContext } from '@/components/LocationContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function Home() {
  useEffect(() => {
    const isSearchBot = /bot|crawler|spider|crawling/i.test(navigator.userAgent);
    if (isSearchBot && window.location.pathname === '/') {
      window.location.href = '/SEOCameroun';
    }
  }, []);

  const [featuredServices, setFeaturedServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterCultural, setFilterCultural] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterReligion, setFilterReligion] = useState("all");
  const [filterDiaspora, setFilterDiaspora] = useState(false);

  const { t } = useLanguage();
  const { selectedCountry } = useLocationContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesData, types, funcs, feedbacks] = await Promise.all([
          Service.list('-created_date', 20),
          ServiceType.list(),
          Fonction.list(),
          PlatformFeedback.list()
        ]);
        setFeaturedServices(servicesData.slice(0, 6));
        setServiceTypes(types.filter(t => !t.status || t.status === 'active'));
        setFunctions(funcs.filter(f => f.status === 'active'));

        if (feedbacks.length > 0) {
          const publicFeedbacks = feedbacks.slice(0, 3);
          const providerIds = publicFeedbacks.filter(f => f.user_role === 'provider').map(f => f.user_id);
          const clientIds = publicFeedbacks.filter(f => f.user_role !== 'provider').map(f => f.user_id);

          const [vendorProfiles, clientProfiles] = await Promise.all([
            providerIds.length > 0 ? VendorProfile.filter({ user_id: providerIds[0] }): Promise.resolve([]),
            clientIds.length > 0 ? ClientProfile.filter({ user_id: clientIds[0] }): Promise.resolve([])
          ]);

          const enrichedFeedbacks = publicFeedbacks.map(f => {
            let displayName = "Utilisateur", displayLocation = "", avatarUrl = null;
            if (f.user_role === 'provider') {
              const profile = vendorProfiles.find(p => p.user_id === f.user_id);
              if (profile) { displayName = profile.business_name || "Prestataire"; displayLocation = profile.city || ""; avatarUrl = profile.profile_image; }
            } else {
              const profile = clientProfiles.find(p => p.user_id === f.user_id);
              if (profile) { displayName = profile.pseudo || profile.first_name || "Client"; displayLocation = profile.city || ""; }
            }
            return { ...f, displayName, displayLocation, avatarUrl };
          });
          setTestimonials(enrichedFeedbacks);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead />
      
      {/* Hero Section */}
      <section className="relative h-[480px] sm:h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=75" 
            alt="Organisation d'événements au Cameroun - Mariages, anniversaires, corporate" 
            loading="eager"
            fetchpriority="high"
            decoding="sync"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 to-stone-900/40" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-['Poppins'] font-bold text-white mb-3 sm:mb-6 tracking-tight">
            {t('home.heroTitle')} <span className="text-[#F4C542] font-['Dancing_Script']">{t('home.heroTitleHighlight')}</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-[#F9F7F3] mb-4 sm:mb-8 max-w-2xl mx-auto font-light px-2">
            {t('home.heroSubtitle')}
          </p>

          {/* Smart Search Box */}
          <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl mx-auto flex flex-col gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center justify-between w-full">
             <div className="w-full sm:w-40 lg:w-48 flex-shrink-0">
                 <Select value={selectedCategory} onValueChange={(val) => {
                     setSelectedCategory(val);
                     setSelectedSubCategory("all");
                 }}>
                     <SelectTrigger className="h-12 border-stone-200 bg-stone-50 focus:bg-white">
                         <SelectValue placeholder={t('marketplace.subCategory')} />
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="all">{t('categories.All')}</SelectItem>
                         {serviceTypes.map(t2 => (
                             <SelectItem key={t2.id} value={t2.name}>{t2.name}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
             </div>

             {selectedCategory !== 'all' && (
                 <div className="w-full sm:w-40 lg:w-48 flex-shrink-0 animate-in fade-in slide-in-from-left-2">
                     <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                         <SelectTrigger className="h-12 border-stone-200 bg-stone-50 focus:bg-white">
                             <SelectValue placeholder={t('marketplace.subCategory')} />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="all">{t('marketplace.allSubCategories')}</SelectItem>
                             {functions
                                 .filter(f => {
                                     const cat = serviceTypes.find(t2 => t2.name === selectedCategory);
                                     return cat && f.service_type_code === cat.code_service;
                                 })
                                 .map(f => (
                                     <SelectItem key={f.id} value={f.code}>{f.name}</SelectItem>
                                 ))
                             }
                         </SelectContent>
                     </Select>
                 </div>
             )}

             <div className="flex-grow w-full lg:w-auto relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-rose-500 transition-colors" />
                    <Input 
                        type="text" 
                        placeholder={t('home.searchPlaceholder')} 
                        className="pl-9 h-12 border-stone-200 focus-visible:ring-rose-500 bg-stone-50 focus:bg-white transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const params = new URLSearchParams();
                                if (searchTerm) params.append('search', searchTerm);
                                if (selectedCategory !== 'all') params.append('category', selectedCategory);
                                if (selectedSubCategory !== 'all') params.append('subcategory', selectedSubCategory);
                                if (filterCultural !== 'all') params.append('cultural', filterCultural);
                                if (filterLanguage !== 'all') params.append('language', filterLanguage);
                                if (filterReligion !== 'all') params.append('religion', filterReligion);
                                if (filterDiaspora) params.append('diaspora', 'true');
                                window.location.href = `${createPageUrl('Marketplace')}?${params.toString()}`;
                            }
                        }}
                        />
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 ${showAdvanced ? 'bg-rose-50 text-rose-600' : 'text-stone-400'}`}
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            title={t('marketplace.filters')}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                        </Button>

                        <Button 
                        className="w-full sm:w-auto h-10 sm:h-12 bg-rose-600 hover:bg-rose-700 text-white px-6 sm:px-8"
                        onClick={() => {
                        const params = new URLSearchParams();
                        if (searchTerm) params.append('search', searchTerm);
                        if (selectedCategory !== 'all') params.append('category', selectedCategory);
                        if (selectedSubCategory !== 'all') params.append('subcategory', selectedSubCategory);
                        if (filterCultural !== 'all') params.append('cultural', filterCultural);
                        if (filterLanguage !== 'all') params.append('language', filterLanguage);
                        if (filterReligion !== 'all') params.append('religion', filterReligion);
                        if (filterDiaspora) params.append('diaspora', 'true');
                        window.location.href = `${createPageUrl('Marketplace')}?${params.toString()}`;
                        }}
                        >
                        {t('nav.marketplace')}
                        </Button>
             </div>

             {showAdvanced && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 w-full pt-3 border-t border-stone-100 animate-in slide-in-from-top-2">
                     <Select value={filterCultural} onValueChange={setFilterCultural}>
                        <SelectTrigger className="bg-stone-50 border-stone-200">
                            <SelectValue placeholder={t('marketplace.culturalAffinity')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('marketplace.anyCulture')}</SelectItem>
                            {["Aire Sawa", "Aire Grassfields", "Aire Fang-Béti", "Grand Nord (Soudano-Sahélien)", "Bamiléké", "Bamoun", "Bakweri"].map(z => (
                                <SelectItem key={z} value={z}>{z}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>

                     <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                        <SelectTrigger className="bg-stone-50 border-stone-200">
                            <SelectValue placeholder={t('marketplace.language')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('marketplace.anyLanguage')}</SelectItem>
                            {["Français", "Anglais", "Pidgin", "Dialectes locaux"].map(l => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>

                     <Select value={filterReligion} onValueChange={setFilterReligion}>
                        <SelectTrigger className="bg-stone-50 border-stone-200">
                            <SelectValue placeholder={t('marketplace.religionTradition')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('marketplace.anyPreference')}</SelectItem>
                            {["Chrétien", "Musulman", "Traditionnel/Ancestral", "Laïc"].map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>

                     <div 
                        className={`flex items-center justify-between px-4 rounded-md border cursor-pointer transition-colors h-10 ${filterDiaspora ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-200'}`}
                        onClick={() => setFilterDiaspora(!filterDiaspora)}
                     >
                        <span className={`text-sm ${filterDiaspora ? 'text-rose-700 font-medium' : 'text-stone-600'}`}>{t('marketplace.diasporaReady')}</span>
                        <div className={`w-3 h-3 rounded-full ${filterDiaspora ? 'bg-rose-600' : 'bg-stone-300'}`} />
                     </div>
                 </div>
             )}
          </div>
          <div className="mt-6 md:hidden">
             <Link to={createPageUrl('PostRequest')}>
                <Button variant="secondary" className="w-full rounded-full bg-[#F4C542] text-[#2C2C2C] hover:bg-[#eac45f] border-0 font-bold">
                  {t('home.postRequestInstead')}
                </Button>
              </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 sm:py-20 bg-[#F9F7F3]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-['Poppins'] font-bold text-[#2C2C2C] mb-2 sm:mb-4">{t('home.browseCategory')}</h2>
            <p className="text-gray-500 font-['Inter']">{t('home.categorySubtitle')}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[
              { name: t('categories.Caterer'), category: "Caterer", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
              { name: t('categories.Photographer'), category: "Photographer", img: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
              { name: t('categories.Florist'), category: "Florist", img: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
              { name: t('categories.Decorator'), category: "Decorator", img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }
            ].map((cat) => (
              <Link 
                to={`${createPageUrl('Marketplace')}?category=${cat.category}`} 
                key={cat.category}
                className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer"
              >
                <img 
                  src={cat.img} 
                  alt={`${cat.name} pour événements au Cameroun`}
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={500}
                  className="w-full h-full object-cover transform-gpu group-hover:scale-110 transition-transform duration-700 will-change-transform"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services (Geo-Targeted) */}
      <section className="py-10 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6 sm:mb-12">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-stone-900 mb-1 sm:mb-2">
                  {selectedCountry ? `${t('home.recommendedIn')} ${selectedCountry}` : t('home.featuredPlanners')}
              </h2>
              <p className="text-stone-500">
                  {t('home.featuredSubtitle')}
              </p>
            </div>
            <Link to={createPageUrl('Marketplace')}>
              <Button variant="outline" className="hidden md:flex">
                {t('home.viewAll')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {featuredServices.length > 0 ? (
              featuredServices.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-[400px] bg-stone-100 rounded-xl animate-pulse" />
              ))
            )}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link to={createPageUrl('Marketplace')}>
              <Button variant="outline" className="w-full">
                {t('home.viewAllServices')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Vendor Success Section (Stage 2: Interest) */}
      <section className="py-10 sm:py-20 bg-stone-900 text-white" style={{contentVisibility: 'auto', containIntrinsicSize: '0 600px'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{t('home.growBusiness')}</h2>
              <p className="text-stone-300 text-lg mb-8">
                {t('home.growSubtitle')}
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{t('home.createProfile')}</h4>
                    <p className="text-stone-400">{t('home.createProfileDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{t('home.getDiscovered')}</h4>
                    <p className="text-stone-400">{t('home.getDiscoveredDesc')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Button 
                  size="lg" 
                  className="bg-white text-stone-900 hover:bg-stone-100 px-8 h-12 text-lg"
                  onClick={() => window.location.href = createPageUrl('VendorOnboarding')}
                >
                  {t('home.joinFree')}
                </Button>
              </div>
            </div>

            <div className="bg-stone-800 p-5 sm:p-8 rounded-2xl border border-stone-700 relative">
              <div className="absolute -top-6 -right-6 bg-rose-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transform rotate-3">
                {t('home.vendorStory')}
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-stone-600 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=128&h=128&fit=crop&q=75" alt="Prestataire vérifié EventCrafter" loading="lazy" width={64} height={64} />
                </div>
                <div>
                  <div className="font-bold text-xl">Sarah N.</div>
                  <div className="text-stone-400">{t('home.vendorSpotlightRole')}</div>
                </div>
              </div>
              <p className="text-stone-300 italic text-lg leading-relaxed">
                "{t('home.vendorQuote')}"
              </p>
              <div className="mt-6 flex items-center gap-2 text-rose-400 font-medium">
                <CheckCircle2 className="w-5 h-5" /> {t('home.verifiedProvider')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-10 sm:py-20 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-6 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2 sm:mb-4">{t('home.communityReviews')}</h2>
                    <p className="text-stone-500">{t('home.communitySubtitle')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                    {testimonials.map((review, idx) => (
                        <div key={review.id || idx} className="bg-stone-50 p-5 sm:p-8 rounded-2xl relative border border-stone-100 hover:shadow-lg transition-shadow">
                            <Quote className="absolute top-6 left-6 w-8 h-8 text-rose-200" />
                            <div className="relative z-10">
                                <p className="text-stone-600 italic mb-6 leading-relaxed pt-6">
                                    "{review.comment}"
                                </p>
                                {review.benefits_experienced && (
                                    <div className="mb-6 p-3 bg-rose-50/50 rounded-lg text-sm text-rose-800">
                                        <span className="font-bold block text-rose-600 mb-1">{t('home.keyBenefit')}</span>
                                        {review.benefits_experienced}
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    {review.avatarUrl ? (
                                        <img src={review.avatarUrl} alt={review.displayName} className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${review.user_role === 'provider' ? 'bg-stone-900' : 'bg-rose-500'}`}>
                                            {review.displayName.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-stone-900">{review.displayName}</div>
                                        <div className="text-xs font-medium text-stone-400">
                                            {review.displayLocation && (
                                                <span className="mr-1">{review.displayLocation} •</span>
                                            )}
                                            <span className="uppercase tracking-wider">{review.user_role}</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto flex">
                                        {[...Array(review.rating || 5)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      )}

      {/* Trust Section */}
      <section className="py-10 sm:py-20 bg-rose-50/50" style={{contentVisibility: 'auto', containIntrinsicSize: '0 400px'}}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{t('home.verified')}</h3>
              <p className="text-stone-500 leading-relaxed">{t('home.verifiedDesc')}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{t('home.seamless')}</h3>
              <p className="text-stone-500 leading-relaxed">{t('home.seamlessDesc')}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{t('home.topRated')}</h3>
              <p className="text-stone-500 leading-relaxed">{t('home.topRatedDesc')}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
