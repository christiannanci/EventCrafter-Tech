import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import SEOHead, { StructuredData, generateOrganizationSchema } from "@/components/SEOHead";
import { createPageUrl } from '../utils';

export default function SEOCameroun() {
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({ services: 0, vendors: 0, cities: 0 });

  useEffect(() => {
    const loadData = async () => {
      const allServices = await base44.entities.Service.list('-created_date', 100);
      const vendors = await base44.entities.VendorProfile.list();
      const cities = [...new Set(allServices.map(s => s.city).filter(Boolean))];
      
      setServices(allServices.slice(0, 8));
      setStats({
        services: allServices.length,
        vendors: vendors.length,
        cities: cities.length
      });
    };
    loadData();
  }, []);

  const cities = [
    { name: "Douala", region: "Littoral", services: ["Traiteur", "DJ", "Photographe", "Décorateur"] },
    { name: "Yaoundé", region: "Centre", services: ["Wedding Planner", "Location Salle", "Sonorisation"] },
    { name: "Bafoussam", region: "Ouest", services: ["Musique Traditionnelle", "Traiteur Local", "Décoration"] },
    { name: "Garoua", region: "Nord", services: ["Organisation Corporate", "Traiteur", "Événements Culturels"] },
    { name: "Bamenda", region: "Nord-Ouest", services: ["Photographe", "Vidéaste", "DJ"] },
    { name: "Limbé", region: "Sud-Ouest", services: ["Événements Beach", "Traiteur", "Animation"] }
  ];

  const eventTypes = [
    { name: "Mariage Traditionnel", icon: "💍", desc: "Organisation complète de mariage camerounais avec respect des traditions" },
    { name: "Anniversaire", icon: "🎂", desc: "Fêtes d'anniversaire mémorables pour tous les âges" },
    { name: "Événements Corporate", icon: "💼", desc: "Séminaires, conférences et team building" },
    { name: "Dot & Introduction", icon: "🎊", desc: "Cérémonies traditionnelles avec protocoles culturels" },
    { name: "Baby Shower", icon: "👶", desc: "Célébration de l'arrivée de bébé" },
    { name: "Funérailles", icon: "🕊️", desc: "Organisation respectueuse selon traditions locales" }
  ];

  const culturalZones = [
    "Aire Sawa (Douala, Littoral)",
    "Aire Grassfields (Bafoussam, Ouest)",
    "Aire Fang-Béti (Yaoundé, Centre-Sud)",
    "Grand Nord (Garoua, Maroua)",
    "Zone Anglophone (Bamenda, Buea)"
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <SEOHead 
        title="EventCrafter Cameroun - Organisation d'Événements à Douala, Yaoundé | Prestataires Mariages & Fêtes"
        description="🎉 Trouvez les meilleurs prestataires d'événements au Cameroun. Organisation de mariages traditionnels, anniversaires, corporate à Douala, Yaoundé, Bafoussam. 500+ prestataires vérifiés. Devis gratuit en 24h."
        keywords="organisation mariage Cameroun, prestataire événement Douala, traiteur mariage Yaoundé, photographe mariage Bafoussam, DJ événement Cameroun, wedding planner Douala, décoration mariage traditionnel, dot mariage camerounais, organisateur anniversaire Yaoundé, location salle réception Douala, sonorisation événement Cameroun, vidéaste mariage, fleuriste Douala, traiteur buffet Yaoundé, animation événement enfant, corporate event Cameroun"
        url="https://eventcrafter.cm"
      />
      
      <StructuredData data={generateOrganizationSchema()} />

      {/* Hero Section - SEO Optimized */}
      <section className="bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Organisation d'Événements au Cameroun
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-white/90">
              Trouvez les meilleurs prestataires pour votre mariage, anniversaire, ou événement corporate à Douala, Yaoundé, Bafoussam et partout au Cameroun
            </p>
            <p className="text-lg mb-8 text-white/80">
              {stats.vendors}+ prestataires vérifiés | {stats.cities}+ villes | Devis gratuit en 24h
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-rose-600 hover:bg-stone-100 font-bold text-lg px-8">
                <a href={createPageUrl('Marketplace')}>
                  <Search className="w-5 h-5 mr-2" />
                  Trouver un Prestataire
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-bold text-lg px-8">
                <a href={createPageUrl('ProfileSelection')}>
                  Devenir Prestataire
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services by City - Local SEO */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Services d'Organisation d'Événements par Ville
          </h2>
          <p className="text-center text-stone-600 mb-12 max-w-2xl mx-auto">
            Des prestataires locaux dans toutes les grandes villes du Cameroun pour organiser vos événements
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Card key={city.name} className="hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="w-6 h-6 text-rose-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-bold">{city.name}</h3>
                      <p className="text-sm text-stone-500">Région {city.region}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {city.services.map((service) => (
                      <div key={service} className="flex items-center gap-2 text-sm text-stone-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>{service} à {city.name}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full mt-4 bg-rose-600 hover:bg-rose-700">
                    <a href={`${createPageUrl('Marketplace')}?location_name=${city.name}`}>
                      Voir les prestataires
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Event Types - SEO Keywords */}
      <section className="py-16 bg-gradient-to-b from-stone-50 to-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Tous Types d'Événements au Cameroun
          </h2>
          <p className="text-center text-stone-600 mb-12 max-w-2xl mx-auto">
            Organisation professionnelle pour mariages traditionnels, anniversaires, événements corporate et cérémonies culturelles
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventTypes.map((event) => (
              <Card key={event.name} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-4">{event.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                  <p className="text-stone-600 text-sm mb-4">{event.desc}</p>
                  <Button asChild variant="outline" className="w-full">
                    <a href={createPageUrl('Marketplace')}>Explorer</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cultural Compatibility - Unique Cameroon Feature */}
      <section className="py-16 bg-amber-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Respect des Traditions et Cultures Camerounaises
          </h2>
          <p className="text-center text-stone-700 mb-8 max-w-2xl mx-auto">
            Nos prestataires connaissent et respectent les protocoles traditionnels de chaque zone culturelle
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {culturalZones.map((zone) => (
              <div key={zone} className="bg-white rounded-lg p-4 flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span className="font-medium">{zone}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700">
              <a href={createPageUrl('Marketplace')}>
                Trouver un Prestataire Culturellement Adapté
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Pourquoi Choisir EventCrafter au Cameroun ?
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="font-bold mb-2">Prestataires Vérifiés</h3>
              <p className="text-sm text-stone-600">Tous nos vendeurs sont vérifiés et évalués par la communauté</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold mb-2">Couverture Nationale</h3>
              <p className="text-sm text-stone-600">Des prestataires dans toutes les régions du Cameroun</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold mb-2">Respect des Traditions</h3>
              <p className="text-sm text-stone-600">Protocoles culturels et traditionnels respectés</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold mb-2">Paiement Sécurisé</h3>
              <p className="text-sm text-stone-600">Transactions sécurisées avec Mobile Money et cartes bancaires</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-rose-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à Organiser Votre Événement au Cameroun ?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Trouvez le prestataire parfait en quelques clics
          </p>
          <Button asChild size="lg" className="bg-white text-rose-600 hover:bg-stone-100 font-bold text-lg px-8">
            <a href={createPageUrl('Marketplace')}>
              Commencer Maintenant
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer - Rich SEO Content */}
      <footer className="bg-stone-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Villes Principales</h3>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><a href={createPageUrl('Marketplace') + '?location_name=Douala'} className="hover:text-white">Prestataires Douala</a></li>
                <li><a href={createPageUrl('Marketplace') + '?location_name=Yaoundé'} className="hover:text-white">Prestataires Yaoundé</a></li>
                <li><a href={createPageUrl('Marketplace') + '?location_name=Bafoussam'} className="hover:text-white">Prestataires Bafoussam</a></li>
                <li><a href={createPageUrl('Marketplace') + '?location_name=Garoua'} className="hover:text-white">Prestataires Garoua</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><a href={createPageUrl('Marketplace') + '?category=Event Planner'} className="hover:text-white">Wedding Planner</a></li>
                <li><a href={createPageUrl('Marketplace') + '?category=Caterer'} className="hover:text-white">Traiteur</a></li>
                <li><a href={createPageUrl('Marketplace') + '?category=Photographer'} className="hover:text-white">Photographe</a></li>
                <li><a href={createPageUrl('Marketplace') + '?category=DJ'} className="hover:text-white">DJ & Sonorisation</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Événements</h3>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><a href={createPageUrl('Marketplace')} className="hover:text-white">Mariage Traditionnel</a></li>
                <li><a href={createPageUrl('Marketplace')} className="hover:text-white">Anniversaire</a></li>
                <li><a href={createPageUrl('Marketplace')} className="hover:text-white">Corporate</a></li>
                <li><a href={createPageUrl('Marketplace')} className="hover:text-white">Dot & Introduction</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-stone-400">
                <li>📞 +237 670 93 43 78</li>
                <li>📞 +237 690 17 31 93</li>
                <li>📧 contact@eventcrafter.cm</li>
                <li>📍 Douala, Cameroun</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-8 text-center text-sm text-stone-500">
            <p>© 2026 EventCrafter Cameroun - Plateforme #1 d'organisation d'événements</p>
            <p className="mt-2">Organisation de mariages, anniversaires, événements corporate à Douala, Yaoundé, Bafoussam et partout au Cameroun</p>
          </div>
        </div>
      </footer>
    </div>
  );
}