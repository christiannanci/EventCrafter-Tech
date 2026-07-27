import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { calculateLeadCategory, getLeadPrice } from '@/components/LeadPricingCalculator';
import { Sparkles, Users, DollarSign, Calendar } from 'lucide-react';

export default function LeadQualificationForm({ isOpen, onClose, onSubmit, serviceInfo }) {
  const [formData, setFormData] = useState({
    event_type: '',
    budget_amount: '',
    guest_count: '',
    service_category: serviceInfo?.category || 'All',
    location: '',
    event_date: '',
    description: '',
  });

  const [calculatedCategory, setCalculatedCategory] = useState(null);
  const [estimatedPrice, setEstimatedPrice] = useState(null);

  const eventTypes = [
    { value: 'Birthday', label: 'Anniversaire' },
    { value: 'Baptism', label: 'Baptême' },
    { value: 'Wedding', label: 'Mariage Coutumier' },
    { value: 'Funeral', label: 'Deuil' },
    { value: 'Gala', label: 'Gala' },
    { value: 'Dowry', label: 'Dot' },
    { value: 'Corporate', label: 'Événement d\'Entreprise' },
    { value: 'Conference', label: 'Conférence' },
    { value: 'Religious', label: 'Religieux' },
    { value: 'Other', label: 'Autre' },
  ];

  const budgetRanges = [
    { value: '100000', label: '< 100,000 FCFA' },
    { value: '250000', label: '100,000 - 300,000 FCFA' },
    { value: '500000', label: '300,000 - 800,000 FCFA' },
    { value: '1000000', label: '800,000 - 1,500,000 FCFA' },
    { value: '2000000', label: '1,500,000 - 3,000,000 FCFA' },
    { value: '5000000', label: '> 3,000,000 FCFA' },
  ];

  const guestCounts = [
    { value: '< 50', label: 'Moins de 50 invités' },
    { value: '50-200', label: '50 à 200 invités' },
    { value: '200+', label: 'Plus de 200 invités' },
  ];

  React.useEffect(() => {
    if (formData.event_type && formData.budget_amount && formData.guest_count) {
      const category = calculateLeadCategory(
        parseInt(formData.budget_amount),
        formData.guest_count,
        formData.event_type
      );
      setCalculatedCategory(category);
      
      getLeadPrice(category).then(price => {
        setEstimatedPrice(price);
      });
    }
  }, [formData.event_type, formData.budget_amount, formData.guest_count]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const leadData = {
      ...formData,
      budget_category: calculatedCategory,
      budget_amount: parseInt(formData.budget_amount),
      budget: `${parseInt(formData.budget_amount).toLocaleString()} FCFA`,
    };
    
    onSubmit(leadData);
  };

  const getCategoryInfo = () => {
    if (!calculatedCategory) return null;

    const categoryData = {
      small: {
        label: 'FAIBLE (Découverte)',
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: '💡',
        description: 'Petit événement intime ou budget serré'
      },
      medium: {
        label: 'MOYENNE (Standard)',
        color: 'bg-amber-100 text-amber-700 border-amber-300',
        icon: '⭐',
        description: 'Événement familial classique'
      },
      large: {
        label: 'HAUTE (Premium VIP)',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-600',
        icon: '👑',
        description: 'Événement de prestige ou mariage de luxe'
      }
    };

    return categoryData[calculatedCategory];
  };

  const categoryInfo = getCategoryInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Qualification de votre demande
          </DialogTitle>
          <DialogDescription>
            Quelques informations pour mieux vous servir et connecter avec le bon prestataire
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Type d'événement */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              Type d'événement *
            </Label>
            <Select 
              value={formData.event_type} 
              onValueChange={(value) => setFormData({...formData, event_type: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type d'événement" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget estimé */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4" />
              Budget estimé *
            </Label>
            <Select 
              value={formData.budget_amount} 
              onValueChange={(value) => setFormData({...formData, budget_amount: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre budget" />
              </SelectTrigger>
              <SelectContent>
                {budgetRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre d'invités */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              Nombre d'invités *
            </Label>
            <Select 
              value={formData.guest_count} 
              onValueChange={(value) => setFormData({...formData, guest_count: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le nombre d'invités" />
              </SelectTrigger>
              <SelectContent>
                {guestCounts.map(count => (
                  <SelectItem key={count.value} value={count.value}>
                    {count.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catégorie calculée */}
          {categoryInfo && (
            <div className={`p-4 rounded-lg border-2 ${categoryInfo.color} animate-in fade-in slide-in-from-top-2`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{categoryInfo.icon}</span>
                  <span className="font-bold">{categoryInfo.label}</span>
                </div>
                {estimatedPrice && (
                  <Badge variant="outline" className="bg-white/50">
                    Coût déblocage: ${estimatedPrice}
                  </Badge>
                )}
              </div>
              <p className="text-sm opacity-90">{categoryInfo.description}</p>
            </div>
          )}

          {/* Localisation */}
          <div>
            <Label>Localisation *</Label>
            <Input
              placeholder="Ex: Douala, Bonapriso"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              required
            />
          </div>

          {/* Date de l'événement */}
          <div>
            <Label>Date de l'événement</Label>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData({...formData, event_date: e.target.value})}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description de vos besoins *</Label>
            <Textarea
              placeholder="Décrivez ce que vous recherchez..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
              disabled={!formData.event_type || !formData.budget_amount || !formData.guest_count}
            >
              Publier la demande
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}