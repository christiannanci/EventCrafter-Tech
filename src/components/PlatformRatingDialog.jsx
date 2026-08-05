import React, { useState } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, MessageSquare, Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from '@/components/LanguageContext';

export default function PlatformRatingDialog({ open, onOpenChange, user }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [npsScore, setNpsScore] = useState(null);
  const [feedbackType, setFeedbackType] = useState('satisfaction');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const ratingLabels = [
    t('rating.poor'), t('rating.weak'), t('rating.acceptable'), t('rating.good'), t('rating.excellent')
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating || npsScore === null || !comment.trim()) {
      toast({
        title: t('rating.incompleteFormTitle'),
        description: t('rating.incompleteFormDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const vendorProfile = await base44.entities.VendorProfile.filter({ user_id: user.id }).then(p => p[0]);
      const clientProfile = await base44.entities.ClientProfile.filter({ user_id: user.id }).then(p => p[0]);

      const userRole = vendorProfile ? 'provider' : clientProfile ? 'client' : 'admin';

      await base44.entities.PlatformFeedback.create({
        user_id: user.id,
        user_role: userRole,
        feedback_type: feedbackType,
        rating,
        nps_score: npsScore,
        comment: comment.trim(),
        benefits_experienced: '',
        performance_rating: rating,
        is_public: false,
        status: 'new',
        moderation_status: 'pending'
      });

      toast({
        title: t('rating.thanksTitle'),
        description: t('rating.thanksDesc'),
      });

      setRating(0);
      setNpsScore(null);
      setFeedbackType('satisfaction');
      setComment('');
      onOpenChange(false);

    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: t('vendor.genericError'),
        description: t('rating.submitError'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            {t('rating.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('rating.dialogSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('rating.overallSatisfaction')}</Label>
            <div className="flex gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= rating
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs text-stone-500 text-center">
              {rating > 0 && ratingLabels[rating - 1]}
            </div>
          </div>

          {/* NPS */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('rating.wouldRecommend')}</Label>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 11 }, (_, i) => i).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNpsScore(value)}
                  className={`py-2 rounded text-xs font-medium transition-colors ${
                    npsScore === value
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('rating.feedbackTypeLabel')}</Label>
            <RadioGroup value={feedbackType} onValueChange={setFeedbackType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="satisfaction" id="satisfaction" />
                <Label htmlFor="satisfaction" className="text-sm font-normal cursor-pointer">{t('rating.satisfactionOption')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feature_request" id="feature_request" />
                <Label htmlFor="feature_request" className="text-sm font-normal cursor-pointer">{t('rating.featureRequestOption')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bug_report" id="bug_report" />
                <Label htmlFor="bug_report" className="text-sm font-normal cursor-pointer">{t('rating.bugReportOption')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <Label htmlFor="comment" className="text-sm font-semibold">{t('rating.yourComment')}</Label>
            <Textarea
              id="comment"
              placeholder={t('rating.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none bg-stone-50 border-stone-200"
              rows={4}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-rose-600 hover:bg-rose-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('rating.sendingInProgress')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('rating.sendReviewButton')}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
