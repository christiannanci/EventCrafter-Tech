import { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { toast } from "sonner";

export function useVendorData(user) {
  const [vendorProfile, setVendorProfile] = useState(null);
  const [myServices, setMyServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [allFunctions, setAllFunctions] = useState([]);
  const [membershipStatus, setMembershipStatus] = useState('free');
  const [analytics, setAnalytics] = useState({ views: 0, leads: 0 });
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationLimit, setNotificationLimit] = useState(false);
  const [loading, setLoading] = useState({ leads: false, bookings: false });
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading({ leads: true, bookings: true });
      setError(null);

      const [vendorProfiles, services, receivedBookings, types, fns] = await Promise.all([
        base44.entities.VendorProfile.list().catch(() => []),
        base44.entities.Service.filter({ created_by: user.email }).catch(() => []),
        base44.entities.Booking.filter({ planner_id: user.id }, '-created_date', 100).catch(() => []),
        base44.entities.ServiceType.list().catch(() => []),
        base44.entities.Fonction.list().catch(() => [])
      ]);

      setVendorProfile(vendorProfiles.find(p => p.user_id === user.id));
      setMyServices(services);
      setBookings(receivedBookings);
      setServiceTypes(types.filter(t => !t.status || t.status === 'active'));
      setAllFunctions(fns.filter(f => !f.status || f.status === 'active'));

      // Fetch and filter leads
      const allLeads = await base44.entities.Lead.filter({ status: 'open' }, '-created_date', 50).catch(() => []);
      let matchingLeads = allLeads.filter(lead => {
        if (lead.service_category === 'All') return true;
        return services.some(s => s.category === lead.service_category);
      });
      matchingLeads.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      // Analytics
      const totalViews = services.reduce((acc, curr) => acc + (curr.views || 0), 0);
      setAnalytics({ views: totalViews, leads: receivedBookings.length });

      // Membership status — parallel with leads
      const [memberships, membershipTypes] = await Promise.all([
        base44.entities.Membership.filter(
          { user_id: user.id, status: 'active' }, 
          '-created_date', 
          10
        ).catch(() => []),
        base44.entities.MembershipType.list().catch(() => [])
      ]);
      
      let currentStatus = 'free';
      if (memberships.length > 0) {
        const activeMembership = memberships[0];
        const membershipType = membershipTypes.find(mt => mt.code === activeMembership.membership_type_code);
        
        if (membershipType) {
          if (membershipType.code.toLowerCase().includes('premium')) {
            currentStatus = 'premium';
          } else if (membershipType.code.toLowerCase().includes('gold')) {
            currentStatus = 'gold';
          }
        }
      }
      setMembershipStatus(currentStatus);

      // For free users, limit leads
      if (currentStatus === 'free') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const leadsThisMonth = matchingLeads.filter(lead => 
          new Date(lead.created_date) >= startOfMonth
        );
        setLeads(leadsThisMonth.slice(0, 10));

        // Check notification count
        const allNotifications = await base44.entities.Notification.filter({
          user_id: user.id,
          type: 'post_request'
        }, '-created_date', 100).catch(() => []);

        const monthlyNotifications = allNotifications.filter(n => 
          new Date(n.created_date) >= startOfMonth
        );

        setNotificationCount(monthlyNotifications.length);
        setNotificationLimit(monthlyNotifications.length >= 10);
      } else {
        setLeads(matchingLeads);
      }

    } catch (error) {
      console.error('useVendorData error:', error);
      setError(error.message || "Erreur de chargement des données");
      toast.error("Impossible de charger les données du tableau de bord");
    } finally {
      setLoading({ leads: false, bookings: false });
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  return {
    vendorProfile,
    myServices,
    bookings,
    leads,
    serviceTypes,
    allFunctions,
    membershipStatus,
    analytics,
    notificationCount,
    notificationLimit,
    loading,
    error,
    refetch: fetchData,
    setMyServices,
    setBookings,
    setLeads
  };
}