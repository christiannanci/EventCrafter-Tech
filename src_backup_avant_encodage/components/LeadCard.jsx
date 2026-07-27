import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, User } from "lucide-react";
import { format } from "date-fns";

export default function LeadCard({ lead }) {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Badge className="bg-amber-600 text-white px-3 py-1">
            {lead.event_type}
          </Badge>
          <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
            {lead.status === 'open' ? 'Open' : 'Closed'}
          </Badge>
        </div>

        <h3 className="font-semibold text-lg text-stone-900 mb-3 line-clamp-2">
          Looking for: {lead.service_category}
        </h3>

        <p className="text-sm text-stone-600 mb-4 line-clamp-3">
          {lead.description}
        </p>

        <div className="space-y-2 text-sm text-stone-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span className="font-medium">Lieu de la prestation :</span>
            <span>{lead.location}</span>
          </div>

          {lead.event_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="font-medium">Date :</span>
              <span>{format(new Date(lead.event_date), 'dd/MM/yyyy')}</span>
            </div>
          )}

          {lead.budget && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span className="font-medium">Budget :</span>
              <span>{lead.budget}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-600" />
            <span className="text-xs">Postée par {lead.client_name}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-amber-50 border-t border-amber-100 p-4">
        <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
          Submit Quote
        </Button>
      </CardFooter>
    </Card>
  );
}