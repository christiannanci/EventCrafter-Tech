import React from 'react';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency, SUPPORTED_CURRENCIES } from '@/components/CurrencyContext';

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger className="w-[140px] bg-white border-stone-200">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-stone-500" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
          <SelectItem key={curr.code} value={curr.code}>
            <div className="flex items-center gap-2">
              <span>{curr.flag}</span>
              <span>{curr.code}</span>
              <span className="text-stone-500 text-xs">({curr.symbol})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}