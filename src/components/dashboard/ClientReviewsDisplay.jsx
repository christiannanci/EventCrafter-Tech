import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, StarHalf, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function ClientReviewsDisplay({ clientUserId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [vendorNames, setVendorNames] = useState({});

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const allReviews = await base44.entities.ClientReview.list();
        const clientReviews = allReviews.filter(r => 
          r.client_id === clientUserId && r.status === 'approved'
        );
        
        // Sort by most recent
        clientReviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        
        setReviews(clientReviews);
        
        // Calculate average
        if (clientReviews.length > 0) {
          const avg = clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length;
          setAverageRating(avg);
        }

        // Fetch vendor names
        const providerIds = [...new Set(clientReviews.map(r => r.provider_id))];
        const vendorProfiles = await base44.entities.VendorProfile.list();
        const names = {};
        for (const id of providerIds) {
          const profile = vendorProfiles.find(p => p.user_id === id);
          names[id] = profile?.business_name || 'Prestataire';
        }
        setVendorNames(names);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (clientUserId) {
      fetchReviews();
    }
  }, [clientUserId]);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-4 h-4 fill-amber-400 text-amber-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="w-4 h-4 fill-amber-400 text-amber-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-stone-300" />);
    }

    return stars;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Avis des Prestataires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-500 text-center py-8">Chargement des avis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              Avis des Prestataires
            </CardTitle>
            <p className="text-sm text-stone-500">Ce que les vendors pensent de vous</p>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">{renderStars(averageRating)}</div>
                <span className="text-2xl font-bold text-stone-900">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-stone-500">({reviews.length} avis)</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-stone-200 rounded-lg p-4 bg-stone-50/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 rounded-full">
                      <Building2 className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{vendorNames[review.provider_id] || 'Prestataire'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <Badge variant="outline" className="text-xs">
                          {review.rating}/5
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-stone-400">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(review.created_date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">Aucun avis pour le moment</h3>
            <p className="text-stone-500 text-sm">
              Les avis des prestataires avec qui vous avez travaillé apparaîtront ici.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}