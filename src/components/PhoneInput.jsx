import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Liste des pays les plus pertinents pour la plateforme (Afrique + international courant)
export const COUNTRY_DIAL_CODES = [
  { code: 'CM', name: 'Cameroun', dial: '+237' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'SN', name: 'Senegal', dial: '+221' },
  { code: 'CI', name: "Cote d'Ivoire", dial: '+225' },
  { code: 'GA', name: 'Gabon', dial: '+241' },
  { code: 'TD', name: 'Tchad', dial: '+235' },
  { code: 'CF', name: 'Centrafrique', dial: '+236' },
  { code: 'CG', name: 'Congo', dial: '+242' },
  { code: 'CD', name: 'RD Congo', dial: '+243' },
  { code: 'BJ', name: 'Benin', dial: '+229' },
  { code: 'TG', name: 'Togo', dial: '+228' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226' },
  { code: 'ML', name: 'Mali', dial: '+223' },
  { code: 'GN', name: 'Guinee', dial: '+224' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'BE', name: 'Belgique', dial: '+32' },
  { code: 'CH', name: 'Suisse', dial: '+41' },
  { code: 'US', name: 'Etats-Unis', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44' },
  { code: 'DE', name: 'Allemagne', dial: '+49' },
  { code: 'OTHER', name: 'Autre pays', dial: '' },
];

/**
 * Decoupe un numero complet stocke (ex. "+237612345678") en { dial, number }
 * pour pre-remplir le selecteur et le champ lors de l'edition d'un profil existant.
 */
export function splitPhoneValue(fullValue) {
  if (!fullValue) return { dial: '+237', number: '' };
  const match = COUNTRY_DIAL_CODES
    .filter(c => c.dial)
    .sort((a, b) => b.dial.length - a.dial.length)
    .find(c => fullValue.startsWith(c.dial));
  if (match) {
    return { dial: match.dial, number: fullValue.slice(match.dial.length).trim() };
  }
  return { dial: '+237', number: fullValue.replace(/^\+/, '') };
}

/**
 * Composant : selecteur de pays (code indicatif) + champ numero national.
 * onChange renvoie la valeur complete assemblee, ex. "+237 612345678"
 */
export default function PhoneInput({ value, onChange, required = false, placeholder = "6 12 34 56 78" }) {
  const initial = splitPhoneValue(value);
  const [dial, setDial] = useState(initial.dial);
  const [number, setNumber] = useState(initial.number);

  useEffect(() => {
    const combined = number ? `${dial} ${number}`.trim() : '';
    onChange(combined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial, number]);

  return (
    <div className="flex gap-2">
      <Select value={dial} onValueChange={setDial}>
        <SelectTrigger className="w-[130px] flex-shrink-0">
          <SelectValue placeholder="Pays" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_DIAL_CODES.map((c) => (
            <SelectItem key={c.code} value={c.dial || c.code}>
              {c.dial ? `${c.name} (${c.dial})` : c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={number}
        onChange={(e) => setNumber(e.target.value.replace(/[^0-9\s]/g, ''))}
        placeholder={placeholder}
        required={required}
        className="flex-1"
      />
    </div>
  );
}
