import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, User } from "lucide-react";
import { format } from "date-fns";

export default function ReviewsSection({ serviceId, serviceTitle, onReviewAdded }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me().catch(() => null);
        setUser(currentUser);
        await fetchReviews();
      } catch (error) {
        console.error("Error initializing reviews:", error);
      }
    };
    init();
  }, [serviceId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const allReviews = await base44.entities.Review.list();
      const serviceReviews = (allReviews || [])
        .filter(r => r?.service_id === serviceId)
        .sort((a, b) => new Date(b?.created_date || 0) - new Date(a?.created_date || 0));
      setReviews(serviceReviews);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newReview.comment.trim()) return;
    setSubmitting(true);
    try {
      // 1. Create Review
      await base44.entities.Review.create({
        service_id: serviceId,
        rating: newReview.rating,
        comment: newReview.comment
      });

      // 2. Update Service Stats
      const allReviews = [...(reviews || []), { rating: newReview.rating }]; // Optimistic calc
      const totalRating = allReviews.reduce((acc, curr) => acc + (curr?.rating || 0), 0);
      const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

      await base44.entities.Service.update(serviceId, {
        rating: parseFloat(avgRating.toFixed(1)),
        review_count: allReviews.length
      });

      // Reset
      setNewReview({ rating: 5, comment: "" });
      await fetchReviews();
      if (onReviewAdded) onReviewAdded();

    } catch (error) {
      console.error("Failed to submit review", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-stone-400">Loading reviews...</div>;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Reviews</h2>
        <div className="flex items-center gap-1">
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          <span className="font-bold text-lg">
            {(reviews || []).length > 0 
              ? ((reviews || []).reduce((a, b) => a + (b?.rating || 0), 0) / (reviews || []).length).toFixed(1) 
              : "0.0"}
          </span>
          <span className="text-stone-400">({reviews.length} reviews)</span>
        </div>
      </div>

      {/* Review Form */}
      {user ? (
        <div className="bg-stone-50 p-6 rounded-xl mb-8 border border-stone-100">
          <h3 className="font-semibold mb-4">Write a Review</h3>
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setNewReview({ ...newReview, rating: star })}
                className="focus:outline-none"
              >
                <Star 
                  className={`w-6 h-6 ${star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`} 
                />
              </button>
            ))}
            <span className="text-sm text-stone-500 ml-2">
              {newReview.rating === 5 ? "Excellent" : 
               newReview.rating === 4 ? "Good" :
               newReview.rating === 3 ? "Average" :
               newReview.rating === 2 ? "Poor" : "Terrible"}
            </span>
          </div>
          <Textarea
            placeholder={`Share your experience with ${serviceTitle}...`}
            value={newReview.comment}
            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
            className="mb-4 bg-white"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !newReview.comment.trim()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {submitting ? "Posting..." : "Post Review"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 p-6 rounded-xl mb-8 text-center border border-stone-100">
          <p className="text-stone-500 mb-2">Please sign in to leave a review.</p>
          <Button variant="outline" onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {(!reviews || reviews.length === 0) ? (
          <p className="text-stone-500 italic text-center py-4">No reviews yet. Be the first to review!</p>
        ) : (
          (reviews || []).map((review) => review && (
            <div key={review.id} className="border-b border-stone-100 pb-6 last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">
                     {/* Note: In a real app we'd fetch the user's name from created_by or an include */}
                     User
                  </div>
                  <div className="flex items-center text-xs text-stone-400 gap-2">
                    <span>{review?.created_date ? format(new Date(review.created_date), 'PPP') : ''}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3 h-3 ${star <= (review?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-stone-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-stone-600 italic">"{review?.comment || ''}"</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}