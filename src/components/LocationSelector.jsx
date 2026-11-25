import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Country, Region, Ville, Quartier, Departement, Service } from '@/api/entities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, PlusCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AddLocationDialog from './AddLocationDialog';
import { isServiceDisplayable } from '@/lib/servicePhotos';
import { useLocationContext } from '@/components/LocationContext';
import { useLanguage } from '@/components/LanguageContext';

// Nom compare sans accents, majuscules ni espaces parasites ("Yaounde " = "Yaoundé")
const normName = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Retire les doublons de villes (meme nom a l'accent pres) en gardant la fiche officielle (rattachee a un departement)
function dedupeCities(list) {
    const best = new Map();
    for (const c of list) {
        const k = normName(c.name);
        const cur = best.get(k);
        if (!cur || (!cur.departement_code && c.departement_code)) best.set(k, c);
    }
    return list.filter(c => best.get(normName(c.name)) === c);
}

export default function LocationSelector({ className, onSearch, minimal }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const { selectedCountry: globalCountryCode, countries: globalCountries } = useLocationContext();

    const [countries, setCountries] = useState([]);
    const [regions, setRegions] = useState([]);
    const [cities, setCities] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);

    const [selectedCountry, setSelectedCountry] = useState("Cameroun");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");

    const [addDialog, setAddDialog] = useState({ open: false, level: 'ville' });

    const loadData = async () => {
        setLoading(true);
        try {
            if (globalCountries && globalCountries.length > 0) {
                 setCountries(globalCountries);
            } else {
                 const c = await Country.list();
                 setCountries(c.filter(i => i.status !== 'rejected').sort((a, b) => a.name.localeCompare(b.name)));
            }

            const r = await Region.list();
            setRegions(r.filter(i => i.status !== 'rejected'));

            const v = await Ville.list();
            setCities(v.filter(i => i.status !== 'rejected'));

        } catch (e) {
            console.error("Error loading location data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [globalCountries]);

    useEffect(() => {
        if (globalCountryCode) {
            const c = countries.find(c => c.code === globalCountryCode);
            if (c) {
                setSelectedCountry(c.name);
            }
        }
    }, [globalCountryCode, countries]);

    useEffect(() => {
        const fetchQuartiers = async () => {
            if (selectedCity) {
                const city = cities.find(c => c.name === selectedCity || c.code === selectedCity);
                if (city) {
                    let q = await Quartier.filter({ ville_code: city.code });
                    q = q.filter(i => i.status !== 'rejected');
                    setNeighborhoods(q.sort((a, b) => a.name.localeCompare(b.name)));
                }
            } else {
                setNeighborhoods([]);
            }
        };
        fetchQuartiers();
    }, [selectedCity, cities]);

    const availableRegions = selectedCountry
        ? regions.filter(r => r.country_code === countries.find(c => c.name === selectedCountry)?.code)
        : regions;

    const availableCities = selectedRegion
        ? cities.filter(c => {
            return true;
        })
        : cities;

    const [departments, setDepartments] = useState([]);
    useEffect(() => {
        Departement.list().then(setDepartments);
    }, []);

    const getFilteredCities = () => {
        if (!selectedRegion) return cities;
        const regionCode = regions.find(r => r.name === selectedRegion)?.code;
        if (!regionCode) return cities;

        const deptCodes = departments.filter(d => d.region_code === regionCode).map(d => d.code);
        return cities.filter(c => deptCodes.includes(c.departement_code));
    };

    // --- Filtrage : on ne propose que les lieux ou au moins un service est propose ---
    const { data: allServices } = useQuery({
        queryKey: ['marketplace-services'],
        queryFn: () => Service.list('-created_date', 1000),
        staleTime: 3 * 60 * 1000,
    });
    const { data: allQuartiers } = useQuery({
        queryKey: ['all-quartiers'],
        queryFn: () => Quartier.list(),
        staleTime: 10 * 60 * 1000,
    });

    const coverage = useMemo(() => {
        if (!Array.isArray(allServices) || allServices.length === 0 || departments.length === 0) return null;
        const norm = normName;
        const visible = allServices.filter(s => isServiceDisplayable(s));
        const regionSet = new Set(), deptSet = new Set(), villeSet = new Set(), quartierSet = new Set();
        const legacyCities = new Set(), legacyRegions = new Set();
        const quartierByCode = new Map((allQuartiers || []).map(q => [q.code, q]));
        const villesFromQuartiers = new Set();
        for (const s of visible) {
            const lvl = s.availability_level, code = s.availability_code;
            if (code) {
                if (lvl === 'region') regionSet.add(code);
                else if (lvl === 'departement') deptSet.add(code);
                else if (lvl === 'ville') villeSet.add(code);
                else if (lvl === 'quartier') {
                    quartierSet.add(code);
                    const q = quartierByCode.get(code);
                    if (q?.ville_code) villesFromQuartiers.add(q.ville_code);
                }
            }
            if (s.city) legacyCities.add(norm(s.city));
            if (s.region) legacyRegions.add(norm(s.region));
        }
        const regionOfDept = new Map(departments.map(d => [d.code, d.region_code]));
        // Couverture par un niveau superieur ou egal a la ville (ville, departement, region, ancien champ "city")
        const widerCity = (c) => villeSet.has(c.code) || deptSet.has(c.departement_code)
            || regionSet.has(regionOfDept.get(c.departement_code)) || legacyCities.has(norm(c.name));
        const cityCovered = (c) => widerCity(c) || villesFromQuartiers.has(c.code);
        const coveredRegionCodes = new Set(regionSet);
        for (const d of departments) if (deptSet.has(d.code)) coveredRegionCodes.add(d.region_code);
        for (const c of cities) if (cityCovered(c)) {
            const rc = regionOfDept.get(c.departement_code);
            if (rc) coveredRegionCodes.add(rc);
        }
        for (const r of regions) if (legacyRegions.has(norm(r.name))) coveredRegionCodes.add(r.code);
        return { cityCovered, widerCity, coveredRegionCodes, quartierSet };
    }, [allServices, allQuartiers, departments, cities, regions]);

    // Si rien n'est couvert (donnees de lieu absentes), on ne masque rien plutot que d'afficher des menus vides.
    const shownRegions = (() => {
        if (!coverage) return availableRegions;
        const list = availableRegions.filter(r => coverage.coveredRegionCodes.has(r.code) || r.name === selectedRegion);
        return list.length > 0 ? list : availableRegions;
    })();
    const baseCities = dedupeCities(getFilteredCities());
    const shownCities = (() => {
        if (!coverage) return baseCities;
        const list = baseCities.filter(c => coverage.cityCovered(c) || c.name === selectedCity);
        return list.length > 0 ? list : baseCities;
    })();
    const filteredCities = [...shownCities].sort((a, b) => a.name.localeCompare(b.name));
    const shownNeighborhoods = (() => {
        if (!coverage) return neighborhoods;
        const city = cities.find(c => c.name === selectedCity || c.code === selectedCity);
        const wider = city ? coverage.widerCity(city) : false;
        return neighborhoods.filter(q => wider || coverage.quartierSet.has(q.code) || q.name === selectedNeighborhood);
    })();

    const handleSearch = () => {
        let level = 'all';
        let code = '';
        let name = '';

        if (selectedNeighborhood) {
            level = 'quartier';
            const item = neighborhoods.find(n => n.name === selectedNeighborhood);
            code = item?.code;
            name = item?.name;
        } else if (selectedCity) {
            level = 'ville';
            const item = cities.find(c => c.name === selectedCity);
            code = item?.code;
            name = item?.name;
        } else if (selectedRegion) {
            level = 'region';
            const item = regions.find(r => r.name === selectedRegion);
            code = item?.code;
            name = item?.name;
        } else if (selectedCountry) {
            level = 'country';
            const item = countries.find(c => c.name === selectedCountry);
            code = item?.code;
            name = item?.name;
        }

        if (onSearch) {
            onSearch({ level, code, name });
        } else {
            const params = new URLSearchParams();
            if (level !== 'all') {
                params.append('location_level', level);
                params.append('location_code', code);
                params.append('location_name', name);
            }
            navigate(`${createPageUrl('Marketplace')}?${params.toString()}`);
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex flex-col md:flex-row gap-2">

                {!minimal && (
                    <div className="w-full md:w-[140px] bg-stone-100 border-0 shadow-sm h-12 rounded-md flex items-center px-3 text-sm text-stone-600 select-none">
                        Cameroun
                    </div>
                )}

                <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={!selectedCountry && regions.length > 0}>
                    <SelectTrigger className="w-full md:w-[140px] bg-white border-0 shadow-sm h-12">
                        <SelectValue placeholder={t('location.region')} />
                    </SelectTrigger>
                    <SelectContent>
                        {shownRegions.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="w-full md:w-[140px] bg-white border-0 shadow-sm h-12">
                        <SelectValue placeholder={t('location.city')} />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredCities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood} disabled={!selectedCity}>
                    <SelectTrigger className="w-full md:w-[160px] bg-white border-0 shadow-sm h-12">
                        <SelectValue placeholder={t('location.neighborhood')} />
                    </SelectTrigger>
                    <SelectContent>
                         {shownNeighborhoods.length === 0 ? (
                             <SelectItem value="none" disabled>{t('location.noNeighborhoodLoaded')}</SelectItem>
                         ) : (
                             shownNeighborhoods.map(q => <SelectItem key={q.id} value={q.name}>{q.name}</SelectItem>)
                         )}
                    </SelectContent>
                </Select>

                {!minimal && (
                    <Button
                        onClick={handleSearch}
                        className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white h-12 px-6 rounded-md md:rounded-l-none shadow-sm font-medium"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : t('location.exploreButton')}
                    </Button>
                )}
            </div>

            <div className="flex gap-4 text-xs text-rose-600 justify-end px-2">
                <button onClick={() => setAddDialog({open: true, level: 'ville'})} className="hover:underline flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" /> {t('location.addCity')}
                </button>
                <button onClick={() => setAddDialog({open: true, level: 'quartier'})} className="hover:underline flex items-center gap-1" disabled={!selectedCity}>
                    <PlusCircle className="w-3 h-3" /> {t('location.addNeighborhood')}
                </button>
            </div>

            <AddLocationDialog
                open={addDialog.open}
                onOpenChange={(val) => setAddDialog(prev => ({ ...prev, open: val }))}
                level={addDialog.level}
                parentContext={{
                    country: countries.find(c => c.name === selectedCountry)?.code,
                    region: regions.find(r => r.name === selectedRegion)?.code,
                    ville: cities.find(c => c.name === selectedCity)?.code
                }}
                onSuccess={() => {
                    loadData();
                    if (addDialog.level === 'quartier' && selectedCity) {
                        const city = cities.find(c => c.name === selectedCity);
                        if(city) Quartier.filter({ ville_code: city.code }).then(setNeighborhoods);
                    }
                }}
            />
        </div>
    );
}
