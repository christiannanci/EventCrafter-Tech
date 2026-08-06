import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Package, TrendingUp, Sparkles } from "lucide-react";
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { useCurrency } from '@/components/CurrencyContext';
import WalletRechargeDialog from '@/components/dashboard/WalletRechargeDialog';
import { useLanguage } from '@/components/LanguageContext';

const CREDIT_PACKS = [
  {
    id: 'pack_5',
    credits: 5,
    price: 250,
    pricePerLead: 50,
    badge: 'Starter',
    color: 'from-blue-500 to-cyan-500',
    popular: false
  },
  {
    id: 'pack_10',
    credits: 10,
    price: 400,
    pricePerLead: 40,
    badge: 'Popular',
    color: 'from-purple-500 to-pink-500',
    popular: true,
    savings: 100
  },
  {
    id: 'pack_25',
    credits: 25,
    price: 1000,
    pricePerLead: 40,
    badge: 'Pro',
    color: 'from-amber-500 to-orange-500',
    popular: false,
    savings: 250
  }
];

export default function LeadCreditPacks({ vendorProfile, currentUser, onUpdate }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currency, convertPrice, formatPrice } = useCurrency();
  const [selectedPack, setSelectedPack] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!vendorProfile) {
    return null;
  }

  const handlePurchasePack = async (pack) => {
    setProcessing(true);
    try {
      if ((vendorProfile.account_balance || 0) < pack.price) {
        toast({
          title: t('vendor.insufficientBalanceTitle'),
          description: `${t('vendor.insufficientBalanceDescPrefix')} ${formatPrice(pack.price)}. ${t('vendor.topUpWallet')}`,
          variant: "destructive"
        });
        return;
      }

      await base44.entities.VendorProfile.update(vendorProfile.id, {
        account_balance: (vendorProfile.account_balance || 0) - pack.price,
        reward_credits: (vendorProfile.reward_credits || 0) + pack.credits
      });

      await base44.entities.Transaction.create({
        user_id: vendorProfile.user_id,
        amount: -pack.price,
        type: 'ad_fee',
        status: 'completed',
        description: `${t('vendor.packLabel')} ${pack.credits} ${t('vendor.creditsLeadsLabel')} - ${pack.badge}`
      });

      toast({
        title: t('vendor.packPurchasedTitle'),
        description: `+${pack.credits} ${t('vendor.creditsAdded')}. ${t('vendor.totalLabel')}: ${(vendorProfile.reward_credits || 0) + pack.credits} ${t('vendor.creditsUnit')}`
      });

      setDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Pack purchase error:', error);
      toast({
        title: t('vendor.genericError'),
        description: t('vendor.packPurchaseError'),
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          {t('vendor.leadCreditPacksTitle')}
        </CardTitle>
        <p className="text-sm text-stone-500">
          {t('vendor.leadCreditPacksSubtitle')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack) => (
            <div 
              key={pack.id}
              className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                pack.popular ? 'border-purple-400 bg-purple-50' : 'border-stone-200 bg-white'
              }`}
            >
              {pack.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                  {t('vendor.popularBadge')}
                </Badge>
              )}
              <div className={`bg-gradient-to-r ${pack.color} text-white rounded-lg p-3 mb-3`}>
                <div className="text-3xl font-bold mb-1">{pack.credits}</div>
                <div className="text-sm opacity-90">{t('vendor.creditsLeadsLabel')}</div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-bold text-stone-900">{formatPrice(pack.price)}</span>
                </div>
                <div className="text-xs text-center text-stone-500">
                  {formatPrice(pack.pricePerLead)} {t('vendor.perLead')}
                </div>
                {pack.savings && (
                  <Badge variant="outline" className="w-full justify-center border-green-500 text-green-700">
                    {t('vendor.saveLabel')} {formatPrice(pack.savings)}
                  </Badge>
                )}
              </div>
              <Button 
                onClick={() => handlePurchasePack(pack)}
                disabled={processing}
                className={`w-full ${pack.popular ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              >
                <Zap className="w-4 h-4 mr-2" />
                {t('vendor.buyButton')}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-stone-900 mb-1">{t('vendor.creditsVsPerUnit')}</h4>
              <p className="text-sm text-stone-600">
                {t('vendor.withPacksYouPay')} <strong>{formatPrice(40)}-{formatPrice(50)} {t('vendor.perLead')}</strong>. 
                {t('vendor.idealIfMultipleRequests')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between p-3 bg-stone-50 rounded-lg">
          <div>
            <span className="text-sm text-stone-600">{t('vendor.yourCurrentCredits')}:</span>
            <span className="ml-2 text-lg font-bold text-purple-600">
              {vendorProfile.reward_credits || 0} {t('vendor.creditsUnit')}
            </span>
          </div>
          <div>
            <span className="text-sm text-stone-600">{t('vendor.walletBalanceShort')}:</span>
            <span className="ml-2 text-lg font-bold text-green-600">
              {formatPrice(vendorProfile.account_balance || 0)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <WalletRechargeDialog
            vendorProfile={vendorProfile}
            currentUser={currentUser}
            onSuccess={onUpdate}
          />
        </div>
      </CardContent>
    </Card>
  );
}
