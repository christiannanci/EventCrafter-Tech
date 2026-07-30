import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Phone, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { InvokeLLM, SendEmail, UploadFile, SendSMS, GenerateImage, ExtractDataFromUploadedFile } from '@/api/integrations';
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me().catch(() => null);

      await base44.entities.PlatformFeedback.create({
        user_id: user?.id || 'anonymous',
        feedback_type: 'support_request',
        category: formData.category,
        rating: null,
        comments: `[${formData.subject}]\n\n${formData.message}\n\nContact: ${formData.email} | ${formData.phone}`
      });

      await SendEmail({
        to: 'support@eventcraftercm.com',
        subject: `📩 Demande de Support: ${formData.category} - ${formData.subject}`,
        body: `Nouvelle demande de support:\n\nNom: ${formData.name}\nEmail: ${formData.email}\nTéléphone: ${formData.phone}\nCatégorie: ${formData.category}\nSujet: ${formData.subject}\n\nMessage:\n${formData.message}\n\nUtilisateur ID: ${user?.id || 'Non connecté'}`
      });

      setSuccess(true);
      toast({ title: "Demande envoyée", description: "Notre équipe vous répondra sous 24h" });
      
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', category: '', subject: '', message: '' });
        setSuccess(false);
      }, 3000);

    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: "Impossible d'envoyer votre demande. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">Demande Reçue!</h2>
          <p className="text-green-700 mb-6">
            Notre équipe support vous contactera par email ou téléphone sous 24 heures.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Retour à l'accueil
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F7F3] via-white to-[#FFF0E8] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-['Poppins'] font-bold text-[#2C2C2C] mb-4">
            Centre de Support
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Besoin d'aide ? Nous sommes là pour vous. Remplissez le formulaire ou contactez-nous directement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-blue-900 mb-2">WhatsApp</h3>
              <p className="text-sm text-blue-700 mb-3">Support instantané 24/7</p>
              <a href="https://wa.me/237670934378" target="_blank" rel="noopener noreferrer">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  Ouvrir WhatsApp
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-orange-900 mb-2">Téléphone</h3>
              <p className="text-sm text-orange-700 mb-1">+237 670 93 43 78</p>
              <p className="text-sm text-orange-700 mb-3">+237 690 17 31 93</p>
              <p className="text-xs text-orange-600">Lun-Sam, 8h-20h</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-purple-900 mb-2">Email</h3>
              <p className="text-sm text-purple-700 mb-3">support@eventcraftercm.com</p>
              <p className="text-xs text-purple-600">Réponse sous 24h</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Formulaire de Support</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom Complet *</Label>
                  <Input
                    placeholder="Ex: Jean Dupont"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="exemple@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    placeholder="670 12 34 56"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie *</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Problème de Paiement</SelectItem>
                      <SelectItem value="booking">Réservation</SelectItem>
                      <SelectItem value="refund">Remboursement</SelectItem>
                      <SelectItem value="technical">Problème Technique</SelectItem>
                      <SelectItem value="account">Mon Compte</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sujet *</Label>
                <Input
                  placeholder="Décrivez brièvement votre problème"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Message Détaillé *</Label>
                <Textarea
                  placeholder="Expliquez votre problème en détail pour que nous puissions mieux vous aider..."
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-[#FF6B35] hover:bg-[#e05a2b] h-12" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer ma demande'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-stone-600 mb-3">Consultez d'abord notre FAQ, vous y trouverez peut-être la réponse !</p>
          <Link to={createPageUrl('FAQ')}>
            <Button variant="outline" className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FFF0E8]">
              Voir la FAQ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
