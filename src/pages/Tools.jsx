import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Users, Calendar, HeartHandshake } from "lucide-react";
import { useLanguage } from '@/components/LanguageContext';

export default function Tools() {
  const { t } = useLanguage();

  const tools = [
    {
      title: t('tools.budgetTitle'),
      description: t('tools.budgetDesc'),
      icon: Calculator,
      color: "bg-green-100 text-green-600",
      link: "BudgetTool",
      cta: t('tools.budgetCta')
    },
    {
      title: t('tools.guestsTitle'),
      description: t('tools.guestsDesc'),
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      link: "GuestManager",
      cta: t('tools.guestsCta')
    },
    {
      title: t('tools.inspirationTitle'),
      description: t('tools.inspirationDesc'),
      icon: HeartHandshake,
      color: "bg-rose-100 text-rose-600",
      link: "Inspiration",
      cta: t('tools.inspirationCta')
    }
  ];

  const upcomingTools = [t('tools.seatingPlan'), t('tools.vendorChecklist'), t('tools.scheduleCreator')];

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-bold text-stone-900 mb-4">{t('tools.pageTitle')}</h1>
          <p className="text-stone-500">{t('tools.pageSubtitle')}</p>
        </div>

        <div className="max-w-3xl mx-auto mb-12 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">{t('tools.underConstructionTitle')}</h2>
          <p className="text-stone-600 text-lg mb-4">
            {t('tools.underConstructionDesc')}
          </p>
          <p className="text-stone-500">
            {t('tools.stayTunedDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto opacity-50 pointer-events-none">
          {tools.map((tool) => (
            <Card key={tool.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl mb-2">{tool.title}</CardTitle>
                <CardDescription className="text-stone-500 leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled className="w-full bg-white border border-stone-200 text-stone-700">
                  {t('tools.comingSoon')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('tools.moreToolsComing')}</h3>
          <div className="flex justify-center gap-4 flex-wrap">
            {upcomingTools.map(item => (
              <span key={item} className="px-4 py-2 bg-stone-100 text-stone-400 rounded-full text-sm font-medium">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
