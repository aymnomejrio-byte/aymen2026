"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          // Only navigate to dashboard if coming from login page
          if (window.location.pathname === '/login') {
            navigate('/dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // Handle initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // If there's a session and user is on login page, redirect to dashboard
      if (session && window.location.pathname === '/login') {
        navigate('/dashboard');
      }
      // If no session and user is not on login page, redirect to login
      else if (!session && window.location.pathname !== '/login') {
        navigate('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement de la session...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, supabase, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};