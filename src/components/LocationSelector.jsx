import React, { useState, useEffect } from 'react';
import { Country, Region, Ville, Quartier, Departement } from '@/api/entities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, PlusCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AddLocationDialog from './AddLocationDialog';
import { useLocationContext } from '@/components/LocationContext';
import { useLanguage } from '@/components/LanguageContext';

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

    const filteredCities = getFilteredCities().sort((a, b) => a.name.localeCompare(b.name));

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
                        {availableRegions.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
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
                         {neighborhoods.length === 0 ? (
                             <SelectItem value="none" disabled>{t('location.noNeighborhoodLoaded')}</SelectItem>
                         ) : (
                             neighborhoods.map(q => <SelectItem key={q.id} value={q.name}>{q.name}</SelectItem>)
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
