import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Service, ServiceType, Fonction, VendorProfile, Booking, Conversation, Region, Departement, Ville, Quartier } from '@/api/entities';
import { base44 } from '@/api/apiClient';
import SEOHead, { StructuredData, generateServiceSchema } from '@/components/SEOHead';
import ServiceCard from '@/components/ServiceCard';
import ServiceCardSkeleton from '@/components/ServiceCardSkeleton';
import CategoryFilter from '@/components/CategoryFilter';
import { fuzzySearch } from '@/components/FuzzySearch';
import { applyRecommendationScoring } from '@/components/RecommendationEngine';
import { applyRankingSystem, getTopRatedServices } from '@/components/RankingEngine';

import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/components/LanguageContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationSelector from "@/components/LocationSelector";

export default function Marketplace() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCategory = searchParams.get('category') || 'all';
  const initialSubCategory = searchParams.get('subcategory') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const eventIdParam = searchParams.get('event_id');
  
  const locLevel = searchParams.get('location_level');
  const locCode = searchParams.get('location_code');
  const locName = searchParams.get('location_name');

  const initialCultural = searchParams.get('cultural') || 'all';
  const initialLanguage = searchParams.get('language') || 'all';
  const initialReligion = searchParams.get('religion') || 'all';
  const initialDiaspora = searchParams.get('diaspora') === 'true';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubCategory);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  const [filterCultural, setFilterCultural] = useState(initialCultural);
  const [filterLanguage, setFilterLanguage] = useState(initialLanguage);
  const [filterReligion, setFilterReligion] = useState(initialReligion);
  const [filterDiaspora, setFilterDiaspora] = useState(initialDiaspora);

  const [availableCities, setAvailableCities] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [functions, setFunctions] = useState([]);
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handleRefresh = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['marketplace-services'] });
  }, [queryClient]);
  const { pullDistance, isPulling, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh);

  const tr = (val) => {
    if (!val) return val;
    const translated = t(`dynamicLabels.${val}`);
    return translated === `dynamicLabels.${val}` ? val : translated;
  };
  
  const [geoData, setGeoData] = useState({ regions: [], depts: [], cities: [], neighborhoods: [] });

  useEffect(() => {
    const loadRefData = async () => {
      try {
        const [types, fns] = await Promise.all([
          ServiceType.list(),
          Fonction.list()
        ]);
        setServiceTypes(types);
        setFunctions(fns);
        
        const { getSearchHistory } = await import('../components/SearchHistory');
        setSearchHistory(getSearchHistory());
      } catch (error) {
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les catégories",
          variant: "destructive"
        });
      }
    };
    loadRefData();
  }, []);

  useEffect(() => {
      const loadGeo = async () => {
          if (locLevel && locCode) {
              const [r, d, c, n] = await Promise.all([
                   Region.list(),
                   Departement.list(),
                   Ville.list(),
                   Quartier.list()
              ]);
              setGeoData({ regions: r, depts: d, cities: c, neighborhoods: n });
          }
      };
      loadGeo();
  }, [locLevel, locCode]);

  const { data: allServices = [], isLoading } = useQuery({
    queryKey: ['marketplace-services'],
    queryFn: () => Service.list('-created_date', 1000),
    staleTime: 3 * 60 * 1000,
  });

  const { data: vendorProfiles = [] } = useQuery({
    queryKey: ['vendor-profiles'],
    queryFn: () => VendorProfile.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => Booking.list('-created_date', 1000),
    staleTime: 5 * 60 * 1000,
  });
  
  const { data: allConversations = [] } = useQuery({
    queryKey: ['all-conversations'],
    queryFn: () => Conversation.list(),
    staleTime: 5 * 60 * 1000,
  });

  const [currentUser, setCurrentUser] = React.useState(null);
  const [rankedServices, setRankedServices] = React.useState([]);
  const [topRated, setTopRated] = React.useState({ gold: [], premium: [], standard: [] });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        setCurrentUser(null);
      }
    };
    loadUser();
  }, []);

  React.useEffect(() => {
    const applyRanking = async () => {
      if (allServices && allServices.length > 0) {
        try {
          const validServices = allServices.filter(s => s && typeof s === 'object');
          const ranked = await applyRankingSystem(validServices, searchTerm);
          setRankedServices(ranked || []);
          const topServices = getTopRatedServices(ranked || []);
          setTopRated(topServices || { gold: [], premium: [], standard: [] });
        } catch (e) {
          console.error('Ranking failed:', e);
          setRankedServices(allServices.filter(s => s && typeof s === 'object'));
        }
      }
    };
    applyRanking();
  }, [allServices, searchTerm]);

  useEffect(() => {
    if (allServices && allServices.length > 0) {
      try {
        const cities = [...new Set((allServices || []).filter(s => s).map(s => s?.city || s?.location).filter(Boolean))].sort();
        setAvailableCities(cities || []);
      } catch {
        setAvailableCities([]);
      }
    }
  }, [allServices]);

  const { services, totalPages, recommendedServices } = React.useMemo(() => {
    let data = [];
    if (rankedServices && rankedServices.length > 0) {
      data = [...rankedServices];
    } else if (allServices && allServices.length > 0) {
      data = [...allServices];
    }
    
    data = data.filter(s => s && typeof s === 'object' && s.id);
    
    data = data.map(service => {
      try {
        const vendorProfile = (vendorProfiles || []).find(v => v?.user_id === service?.planner_id);
        const vendorBookings = (allBookings || []).filter(b => b?.planner_id === service?.planner_id);
        const completedContracts = vendorBookings.filter(b => b?.status === 'completed' || b?.status === 'delivered').length;
        
        const vendorConversations = (allConversations || []).filter(conv => 
          conv?.participants && Array.isArray(conv.participants) && conv.participants.includes(service?.planner_id)
        );
        const uniqueClients = new Set(
          vendorConversations.flatMap(conv => 
            (conv?.participants || []).filter(p => p !== service?.planner_id)
          )
        ).size;
        
        const isActiveVendor = completedContracts > 0 || uniqueClients >= 3;
        
        return {
          ...service,
          _vendorPlan: vendorProfile?.plan || 'free',
          _isActiveVendor: isActiveVendor,
        };
      } catch {
        return {
          ...service,
          _vendorPlan: 'free',
          _isActiveVendor: false,
        };
      }
    });

    if (currentUser && currentUser.id && vendorProfiles && vendorProfiles.length > 0 && allBookings && allBookings.length > 0) {
      try {
        const userBookings = allBookings.filter(b => b && b.created_by === currentUser.id);
        
        const recommendedData = applyRecommendationScoring(data, {
          userBookings: userBookings || [],
          userViews: [],
          allBookings: allBookings || [],
          vendorProfiles: vendorProfiles || [],
          currentUserId: currentUser.id
        });
        
        if (recommendedData && Array.isArray(recommendedData) && recommendedData.length > 0) {
          data = recommendedData;
        }
      } catch (e) {
        console.warn('Recommendation scoring failed:', e);
      }
    }

        if (selectedCategory && selectedCategory !== 'all') {
            data = data.filter(s => s && s.category === selectedCategory);
        }

        if (selectedSubCategory && selectedSubCategory !== 'all') {
            data = data.filter(s => {
                if (!s) return false;
                if (!Array.isArray(s.function_codes)) return false;
                return s.function_codes.includes(selectedSubCategory);
            });
        }

        if (cityFilter && cityFilter !== "all_cities") {
             data = data.filter(s => s && ((s.city === cityFilter) || (s.location === cityFilter)));
        }

        if (filterCultural && filterCultural !== "all") {
            data = data.filter(s => {
                if (!s) return false;
                if (!Array.isArray(s.cultural_zones)) return false;
                return s.cultural_zones.includes(filterCultural);
            });
        }

        if (filterLanguage && filterLanguage !== "all") {
            data = data.filter(s => {
                if (!s) return false;
                if (!Array.isArray(s.spoken_languages)) return false;
                return s.spoken_languages.includes(filterLanguage);
            });
        }

        if (filterReligion && filterReligion !== "all") {
            data = data.filter(s => {
                if (!s) return false;
                if (!Array.isArray(s.religious_compatibility)) return false;
                return s.religious_compatibility.includes(filterReligion);
            });
        }

        if (filterDiaspora) {
            data = data.filter(s => s && s.diaspora_ready === true);
        }

        if (locLevel && locCode && geoData.regions.length > 0) {
            data = data.filter(s => {
                if (!s) return false;
                if (s.availability_level === locLevel && s.availability_code === locCode) return true;

                let parentRegion, parentCountry, parentCity, parentDept;
                
                if (locLevel === 'quartier' && geoData.neighborhoods.length > 0) {
                    const q = geoData.neighborhoods.find(i => i && i.code === locCode);
                    if (q && q.ville_code && geoData.cities.length > 0) {
                        const v = geoData.cities.find(i => i && i.code === q.ville_code);
                        if (v && v.code) {
                            parentCity = v.code;
                            if (v.departement_code && geoData.depts.length > 0) {
                                const d = geoData.depts.find(i => i && i.code === v.departement_code);
                                if (d && d.code) {
                                    parentDept = d.code;
                                    if (d.region_code && geoData.regions.length > 0) {
                                        const r = geoData.regions.find(i => i && i.code === d.region_code);
                                        if (r && r.code) parentRegion = r.code;
                                    }
                                }
                            }
                        }
                    }
                } else if (locLevel === 'ville' && geoData.cities.length > 0) {
                    const v = geoData.cities.find(i => i && i.code === locCode);
                    if (v && v.code) {
                        parentCity = v.code;
                        if (v.departement_code && geoData.depts.length > 0) {
                            const d = geoData.depts.find(i => i && i.code === v.departement_code);
                            if (d && d.code) {
                                parentDept = d.code;
                                if (d.region_code && geoData.regions.length > 0) {
                                    const r = geoData.regions.find(i => i && i.code === d.region_code);
                                    if (r && r.code) parentRegion = r.code;
                                }
                            }
                        }
                    }
                } else if (locLevel === 'region') {
                    parentRegion = locCode;
                }

                if (s.availability_level === 'country' && s.availability_code === 'CM') return true;
                if (s.availability_level === 'region' && s.availability_code && s.availability_code === parentRegion) return true;
                if (s.availability_level === 'departement' && s.availability_code && s.availability_code === parentDept) return true;
                if (s.availability_level === 'ville' && s.availability_code && s.availability_code === parentCity) return true;

                if (locLevel === 'ville' && s.availability_level === 'quartier' && s.availability_code && geoData.neighborhoods.length > 0) {
                    const q = geoData.neighborhoods.find(n => n && n.code === s.availability_code);
                    if (q && q.ville_code === locCode) return true;
                }
                
                if (locLevel === 'region' && s.availability_level === 'ville' && s.availability_code && geoData.cities.length > 0) {
                    const v = geoData.cities.find(n => n && n.code === s.availability_code);
                    if (v && v.departement_code && geoData.depts.length > 0) {
                        const d = geoData.depts.find(dp => dp && dp.code === v.departement_code);
                        if (d && d.region_code === locCode) return true;
                    }
                }

                if (locLevel === 'ville' && s.city === locName) return true;
                if (locLevel === 'region' && s.region === locName) return true;

                return false;
            });
        }

        if (searchTerm && searchTerm.trim()) {
          try {
            const searchResults = fuzzySearch(
              searchTerm, 
              data, 
              ['title', 'description', 'city', 'location', 'neighborhood_code', 'category'],
              55
            );
            data = searchResults && Array.isArray(searchResults) ? searchResults : data;
          } catch (e) {
            console.warn('Search failed:', e);
          }
        }

        const planPriority = { 'gold': 3, 'premium': 2, 'free': 1 };
        
        data.sort((a, b) => {
          const aProfile = vendorProfiles.find(vp => vp && vp.user_id === a.planner_id);
          const bProfile = vendorProfiles.find(vp => vp && vp.user_id === b.planner_id);
          
          const aPlan = planPriority[(aProfile && aProfile.plan) || 'free'] || 0;
          const bPlan = planPriority[(bProfile && bProfile.plan) || 'free'] || 0;
          
          if (aPlan !== bPlan) {
            return bPlan - aPlan;
          }
          
          if (sortBy === "price_low") return (a.price_min || 0) - (b.price_min || 0);
          if (sortBy === "price_high") return (b.price_min || 0) - (a.price_min || 0);
          if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
          if (sortBy === "verified") return (b.vendor_verified ? 1 : 0) - (a.vendor_verified ? 1 : 0);
          if (sortBy === "featured") return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
          return 0;
        });

    const validData = data && Array.isArray(data) ? data : [];
    const pages = Math.max(1, Math.ceil(validData.length / ITEMS_PER_PAGE));
    const safePage = Math.min(Math.max(1, page), pages);
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    const paginatedData = validData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    const recommended = currentUser && sortBy === "recommended" && validData.length > 0
      ? validData.slice(0, 8) 
      : [];
    
    return { 
      services: paginatedData || [], 
      totalPages: pages, 
      recommendedServices: recommended || []
    };
  }, [rankedServices, allServices, page, selectedCategory, selectedSubCategory, searchTerm, sortBy, cityFilter, filterCultural, filterLanguage, filterReligion, filterDiaspora, locLevel, locCode, geoData, currentUser, vendorProfiles, allBookings]);

  const seoCity = locName || cityFilter || 'Cameroun';
  const seoCategory = selectedCategory !== 'all' ? selectedCategory : 'Prestataires Événements';

  return (
    <div
      className="min-h-screen bg-stone-50 py-12"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition-all"
          style={{ opacity: Math.min(pullDistance / 72, 1) }}
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {isRefreshing ? t('marketplace.refreshing') : isPulling ? t('marketplace.releaseToRefresh') : t('marketplace.pullToRefresh')}
        </div>
      )}
      <SEOHead 
        title={`${seoCategory} à ${seoCity} - EventCrafter Cameroun | Trouvez votre Prestataire`}
        description={`Découvrez les meilleurs ${seoCategory.toLowerCase()} à ${seoCity}. Comparez les prix, consultez les avis et réservez en ligne. ${services.length}+ prestataires disponibles.`}
        keywords={`${seoCategory} ${seoCity}, prestataire événement ${seoCity}, organisation ${seoCity}, ${seoCategory} Cameroun`}
      />
      
      {services && services.length > 0 && vendorProfiles && vendorProfiles.length > 0 && services[0] && vendorProfiles[0] && (
        <StructuredData data={generateServiceSchema(services[0], vendorProfiles[0])} />
      )}
      
      <div className="container mx-auto px-4">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">{t('marketplace.title')}</h1>
            <p className="text-stone-500 mt-1">{t('marketplace.subtitle')}</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
            <LocationSelector className="w-full md:w-auto" />
            
            <div className="relative flex-grow md:w-60 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 z-10" />
              <Input 
                placeholder={t('marketplace.searchPlaceholder')}
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={async (e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  
                  if (value.length >= 2) {
                    const { generateSuggestions } = await import('../components/FuzzySearch');
                    const suggestions = generateSuggestions(value, searchHistory, allServices, 5);
                    setSearchSuggestions(suggestions);
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (searchTerm.length >= 2) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    const { addToSearchHistory } = await import('../components/SearchHistory');
                    addToSearchHistory(searchTerm);
                    setSearchHistory(prev => [searchTerm, ...prev.filter(h => h !== searchTerm)].slice(0, 20));
                    setShowSuggestions(false);
                  }
                }}
              />
              
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm text-stone-700 flex items-center gap-2"
                      onClick={async () => {
                        setSearchTerm(suggestion);
                        const { addToSearchHistory } = await import('../components/SearchHistory');
                        addToSearchHistory(suggestion);
                        setSearchHistory(prev => [suggestion, ...prev.filter(h => h !== suggestion)].slice(0, 20));
                        setShowSuggestions(false);
                      }}
                    >
                      <Search className="w-3 h-3 text-stone-400" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px] bg-white">
                <SelectValue placeholder={t('marketplace.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t('marketplace.bestRanking')}</SelectItem>
                {currentUser && <SelectItem value="recommended">{t('marketplace.recommendedForYou')}</SelectItem>}
                <SelectItem value="featured">{t('marketplace.sort.featured')}</SelectItem>
                <SelectItem value="price_low">{t('marketplace.sort.priceLow')}</SelectItem>
                <SelectItem value="price_high">{t('marketplace.sort.priceHigh')}</SelectItem>
                <SelectItem value="rating">{t('marketplace.sort.rating')}</SelectItem>
                <SelectItem value="verified">{t('marketplace.sort.verified')}</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="bg-white">
                  <SlidersHorizontal className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{t('marketplace.filters')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{t('marketplace.filterTitle')}</SheetTitle>
                  <SheetDescription>{t('marketplace.refineSearch')}</SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6 overflow-y-auto max-h-[80vh]">

                  {selectedCategory !== 'all' && (
                      <div>
                          <h3 className="text-sm font-medium mb-3">{t('marketplace.subCategory')}</h3>
                          <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                              <SelectTrigger>
                                  <SelectValue placeholder={t('marketplace.selectSubCategory')} />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">{t('marketplace.allSubCategories')}</SelectItem>
                                  {functions
                                      .filter(f => {
                                          const cat = serviceTypes.find(t2 => t2.name === selectedCategory);
                                          return cat && f.service_type_code === cat.code_service;
                                      })
                                      .map(f => (
                                          <SelectItem key={f.id} value={f.code}>{tr(f.name)}</SelectItem>
                                      ))
                                  }
                              </SelectContent>
                          </Select>
                      </div>
                  )}

                  <div>
                      <h3 className="text-sm font-medium mb-3">{t('marketplace.culturalAffinity')}</h3>
                      <Select value={filterCultural} onValueChange={setFilterCultural}>
                          <SelectTrigger>
                              <SelectValue placeholder={t('marketplace.anyCulture')} />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">{t('marketplace.anyCulture')}</SelectItem>
                              {["Aire Sawa", "Aire Grassfields", "Aire Fang-Béti", "Grand Nord (Soudano-Sahélien)", "Bamiléké", "Bamoun", "Bakweri"].map(z => (
                                  <SelectItem key={z} value={z}>{tr(z)}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div>
                      <h3 className="text-sm font-medium mb-3">{t('marketplace.language')}</h3>
                      <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                          <SelectTrigger>
                              <SelectValue placeholder={t('marketplace.anyLanguage')} />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">{t('marketplace.anyLanguage')}</SelectItem>
                              {["Français", "Anglais", "Pidgin", "Dialectes Locaux"].map(l => (
                                  <SelectItem key={l} value={l}>{tr(l)}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div>
                      <h3 className="text-sm font-medium mb-3">{t('marketplace.religionTradition')}</h3>
                      <Select value={filterReligion} onValueChange={setFilterReligion}>
                          <SelectTrigger>
                              <SelectValue placeholder={t('marketplace.anyPreference')} />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">{t('marketplace.anyPreference')}</SelectItem>
                              {["Chrétien", "Musulman", "Traditionnel/Ancestral", "Laïc"].map(r => (
                                  <SelectItem key={r} value={r}>{tr(r)}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <label htmlFor="diaspora-filter" className="text-sm font-medium cursor-pointer">
                          {t('marketplace.diasporaReady')}
                          <span className="block text-xs text-stone-500 font-normal">{t('marketplace.diasporaReadyDesc')}</span>
                      </label>
                      <div 
                          className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${filterDiaspora ? 'bg-rose-600' : 'bg-stone-200'}`}
                          onClick={() => setFilterDiaspora(!filterDiaspora)}
                      >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${filterDiaspora ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                  </div>

                  <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => {
                          setFilterCultural("all");
                          setFilterLanguage("all");
                          setFilterReligion("all");
                          setFilterDiaspora(false);
                          setSelectedSubCategory("all");
                      }}
                  >
                      {t('marketplace.resetFilters')}
                  </Button>
                </div>
                </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Category Filters */}
        <CategoryFilter selected={selectedCategory} onSelect={(cat) => {
            setSelectedCategory(cat);
            setSelectedSubCategory('all');
            setPage(1);
        }} />

        {/* Recommended Section */}
        {currentUser && sortBy === "recommended" && recommendedServices.length > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h2 className="text-xl font-bold text-stone-900">{t('marketplace.personalizedSelection')}</h2>
              <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
                {t('marketplace.priorityBadge')}
              </span>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              {t('marketplace.basedOnPreferences')}
            </p>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[...Array(12)].map((_, n) => (
               <ServiceCardSkeleton key={n} />
             ))}
           </div>
        ) : services.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {services.map((service, index) => {
                const globalPosition = (page - 1) * ITEMS_PER_PAGE + index + 1;
                const isTopRatedGold = topRated?.gold?.includes?.(service.id) || false;
                const isTopRatedPremium = topRated?.premium?.includes?.(service.id) || false;
                const isTopRatedStandard = topRated?.standard?.includes?.(service.id) || false;
                const isTopRated = isTopRatedGold || isTopRatedPremium || isTopRatedStandard;
                
                return (
                  <ServiceCard 
                    key={`service-${service.id}`} 
                    service={service} 
                    eventId={eventIdParam}
                    isTopRated={isTopRated}
                    position={globalPosition}
                  />
                );
              })}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                      className={page === i + 1 ? "bg-rose-600 hover:bg-rose-700" : ""}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
              <Search className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">{t('marketplace.noServices')}</h3>
            <p className="text-stone-500 mt-2 max-w-md mx-auto">
              {t('marketplace.noServicesDesc')}
            </p>
            <Button 
              variant="link" 
              className="mt-4 text-rose-600"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setCityFilter('all_cities');
                setPage(1);
              }}
            >
              {t('marketplace.clearFilters')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
