import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { createPageUrl } from './utils';
import { Link } from 'react-router-dom';

/**
 * Notification pour les prestataires gratuits quand un lead de haute valeur est disponible
 */
export default function HighValueLeadNotification({ lead, onDismiss, onUpgrade }) {
  const leadDetails = {
    event_type: lead.event_type === 'Wedding' ? 'Mariage' :
                lead.event_type === 'Gala' ? 'Gala' :
                lead.event_type === 'Corporate' ? 'Événement Corporate' : lead.event_type,
    guest_count: lead.guest_count,
    budget: lead.budget,
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 shadow-xl animate-in slide-in-from-top-5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Crown className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-stone-900">
                🔔 Gros contrat en vue !
              </h3>
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                Lead Premium VIP
              </Badge>
            </div>
            
            <p className="text-stone-700 mb-4">
              Un <strong>{leadDetails.event_type}</strong> de <strong>{leadDetails.guest_count} invités</strong> vient d'être publié. 
              Les membres Gold sont déjà sur le coup !
            </p>

            <div className="bg-white/60 backdrop-blur rounded-lg p-3 mb-4 border border-purple-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-stone-500">Budget estimé</p>
                  <p className="font-semibold text-purple-700">{leadDetails.budget}</p>
                </div>
                <div>
                  <p className="text-stone-500">Catégorie</p>
                  <p className="font-semibold text-purple-700">Haute Valeur</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex-1"
                onClick={onUpgrade}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Débloquer ce lead ($10)
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Link to={createPageUrl('VendorDashboard') + '?tab=membership'} className="flex-1">
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-purple-300 hover:bg-purple-50"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Passer Gold (leads illimités)
                </Button>
              </Link>
            </div>

            <button 
              onClick={onDismiss}
              className="text-sm text-stone-500 hover:text-stone-700 mt-3 underline"
            >
              Plus tard
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}