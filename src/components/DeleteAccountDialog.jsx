import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/apiClient";
import { useLanguage } from '@/components/LanguageContext';

export default function DeleteAccountDialog({ user }) {
  const { t } = useLanguage();
  const CONFIRM_WORD = t('deleteAccount.confirmWord');
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== CONFIRM_WORD) return;
    setLoading(true);
    try {
      const [clientProfiles, vendorProfiles] = await Promise.all([
        base44.entities.ClientProfile.filter({ user_id: user.id }),
        base44.entities.VendorProfile.filter({ user_id: user.id }),
      ]);
      for (const p of clientProfiles) await base44.entities.ClientProfile.delete(p.id);
      for (const p of vendorProfiles) await base44.entities.VendorProfile.delete(p.id);
      await base44.auth.logout('/');
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-red-100">
      <h3 className="text-sm font-semibold text-red-700 mb-2">{t('deleteAccount.dangerZone')}</h3>
      <p className="text-xs text-stone-500 mb-4">
        {t('deleteAccount.dangerZoneDesc')}
      </p>
      <Button
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 select-none"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        {t('deleteAccount.deleteButton')}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ {t('deleteAccount.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{t('deleteAccount.confirmDescPrefix')} <strong>{t('deleteAccount.irreversible')}</strong>. {t('deleteAccount.confirmDescSuffix')}</span>
              <span className="block mt-2">{t('deleteAccount.typeToConfirmPrefix')} <strong className="text-red-600">{CONFIRM_WORD}</strong> {t('deleteAccount.typeToConfirmSuffix')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmation('')}>{t('deleteAccount.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmation !== CONFIRM_WORD || loading}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? t('deleteAccount.deletingInProgress') : t('deleteAccount.deletePermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
