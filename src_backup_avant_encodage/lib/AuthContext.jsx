import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
      } catch (err) {
        if (!mounted) return;
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Fallback si la deconnexion echoue
    }
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/Login';
    }
  };

  const checkAppState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};