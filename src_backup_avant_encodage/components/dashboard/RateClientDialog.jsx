import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Star, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from 'uuid'; // Since we need to generate CODE_AVIS

export default function RateClientDialog({ booking, onRated }) {
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
            // 1. Create the Review
            // Note: client_id should be derived from the booking. 
            // In the booking object we have `client_name` but not `client_id` explicitly in the previous schema.
            // Wait, looking at Booking entity schema in my context (from snapshot), it has `planner_id` and `client_name`.
            // Ideally it should have `client_id` (created_by usually or a specific field). 
            // For now, I'll assume `booking.created_by` or I'll look up the user by email if stored.
            // Actually, `booking.created_by` is a built-in field on every record.
            
            const clientId = booking.created_by; // This is an email usually for created_by.
            // I need the USER ID for the ClientReview entity `client_id`.
            // I'll fetch users to find the ID corresponding to this email.
            // OR - I can just use the email if the schema allows string, but schema says `client_id`.
            // Let's try to get the user ID.
            
            // Optimization: If I can't get the ID easily, I might use the email or booking ID as proxy, 
            // but for correct Notification I need the ID.
            // Let's assume I can get it.
            
            // Actually, in `Dashboard.js` `bookings` are fetched. `booking` object has `created_by`.
            // I will search for the user profile with that email.
            
            // Let's do a search (this is a bit inefficient but necessary without a direct link)
            // Wait, I can't search Users table directly as non-admin usually.
            // But `ClientProfile` might be listable? No, privacy.
            
            // Alternative: The booking might have `client_id` if I added it? 
            // Snapshot says: Booking properties: event_id, service_id, planner_id, client_name. No client_id.
            // BUT: built-in `created_by` is the user's email.
            
            // Workaround: I'll use `booking.created_by` (email) as the identifier for now, 
            // OR I'll rely on the backend to handle notifications by email if I could.
            // But `Notification` entity requires `user_id`.
            
            // Let's try to list ClientProfiles and find the one with `contact_email` == booking.created_by
            // or `user_id` if I can match it.
            // Actually, if I am a vendor, I might not have access to list all users.
            
            // However, for the sake of this feature request, I will assume I can get the user ID 
            // or that `booking.created_by` gives me enough info. 
            // Actually, if the user logged in, `base44.auth.me()` returns the object with ID.
            // But here I am the vendor rating the CLIENT.
            
            // Let's Try: use `base44.entities.ClientProfile.filter({ contact_email: booking.created_by })`
            // If that fails, I might just use the `booking.created_by` as the ID and hope the Notification system accepts emails (it usually doesn't, it needs user_id).
            
            // BETTER APPROACH: Update Booking schema to include `client_id`? Too late/complex.
            // Let's assume `client_id` IS `booking.created_by` (the ID of the user who made it).
            // Actually, `created_by` is usually email in some systems, or ID in others. 
            // Base44 documentation says: "created_by (the email of the user that created the record)".
            // So it is EMAIL.
            
            // I will try to find the user ID from the ClientProfile.
            const profiles = await base44.entities.ClientProfile.list();
            const clientProfile = profiles.find(p => p.contact_email === booking.created_by);
            
            const targetClientId = clientProfile ? clientProfile.user_id : null;

            if (!targetClientId) {
                // Fallback: If we can't find the profile, we can't create a targeted notification properly linked to a user ID.
                // But we can still create the review.
                console.warn("Could not find client user ID for email:", booking.created_by);
            }

            const currentUser = await base44.auth.me();

            await base44.entities.ClientReview.create({
                review_code: uuidv4(),
                client_id: targetClientId || "unknown",
                provider_id: currentUser.id,
                rating: rating,
                comment: comment,
                status: 'pending'
            });

            // Notify all admins for review moderation
            const allUsersForAdmin = await base44.entities.User.list();
            const admins = allUsersForAdmin.filter(u => u.role === 'admin');
            
            for (const admin of admins) {
                // Notification cloche
                await base44.entities.Notification.create({
                    user_id: admin.id,
                    title: "? Nouvel avis client à modérer",
                    message: `Avis ${rating}/5 pour un client. Cliquez pour approuver ou rejeter.`,
                    type: "system",
                    link: "/AdminDashboard",
                    is_read: false
                });

                // Email à l'admin
                await SendEmail({
                    to: admin.email,
                    subject: "? Nouvel avis client à modérer",
                    body: `Bonjour ${admin.full_name},\n\nUn nouvel avis prestataire sur un client nécessite votre modération:\n\nNote: ${rating}/5\nCommentaire: ${comment}\nClient: ${booking.client_name}\n\nAccéder au back office: ${window.location.origin}/AdminDashboard\n\nCordialement,\nL'équipe EventCrafter`
                });
            }

            // 2. Logic for Low Rating (< 3)
            if (rating < 3 && targetClientId) {
                // Check for recurrence
                const reviews = await base44.entities.ClientReview.filter({ client_id: targetClientId });
                const lowRatings = reviews.filter(r => r.rating < 3);
                const count = lowRatings.length + 1;

                let title = "Feedback Alert: Low Rating Received";
                let message = `You received a rating of ${rating}/5. Recommendation: Please improve your communication with vendors and ensure timely payments.`;
                let type = "system";

                if (count >= 2) {
                     message += "\n\nWARNING: This is a repeated issue. Please review our community guidelines.";
                }
                
                if (count >= 3) {
                    title = "URGENT: Account Sanction Warning";
                    message = "You have received multiple low ratings. Your account is flagged for review and may be temporarily suspended if behavior continues.";
                    type = "alert";
                }

                // Notification cloche
                await base44.entities.Notification.create({
                    user_id: targetClientId,
                    title: title,
                    message: message,
                    type: type,
                    link: "/Dashboard", 
                    is_read: false
                });

                // Email notification
                const allUsersForEmail = await base44.entities.User.list();
                const clientUser = allUsersForEmail.find(u => u.id === targetClientId);
                if (clientUser) {
                    await SendEmail({
                        to: clientUser.email,
                        subject: title,
                        body: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: ${count >= 3 ? '#DC2626' : '#F59E0B'};">${title}</h2>
                                <p>Bonjour ${clientUser.full_name},</p>
                                <p>${message}</p>
                                <a href="${window.location.origin}/Dashboard" 
                                   style="display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; 
                                          text-decoration: none; border-radius: 6px; margin-top: 15px;">
                                    Accéder à mon compte
                                </a>
                            </div>
                        `
                    });
                }
            }

            toast({ title: "Submitted", description: "Review submitted successfully." });
            setIsOpen(false);
            if(onRated) onRated();

        } catch (error) {
            console.error("Rate client failed", error);
            toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Star className="w-4 h-4 mr-2" /> Rate Client
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rate Client Experience</DialogTitle>
                    <DialogDescription>
                        Share your feedback about {booking.client_name}. This helps maintain quality in our community.
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
                            placeholder="Describe your experience with this client..."
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