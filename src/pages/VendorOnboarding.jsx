import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, MapPin, Phone, User, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export default function VendorOnboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    phone: "",
    city: "Yaoundé",
    category: "Event Planner"
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
            // Check if already has profile
            const profiles = await base44.entities.VendorProfile.list();
            const existing = profiles.find(p => p.user_id === currentUser.id);
            if (existing) {
                navigate('/Dashboard');
            }
        } catch (e) {
            base44.auth.redirectToLogin(window.location.href);
        }
    };
    init();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
        await base44.entities.VendorProfile.create({
            user_id: user.id,
            business_name: formData.business_name,
            phone: formData.phone,
            plan: 'free',
            subscription_status: 'active'
        });

        // Create a default empty service to get them started? 
        // Or just redirect to dashboard
        
        // Let's create a placeholder service if they want
        // For now, just profile

        // Simulate WhatsApp Welcome
        console.log("Sending WhatsApp welcome...");
        
        navigate('/Dashboard');
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardHeader className="text-center pb-8 border-b border-stone-100">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-stone-900">Setup Your Business Profile</CardTitle>
          <CardDescription className="text-stone-500">
            Join the Event Crafter community. It only takes a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Business Name</Label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                        <Input 
                            className="pl-10"
                            placeholder="e.g. Divine Events & Decor" 
                            value={formData.business_name}
                            onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                            <Input 
                                className="pl-10"
                                placeholder="+237..." 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>City</Label>
                        <Select 
                            value={formData.city} 
                            onValueChange={(val) => setFormData({...formData, city: val})}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Yaoundé">Yaoundé</SelectItem>
                                <SelectItem value="Douala">Douala</SelectItem>
                                <SelectItem value="Bamenda">Bamenda</SelectItem>
                                <SelectItem value="Bafoussam">Bafoussam</SelectItem>
                                <SelectItem value="Buea">Buea</SelectItem>
                                <SelectItem value="Garoua">Garoua</SelectItem>
                                <SelectItem value="Maroua">Maroua</SelectItem>
                                <SelectItem value="Limbe">Limbe</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Primary Service Category</Label>
                     <Select 
                        value={formData.category} 
                        onValueChange={(val) => setFormData({...formData, category: val})}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Event Planner">Event Planner</SelectItem>
                            <SelectItem value="Caterer">Caterer</SelectItem>
                            <SelectItem value="Photographer">Photographer</SelectItem>
                            <SelectItem value="Decorator">Decorator</SelectItem>
                            <SelectItem value="Venue">Venue</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="bg-rose-50 p-4 rounded-lg flex gap-3">
                    <div className="mt-1">
                        <User className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="text-sm text-stone-600">
                        <span className="font-semibold text-rose-700">Vendor Benefit:</span> You'll get your first 3 leads for free to help you get started!
                    </div>
                </div>

                <Button 
                    className="w-full bg-rose-600 hover:bg-rose-700 h-12 text-lg"
                    onClick={handleSubmit}
                    disabled={!formData.business_name || !formData.phone || loading}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Complete Setup <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}