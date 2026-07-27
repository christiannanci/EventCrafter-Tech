import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/apiClient";

export default function SetPriceDialog({ booking, onConfirm }) {
  const [price, setPrice] = useState(booking.total_amount || 0);
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    const amount = parseFloat(price);
    const commission = amount * 0.05; // 5% Commission

    await base44.entities.Booking.update(booking.id, {
        total_amount: amount,
        commission_amount: commission,
        status: 'awaiting_payment'
    });

    // Notify Client
    // Note: In real app, we need to know who created the booking. 
    // Assuming booking.created_by is the client if they made it.
    if (booking.created_by) {
        await base44.entities.Notification.create({
            user_id: booking.created_by,
            title: "Booking Accepted",
            message: `Your booking for ${booking.event_type} has been accepted. Please proceed to payment.`,
            type: "payment",
            link: "/Dashboard",
            is_read: false
        });
    }
    
    setOpen(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
           Accept & Set Price
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Booking & Set Price</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <p className="text-sm text-stone-500">Please confirm the agreed total price for this service. A 5% platform fee will be calculated automatically.</p>
            <div className="space-y-2">
                <label className="text-sm font-medium">Agreed Price (FCFA)</label>
                <Input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder="e.g. 50000"
                />
            </div>
            <div className="bg-stone-50 p-3 rounded text-sm flex justify-between">
                <span>Platform Commission (5%):</span>
                <span className="font-bold text-rose-600">{(price * 0.05).toLocaleString()} FCFA</span>
            </div>
            <Button onClick={handleConfirm} className="w-full bg-green-600">Confirm Booking</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}