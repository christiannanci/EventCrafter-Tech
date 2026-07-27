import React, { useState, useEffect } from 'react';
import { Country, Region, Ville, Quartier, Departement } from '@/api/entities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, PlusCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AddLocationDialog from './AddLocationDialog';
import { useLocationContext } from '@/components/LocationContext';

export default function LocationSelector({ className, onSearch, minimal }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Global Location Context
    const { selectedCountry: globalCountryCode, countries: globalCountries } = useLocationContext();

    // Data Lists
    const [countries, setCountries] = useState([]);
    const [regions, setRegions] = useState([]);
    const [cities, setCities] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]); // Only fetch when needed

    // Selected Values
    const [selectedCountry, setSelectedCountry] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");

    // Add Dialog State
    const [addDialog, setAddDialog] = useState({ open: false, level: 'ville' });

    // Load Initial Data (Countries)
    const loadData = async () => {
        setLoading(true);
        try {
            // Use global countries if available, otherwise fetch
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

    // Effect to sync with global country selection
    useEffect(() => {
        if (globalCountryCode) {
            // Find country name from code if we are storing name in selectedCountry state
            // OR change selectedCountry state to use code? 
            // Current LocationSelector uses NAME for selectedCountry state.
            // Global uses CODE.
            const c = countries.find(c => c.code === globalCountryCode);
            if (c) {
                setSelectedCountry(c.name);
            }
        }
    }, [globalCountryCode, countries]);

    // Fetch neighborhoods when city is selected
    useEffect(() => {
        const fetchQuartiers = async () => {
            if (selectedCity) {
                // Find city code
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

    // Derived lists based on selection
    const availableRegions = selectedCountry 
        ? regions.filter(r => r.country_code === countries.find(c => c.name === selectedCountry)?.code)
        : regions;

    const availableCities = selectedRegion
        ? cities.filter(c => {
            // City -> Departement -> Region
            // We need departements to link city to region. 
            // This suggests we need to fetch departments too if we want client-side filtering strictly.
            // OR we assume we can fetch cities by region from backend?
            // For now, let's just show all cities if no region selected, or filter if we can.
            // Since we didn't fetch departments, we can't easily filter cities by region client-side strictly 
            // without knowing the department->region mapping.
            // Let's fetch departments too.
            return true; 
        })
        : cities;

    // To properly filter cities by region, we need departments.
    const [departments, setDepartments] = useState([]);
    useEffect(() => {
        Departement.list().then(setDepartments);
    }, []);

    const getFilteredCities = () => {
        if (!selectedRegion) return cities;
        const regionCode = regions.find(r => r.name === selectedRegion)?.code;
        if (!regionCode) return cities;
        
        // Get dept codes for this region
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
            // Default behavior: navigate to marketplace
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
                
                {/* Hide Country Selector if minimal mode or if controlled globally (but keep logic running) */}
                {!minimal && (
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="w-full md:w-[140px] bg-white border-0 shadow-sm h-12">
                            <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}

                <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={!selectedCountry && regions.length > 0}>
                    <SelectTrigger className="w-full md:w-[140px] bg-white border-0 shadow-sm h-12">
                        <SelectValue placeholder="Region" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableRegions.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="w-full md:w-[140px] bg-white border-0 shadow-sm h-12">
                        <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredCities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood} disabled={!selectedCity}>
                    <SelectTrigger className="w-full md:w-[160px] bg-white border-0 shadow-sm h-12">
                        <SelectValue placeholder="Neighborhood" />
                    </SelectTrigger>
                    <SelectContent>
                         {neighborhoods.length === 0 ? (
                             <SelectItem value="none" disabled>No neighborhoods loaded</SelectItem>
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
                        {loading ? <Loader2 className="animate-spin" /> : "Explore"}
                    </Button>
                )}
            </div>

            <div className="flex gap-4 text-xs text-rose-600 justify-end px-2">
                <button onClick={() => setAddDialog({open: true, level: 'ville'})} className="hover:underline flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" /> Add City
                </button>
                <button onClick={() => setAddDialog({open: true, level: 'quartier'})} className="hover:underline flex items-center gap-1" disabled={!selectedCity}>
                    <PlusCircle className="w-3 h-3" /> Add Neighborhood
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
                    loadData(); // Reload lists
                    // Also reload neighborhoods if we added one
                    if (addDialog.level === 'quartier' && selectedCity) {
                        // Re-trigger effect?
                        const city = cities.find(c => c.name === selectedCity);
                        if(city) Quartier.filter({ ville_code: city.code }).then(setNeighborhoods);
                    }
                }}
            />
        </div>
    );
}

