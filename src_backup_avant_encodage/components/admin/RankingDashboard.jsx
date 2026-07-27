import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Sparkles, Award, Star } from "lucide-react";
import { applyRankingSystem, formatRankingDataForAdmin, getTopRatedServices } from "@/components/RankingEngine";
import { Input } from "@/components/ui/input";

export default function RankingDashboard() {
  const [services, setServices] = useState([]);
  const [rankedData, setRankedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [topRated, setTopRated] = useState({ gold: [], premium: [], standard: [] });

  useEffect(() => {
    loadRankingData();
  }, [searchQuery]);

  const loadRankingData = async () => {
    setLoading(true);
    try {
      const allServices = await base44.entities.Service.list('-created_date', 500);
      const ranked = await applyRankingSystem(allServices, searchQuery);
      const formatted = formatRankingDataForAdmin(ranked);
      const topServices = getTopRatedServices(ranked);
      
      setServices(ranked);
      setRankedData(formatted);
      setTopRated(topServices);
    } catch (e) {
      console.error('Erreur chargement ranking:', e);
    } finally {
      setLoading(false);
    }
  };

  const PlanBadge = ({ plan }) => {
    const styles = {
      gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      premium: 'bg-gradient-to-r from-purple-500 to-purple-700 text-white',
      free: 'bg-stone-200 text-stone-700'
    };
    
    const icons = {
      gold: <Award className="w-3 h-3 fill-white" />,
      premium: '⭐',
      free: ''
    };
    
    return (
      <Badge className={`${styles[plan]} flex items-center gap-1`}>
        {icons[plan]} {plan.toUpperCase()}
      </Badge>
    );
  };

  const RankingTable = ({ data, title }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-stone-100 border-b-2 border-stone-300">
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">#</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Service</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Plan</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Note</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Avis</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Score Réputation</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Score Total</th>
              <th className="p-3 text-left text-xs font-bold text-stone-700 uppercase">Badges</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const isTop3 = index < 3;
              const positionColors = ['bg-yellow-50', 'bg-stone-50', 'bg-orange-50'];
              
              return (
                <tr 
                  key={item.service_id} 
                  className={`border-b hover:bg-stone-50 ${isTop3 ? positionColors[index] : ''}`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isTop3 ? 'text-lg' : ''}`}>
                        {item.position}
                      </span>
                      {index === 0 && <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                      {index === 1 && <Trophy className="w-4 h-4 text-stone-400 fill-stone-400" />}
                      {index === 2 && <Trophy className="w-4 h-4 text-orange-600 fill-orange-600" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="max-w-xs">
                      <p className="font-medium text-stone-900 line-clamp-1">{item.service_title}</p>
                      <p className="text-xs text-stone-500">{item.service_id.substring(0, 8)}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <PlanBadge plan={item.vendor_plan} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{item.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{item.review_count}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge className="bg-blue-100 text-blue-800">
                      {item.reputation_score.toFixed(2)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className="bg-green-100 text-green-800 font-bold">
                      {Math.round(item.total_ranking_score).toLocaleString()}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {item.has_new_boost && (
                        <Badge className="bg-pink-100 text-pink-700 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" /> Nouveau
                        </Badge>
                      )}
                      {item.is_verified && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">✓</Badge>
                      )}
                      {item.is_featured && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">★</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
        <p className="text-stone-600">Chargement du classement...</p>
      </div>
    );
  }

  const goldServices = rankedData.filter(s => s.vendor_plan === 'gold');
  const premiumServices = rankedData.filter(s => s.vendor_plan === 'premium');
  const standardServices = rankedData.filter(s => !['gold', 'premium'].includes(s.vendor_plan));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">📊 Système de Classement Intelligent</h2>
        <p className="text-stone-600">
          Hiérarchie: Statut → Performance (Score Réputation) → Pertinence
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase">Total Services</p>
                <p className="text-2xl font-bold text-stone-900">{rankedData.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase">Gold</p>
                <p className="text-2xl font-bold text-yellow-600">{goldServices.length}</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase">Premium</p>
                <p className="text-2xl font-bold text-purple-600">{premiumServices.length}</p>
              </div>
              <Star className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 uppercase">Standard</p>
                <p className="text-2xl font-bold text-stone-600">{standardServices.length}</p>
              </div>
              <Trophy className="w-8 h-8 text-stone-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formule de calcul */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">📐 Formule de Réputation (Pondérée)</h3>
          <p className="text-sm text-blue-800">
            <code className="bg-white px-2 py-1 rounded block mb-2">
              Score = ((Note Moyenne / 5) × 0.7) + ((Nombre d'Avis / 5) × 0.3)
            </code>
          </p>
          <p className="text-xs text-blue-700 mt-2">
            • <strong>Pondération par 5</strong>: Les notes et avis sont divisés par 5 pour normaliser le score<br/>
            • Boost Nouveau: +20 000 points pendant 30 jours pour Gold/Premium<br/>
            • Hiérarchie: Gold (100k) → Premium (50k) → Standard (1k)<br/>
            • Services sans avis: affichage gris par défaut
          </p>
        </CardContent>
      </Card>

      {/* Filtrage par recherche */}
      <div>
        <Input
          placeholder="🔍 Simuler une recherche pour voir le classement..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Onglets par statut */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous ({rankedData.length})</TabsTrigger>
          <TabsTrigger value="gold">Gold ({goldServices.length})</TabsTrigger>
          <TabsTrigger value="premium">Premium ({premiumServices.length})</TabsTrigger>
          <TabsTrigger value="standard">Standard ({standardServices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <RankingTable data={rankedData} title="🏆 Classement Global" />
        </TabsContent>

        <TabsContent value="gold" className="mt-6">
          <RankingTable data={goldServices} title="👑 Classement Gold" />
        </TabsContent>

        <TabsContent value="premium" className="mt-6">
          <RankingTable data={premiumServices} title="⭐ Classement Premium" />
        </TabsContent>

        <TabsContent value="standard" className="mt-6">
          <RankingTable data={standardServices} title="📋 Classement Standard" />
        </TabsContent>
      </Tabs>
    </div>
  );
}