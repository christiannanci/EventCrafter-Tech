import React, { createContext, useState, useEffect, useContext } from 'react';
import { base44 } from "@/api/apiClient";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser) {
        const [vendorProfiles, clientProfiles] = await Promise.all([
          base44.entities.VendorProfile.filter({ user_id: currentUser.id }),
          base44.entities.ClientProfile.filter({ user_id: currentUser.id })
        ]);

        setVendorProfile(vendorProfiles[0] || null);
        setClientProfile(clientProfiles[0] || null);
      }
    } catch (err) {
      setError(err);
      setUser(null);
      setVendorProfile(null);
      setClientProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const refreshProfiles = async () => {
    if (!user) return;
    
    try {
      const [vendorProfiles, clientProfiles] = await Promise.all([
        base44.entities.VendorProfile.filter({ user_id: user.id }),
        base44.entities.ClientProfile.filter({ user_id: user.id })
      ]);

      setVendorProfile(vendorProfiles[0] || null);
      setClientProfile(clientProfiles[0] || null);
    } catch (err) {
      console.error("Failed to refresh profiles", err);
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      vendorProfile,
      clientProfile,
      loading,
      error,
      refreshProfiles,
      refetch: fetchUserData
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}