import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Zap, MapPin, CalendarCheck, Wallet } from "lucide-react";
import { format } from "date-fns";

export default function LeadPaywall({ 
  lead, 
  onUnlockClick, 
  onUpgradeClick,
  isProcessing 
}) {
  return (
    <Card className="border-l-4 border-l-amber-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
              Prospect Bloqué
            </Badge>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <Badge className="bg-rose-100 text-rose-800 border-0">
              {lead.event_type}
            </Badge>
            <Badge variant="outline" className="border-blue-200 text-blue-700">
              {lead.service_category}
            </Badge>
          </div>

          <h4 className="font-bold text-lg text-stone-900">
            {lead.event_type} - {lead.service_category}
          </h4>

          <div className="space-y-2 text-sm text-stone-600 opacity-75">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-stone-400" />
              <span className="blur-sm select-none">Douala, Akwa</span>
            </div>
            {lead.event_date && (
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-stone-400" />
                <span>{format(new Date(lead.event_date), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {lead.budget && (
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-stone-400" />
                <span className="font-medium text-green-600">{lead.budget}</span>
              </div>
            )}
          </div>

          {lead.description && (
            <div className="mt-3 text-sm text-stone-600 bg-stone-50 p-3 rounded-lg opacity-60">
              <p className="blur-sm select-none line-clamp-2">
                Informations de contact masquées. Débloquez ce prospect pour voir les détails complets.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-amber-200">
          <p className="text-sm font-medium text-stone-700 mb-4 text-center">
            🔒 Vous avez atteint votre limite gratuite de 10 prospects/mois
          </p>
          
          <div className="grid md:grid-cols-2 gap-3">
            <Button
              onClick={onUnlockClick}
              disabled={isProcessing}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Débloquer (+5) - 2.500 FCFA
            </Button>
            
            <Button
              onClick={onUpgradeClick}
              variant="outline"
              className="border-2 border-amber-500 text-amber-700 hover:bg-amber-50 font-semibold"
            >
              <Crown className="w-4 h-4 mr-2" />
              Passer Gold (Illimité)
            </Button>
          </div>

          <div className="mt-3 text-xs text-center text-stone-500">
            <p>Achat ponctuel : +5 prospects | Gold : prospects illimités à vie</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-xs text-stone-400">
            Posté {format(new Date(lead.created_date), 'dd/MM')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}