import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MapPin, Activity } from "lucide-react";
import ServiceTypesConfig from "@/components/admin/ServiceTypesConfig";
import GeoConfig from "@/components/admin/GeoConfig";

export default function TechDashboard() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Maintenance & Configuration Technique</h2>
                <p className="text-stone-500 mt-1">Gestion des types de services, données géographiques et suivi système.</p>
            </div>

            <Tabs defaultValue="service_types">
                <TabsList className="bg-stone-100">
                    <TabsTrigger value="service_types" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <Settings className="w-4 h-4" /> Types de Services
                    </TabsTrigger>
                    <TabsTrigger value="geo" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <MapPin className="w-4 h-4" /> Données Géo
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2 data-[state=active]:bg-white">
                        <Activity className="w-4 h-4" /> Logs Système
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="service_types" className="mt-6">
                    <ServiceTypesConfig />
                </TabsContent>

                <TabsContent value="geo" className="mt-6">
                    <GeoConfig />
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                    <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-lg border border-dashed">
                        <Activity className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                        <p>Les logs de santé système et vérifications préventives apparaîtront ici.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}