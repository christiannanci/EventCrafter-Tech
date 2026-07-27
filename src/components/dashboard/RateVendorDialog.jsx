import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Star, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function RateVendorDialog({ booking, onRated }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ title: "Error", description: "Please provide a rating", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const currentUser = await base44.auth.me();
            const providerId = booking.planner_id;

            // Create Vendor Review
            await base44.entities.VendorReview.create({
                review_code: uuidv4(),
                client_id: currentUser.id,
                provider_id: providerId,
                booking_id: booking.id,
                rating: rating,
                comment: comment,
                status: 'pending'
            });

            // Notify all admins for review moderation
            const allUsers = await base44.entities.User.list();
            const admins = allUsers.filter(u => u.role === 'admin');
            
            for (const admin of admins) {
                // Notification cloche
                await base44.entities.Notification.create({
                    user_id: admin.id,
                    title: "? Nouvel avis prestataire à modérer",
                    message: `Avis ${rating}/5 pour un prestataire. Cliquez pour approuver ou rejeter.`,
                    type: "system",
                    link: "/AdminDashboard",
                    is_read: false
                });

                // Email à l'admin
                await SendEmail({
                    to: admin.email,
                    subject: "? Nouvel avis prestataire à modérer",
                    body: `Bonjour ${admin.full_name},\n\nUn nouvel avis client nécessite votre modération:\n\nNote: ${rating}/5\nCommentaire: ${comment}\nPrestataire ID: ${providerId}\n\nAccéder au back office: ${window.location.origin}/AdminDashboard\n\nCordialement,\nL'équipe EventCrafter`
                });
            }

            // Logic for Low Rating (< 3) - Vendor Notifications
            if (rating < 3 && providerId) {
                // Check for recurrence (fetching previous reviews for this vendor)
                const reviews = await base44.entities.VendorReview.filter({ provider_id: providerId });
                const lowRatings = reviews.filter(r => r.rating < 3);
                const count = lowRatings.length + 1;

                let title = "Feedback Alert: Low Rating Received";
                let message = `You received a rating of ${rating}/5 from a recent event. Client feedback: "${comment.substring(0, 50)}..."`;
                let type = "system";

                if (count >= 2) {
                     message += "\n\nWARNING: Multiple low ratings detected. Please review your service quality to maintain your verified status.";
                }
                
                if (count >= 3) {
                    title = "URGENT: Quality Standards Warning";
                    message = "Your average rating is dropping. Continued low performance may lead to removal from the 'Verified Vendor' list or platform suspension.";
                    type = "alert";
                }

                await base44.entities.Notification.create({
                    user_id: providerId,
                    title: title,
                    message: message,
                    type: type,
                    link: "/Dashboard", 
                    is_read: false
                });
            } else {
                 // Good rating notification
                 await base44.entities.Notification.create({
                    user_id: providerId,
                    title: "New 5-Star Review! ?",
                    message: `You received a ${rating}-star review! Check it out to see what clients love about your service.`,
                    type: "system",
                    link: "/Dashboard", 
                    is_read: false
                });
            }

            toast({ title: "Submitted", description: "Review submitted successfully." });
            setIsOpen(false);
            if(onRated) onRated();

        } catch (error) {
            console.error("Rate vendor failed", error);
            toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Star className="w-4 h-4 mr-2" /> Rate Vendor
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rate Your Experience</DialogTitle>
                    <DialogDescription>
                        How was the service provided? Your feedback helps us maintain high quality standards.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`p-2 rounded-full transition-all ${rating >= star ? 'text-yellow-400 scale-110' : 'text-stone-300 hover:text-yellow-200'}`}
                            >
                                <Star className="w-8 h-8 fill-current" />
                            </button>
                        ))}
                    </div>
                    <div className="text-center text-sm font-medium text-stone-500">
                        {rating > 0 ? `${rating} Stars` : "Select a rating"}
                    </div>

                    <div className="space-y-2">
                        <Label>Comment (Required)</Label>
                        <Textarea 
                            placeholder="Share details about the service quality, punctuality, and professionalism..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || rating === 0 || !comment} className="bg-rose-600">
                        {loading ? "Submitting..." : "Submit Review"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}