import React, { useMemo, useState } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  AsYouType,
} from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import { ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

const DEFAULT_DIAL = '237'; // Cameroun

// Pays mis en avant en haut de la liste (marché principal de la plateforme)
const PRIORITY_COUNTRIES = ['CM', 'GA', 'TD', 'CF', 'CG', 'GQ', 'NG', 'CI', 'SN', 'FR', 'BE', 'CA', 'US'];

// Noms des pays en français, fournis par le navigateur
let regionNames = null;
try {
  regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
} catch {
  regionNames = null;
}

function countryName(code) {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
}

// Drapeau emoji à partir du code pays ISO (ex. "CM" -> 🇨🇲)
function flagEmoji(code) {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const ALL_COUNTRIES = getCountries()
  .map((code) => ({
    code,
    name: countryName(code),
    dial: getCountryCallingCode(code),
    flag: flagEmoji(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

const PRIORITY_LIST = PRIORITY_COUNTRIES
  .map((code) => ALL_COUNTRIES.find((c) => c.code === code))
  .filter(Boolean);
const OTHER_LIST = ALL_COUNTRIES.filter((c) => !PRIORITY_COUNTRIES.includes(c.code));

/**
 * Trouve le pays correspondant à un indicatif saisi (ex. "237" -> "CM").
 * Pour les indicatifs partagés (+1, +7, +44...), utilise le numéro pour affiner,
 * sinon le pays principal de cet indicatif (ex. +1 -> États-Unis).
 */
function countryFromDial(dial, nationalNumber = '') {
  if (!dial) return null;
  const digits = nationalNumber.replace(/\D/g, '');
  if (digits) {
    const parsed = parsePhoneNumberFromString(`+${dial}${digits}`);
    if (parsed?.country) return parsed.country;
  }
  const candidates = metadata.country_calling_codes?.[dial];
  return candidates && candidates.length ? candidates[0] : null;
}

/**
 * Liste complète des pays du monde : [{ code, name, dial }]
 * (conservée pour compatibilité avec l'ancien export ; dial au format "+237")
 */
export const COUNTRY_DIAL_CODES = ALL_COUNTRIES.map(({ code, name, dial }) => ({ code, name, dial: `+${dial}` }));

/**
 * Indique si un numéro complet (ex. "+237 6 70 00 00 00") est valide
 * pour le pays correspondant à son indicatif.
 */
export function isValidPhone(fullValue) {
  if (!fullValue) return false;
  try {
    return isValidPhoneNumber(fullValue);
  } catch {
    return false;
  }
}

/**
 * Convertit un numéro saisi en format international standard (E.164),
 * ex. "+237 6 70 00 00 00" -> "+237670000000". Renvoie la valeur nettoyée si non analysable.
 */
export function toE164(fullValue) {
  if (!fullValue) return '';
  const parsed = parsePhoneNumberFromString(fullValue);
  return parsed ? parsed.number : fullValue.replace(/[^\d+]/g, '');
}

/**
 * Découpe un numéro complet stocké (ex. "+237612345678") en { dial, number }
 * pour pré-remplir les champs lors de l'édition d'un profil existant.
 */
export function splitPhoneValue(fullValue) {
  if (!fullValue) return { dial: DEFAULT_DIAL, number: '' };
  const trimmed = fullValue.trim();
  const parsed = parsePhoneNumberFromString(trimmed.startsWith('+') ? trimmed : `+${trimmed}`);
  if (parsed) {
    return { dial: parsed.countryCallingCode, number: parsed.formatNational() };
  }
  // Anciens numéros camerounais stockés sans indicatif (ex. "670000000")
  return { dial: DEFAULT_DIAL, number: trimmed.replace(/^\+/, '') };
}

/**
 * Champ téléphone international :
 *  - l'utilisateur SAISIT l'indicatif de son pays (ex. +237, +33, +1) — le drapeau s'affiche automatiquement ;
 *  - ou le choisit dans la liste de tous les pays (bouton ▾, avec recherche) ;
 *  - puis saisit son numéro.
 * onChange renvoie le numéro complet, ex. "+237 6 70 00 00 00".
 */
export default function PhoneInput({
  value,
  onChange,
  required = false,
  placeholder,
  id,
  className,
}) {
  const initial = useMemo(() => splitPhoneValue(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [dial, setDial] = useState(initial.dial);
  const [number, setNumber] = useState(initial.number);
  const [open, setOpen] = useState(false);

  const countryCode = countryFromDial(dial, number);
  const country = countryCode ? ALL_COUNTRIES.find((c) => c.code === countryCode) : null;
  const dialIsKnown = !!metadata.country_calling_codes?.[dial];

  const emit = (nextDial, nextNumber) => {
    const digits = nextNumber.replace(/\D/g, '');
    if (!digits || !nextDial) {
      onChange?.('');
      return;
    }
    onChange?.(`+${nextDial} ${nextNumber.trim()}`);
  };

  const formatNumber = (rawNumber, forDial) => {
    const code = countryFromDial(forDial, rawNumber);
    if (!code || !rawNumber.replace(/\D/g, '')) return rawNumber;
    return new AsYouType(code).input(rawNumber);
  };

  // Saisie manuelle de l'indicatif : chiffres uniquement, 1 à 4 chiffres
  const handleDialChange = (e) => {
    const nextDial = e.target.value.replace(/\D/g, '').slice(0, 4);
    setDial(nextDial);
    emit(nextDial, number);
  };

  const handleNumberChange = (e) => {
    const raw = e.target.value;

    // Si l'utilisateur colle ou tape un numéro international complet (+33 6...), on le découpe
    if (raw.trim().startsWith('+')) {
      const parsed = parsePhoneNumberFromString(raw.trim());
      if (parsed) {
        const nextDial = parsed.countryCallingCode;
        const nextNumber = parsed.formatNational();
        setDial(nextDial);
        setNumber(nextNumber);
        emit(nextDial, nextNumber);
        return;
      }
    }

    const cleaned = raw.replace(/[^\d\s-]/g, '');
    const formatted = formatNumber(cleaned, dial);
    setNumber(formatted);
    emit(dial, formatted);
  };

  const handleCountrySelect = (c) => {
    setDial(c.dial);
    setOpen(false);
    emit(c.dial, number);
  };

  const renderItem = (c) => (
    <CommandItem
      key={c.code}
      value={`${c.name} +${c.dial} ${c.code}`}
      onSelect={() => handleCountrySelect(c)}
    >
      <Check className={cn('mr-2 h-4 w-4', countryCode === c.code ? 'opacity-100' : 'opacity-0')} />
      <span className="mr-2">{c.flag}</span>
      <span className="flex-1 truncate">{c.name}</span>
      <span className="ml-2 text-muted-foreground">+{c.dial}</span>
    </CommandItem>
  );

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-2">
        {/* Indicatif du pays : saisie libre + liste déroulante */}
        <div
          className={cn(
            'flex h-10 w-[130px] flex-shrink-0 items-center rounded-md border border-input bg-background pl-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            dial && !dialIsKnown && 'border-red-400'
          )}
        >
          <span className="mr-1 w-5 text-center" title={country?.name || 'Indicatif inconnu'}>
            {country ? country.flag : '🌐'}
          </span>
          <span className="text-muted-foreground">+</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="tel-country-code"
            aria-label="Indicatif du pays"
            value={dial}
            onChange={handleDialChange}
            placeholder="237"
            required={required}
            className="w-full min-w-0 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Choisir un pays dans la liste"
                className="flex h-full items-center px-1.5 text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher un pays ou un indicatif..." />
                <CommandList className="max-h-[280px]">
                  <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
                  <CommandGroup heading="Pays fréquents">{PRIORITY_LIST.map(renderItem)}</CommandGroup>
                  <CommandGroup heading="Tous les pays">{OTHER_LIST.map(renderItem)}</CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Numéro de téléphone */}
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={handleNumberChange}
          placeholder={placeholder || 'Numéro de téléphone'}
          required={required}
          className="flex-1"
        />
      </div>
      <p className={cn('text-xs', dial && !dialIsKnown ? 'text-red-500' : 'text-muted-foreground')}>
        {dial && !dialIsKnown
          ? `L'indicatif +${dial} n'existe pas. Vérifiez-le ou choisissez votre pays dans la liste.`
          : country
            ? `${country.name} (+${dial})`
            : 'Saisissez l’indicatif de votre pays (ex. 237) ou choisissez-le dans la liste.'}
      </p>
    </div>
  );
}