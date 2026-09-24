import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import PlatformRatingDialog from './PlatformRatingDialog';

export default function PlatformRatingButton({ user }) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-stone-600 hover:text-rose-600 border-stone-200 hover:border-rose-300"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Noter la plateforme
      </Button>
      <PlatformRatingDialog open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}