import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import PlatformRatingDialog from './PlatformRatingDialog';
import { useLanguage } from '@/components/LanguageContext';

export default function PlatformRatingButton({ user }) {
  const { t } = useLanguage();
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
        {t('rating.dialogTitle')}
      </Button>
      <PlatformRatingDialog open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}
