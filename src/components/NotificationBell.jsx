import React, { useState, useEffect } from 'react';
import { Bell } from "lucide-react";
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  booking: 'Réservation',
  payment: 'Paiement',
  admin_alert: 'Alerte Admin',
  system: 'Système',
  dispute: 'Litige',
  message: 'Message',
  post_request: 'Demande',
  verification_approved: 'Vérification',
  verification_rejected: 'Vérification',
  verification_response: 'Vérification',
  contract: 'Contrat',
  completion: 'Terminé',
  dispute_resolved: 'Litige',
  dispute_alert_flash: 'Litige',
  admin_message: 'Admin',
  payment_reminder: 'Rappel',
  admin_action: 'Admin',
  alert: 'Alerte'
};

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
      // In a real app, this would be a subscription or polled
      try {
          // OPTIMIZED: Limit to 20 recent notifications only
          const all = await base44.entities.Notification.list('-created_date', 20);
          // Client side filter
          let userNotifs = all
            .filter(n => n.user_id === user.id)
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

          // If Admin, inject system alerts as notifications
          if (user.role === 'admin') {
               // OPTIMIZED: Fetch only pending items
               const pendingPayouts = await base44.entities.ProviderPayout.filter({ transaction_status: 'pending_approval' });
               const pendingRefunds = await base44.entities.ClientRefund.filter({ status: 'pending_approval' });
               
               const actionablePayouts = pendingPayouts;
               const actionableRefunds = pendingRefunds;

               const systemAlerts = [];
               
               // Récupérer l'état dismissed du sessionStorage
               const dismissedAlerts = JSON.parse(sessionStorage.getItem('dismissedAdminAlerts') || '{}');
               
               if (actionablePayouts.length > 0 && !dismissedAlerts['sys-payouts']) {
                   systemAlerts.push({
                       id: 'sys-payouts',
                       type: 'admin_alert',
                       title: 'Paiements en Attente',
                       message: `${actionablePayouts.length} paiement(s) en attente d'approbation.`,
                       created_date: new Date().toISOString(),
                       is_read: false,
                       link: '/AdminPayouts'
                   });
               }

               if (actionableRefunds.length > 0 && !dismissedAlerts['sys-refunds']) {
                   systemAlerts.push({
                       id: 'sys-refunds',
                       type: 'admin_alert',
                       title: 'Remboursements en Attente',
                       message: `${actionableRefunds.length} remboursement(s) en attente d'approbation.`,
                       created_date: new Date().toISOString(),
                       is_read: false,
                       link: '/AdminPayouts'
                   });
               }

               userNotifs = [...systemAlerts, ...userNotifs];
          }
          
          setNotifications(userNotifs);
          setUnreadCount(userNotifs.filter(n => !n.is_read).length);
      } catch (e) {
          console.error("Failed to fetch notifications", e);
      }
    };

  useEffect(() => {
    if (!user) return;

    loadNotifications();
    
    // Écouter les nouvelles notifications en temps réel
    const handleNewNotification = () => {
      loadNotifications();
    };
    window.addEventListener('notification-received', handleNewNotification);

    const interval = setInterval(loadNotifications, 30000); // Poll every 30s (backup)
    
    return () => {
      window.removeEventListener('notification-received', handleNewNotification);
      clearInterval(interval);
    };
  }, [user]);

  const markAsRead = async (notification) => {
    if (notification.is_read) return;
    
    // Pour les alertes admin système, sauvegarder le dismiss dans sessionStorage
    if (notification.type?.includes('admin_alert')) {
      const dismissedAlerts = JSON.parse(sessionStorage.getItem('dismissedAdminAlerts') || '{}');
      dismissedAlerts[notification.id] = true;
      sessionStorage.setItem('dismissedAdminAlerts', JSON.stringify(dismissedAlerts));
      
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    
    try {
      await base44.entities.Notification.update(notification.id, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification);
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read && !n.type?.includes('admin_alert'));
    for (const n of unread) {
        try {
            await base44.entities.Notification.update(n.id, { is_read: true });
        } catch (e) {
            console.error("Failed to mark as read:", e);
        }
    }
    setNotifications(prev => prev.map(n => 
        n.type?.includes('admin_alert') ? n : { ...n, is_read: true }
    ));
    setUnreadCount(prev => Math.max(0, prev - unread.length));
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-[#2C2C2C] hover:text-[#FF6B35]">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-600 border-2 border-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-stone-50/50">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto px-2 text-xs text-rose-600" onClick={markAllRead}>
                    Tout marquer comme lu
                </Button>
            )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 p-4 text-center">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Aucune notification pour le moment</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {notifications.map((n) => (
                <div 
                    key={n.id} 
                    className={cn(
                        "p-4 cursor-pointer hover:bg-stone-50 transition-colors",
                        !n.is_read && "bg-rose-50/30"
                    )}
                    onClick={() => handleNotificationClick(n)}
                >
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", 
                            n.type === 'booking' ? "bg-blue-100 text-blue-700" :
                            n.type === 'payment' ? "bg-green-100 text-green-700" :
                            n.type === 'admin_alert' ? "bg-rose-100 text-rose-700 animate-pulse" :
                            "bg-stone-100 text-stone-700"
                        )}>
                            {TYPE_LABELS[n.type] || n.type}
                        </span>
                        <span className="text-[10px] text-stone-400 whitespace-nowrap">
                            {new Date(n.created_date).toLocaleDateString()}
                        </span>
                    </div>
                    <h5 className="font-medium text-sm text-stone-900 mb-0.5">{n.title}</h5>
                    <p className="text-xs text-stone-500 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
