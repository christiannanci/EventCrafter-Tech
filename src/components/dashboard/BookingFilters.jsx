import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Search } from "lucide-react";
import { useLanguage } from '@/components/LanguageContext';

export default function BookingFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  showFilters,
  onToggleFilters 
}) {
  const { t } = useLanguage();

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Toggle and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder={t('vendor.filters.searchPlaceholder')}
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-9"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={onToggleFilters}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          {t('vendor.filters.filterBy')}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t('vendor.filters.filterBy')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <X className="w-4 h-4 mr-1" />
              {t('vendor.filters.clearFilters')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-stone-600 mb-2 block">
                {t('vendor.filters.status')}
              </label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(val) => handleFilterChange('status', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('vendor.filters.all')}</SelectItem>
                  <SelectItem value="pending">{t('vendor.status.pending')}</SelectItem>
                  <SelectItem value="negotiating">{t('vendor.status.negotiating')}</SelectItem>
                  <SelectItem value="offer_submitted">{t('vendor.status.offer_submitted')}</SelectItem>
                  <SelectItem value="contract_pending">{t('vendor.status.contract_pending')}</SelectItem>
                  <SelectItem value="awaiting_payment">{t('vendor.status.awaiting_payment')}</SelectItem>
                  <SelectItem value="confirmed">{t('vendor.status.confirmed')}</SelectItem>
                  <SelectItem value="in_progress">{t('vendor.status.in_progress')}</SelectItem>
                  <SelectItem value="delivered">{t('vendor.status.delivered')}</SelectItem>
                  <SelectItem value="warranty_period">{t('vendor.status.warranty_period')}</SelectItem>
                  <SelectItem value="completed">{t('vendor.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('vendor.status.cancelled')}</SelectItem>
                  <SelectItem value="disputed">{t('vendor.status.disputed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Sort */}
            <div>
              <label className="text-xs font-medium text-stone-600 mb-2 block">
                {t('vendor.filters.date')}
              </label>
              <Select 
                value={filters.dateSort || 'newest'} 
                onValueChange={(val) => handleFilterChange('dateSort', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('vendor.filters.newest')}</SelectItem>
                  <SelectItem value="oldest">{t('vendor.filters.oldest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Sort */}
            <div>
              <label className="text-xs font-medium text-stone-600 mb-2 block">
                {t('vendor.filters.amount')}
              </label>
              <Select 
                value={filters.amountSort || 'none'} 
                onValueChange={(val) => handleFilterChange('amountSort', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  <SelectItem value="highest">{t('vendor.filters.highestAmount')}</SelectItem>
                  <SelectItem value="lowest">{t('vendor.filters.lowestAmount')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}