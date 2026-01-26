"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
// Removed supabase and useQuery imports as they are no longer needed for employee account check

const Index = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  // Removed userId and employeeAccount/isLoadingEmployeeAccount as they are no longer needed

  useEffect(() => {
    if (!loading) {
      if (session) {
        // User is logged in, always redirect to manager dashboard
        navigate('/dashboard');
      } else {
        // No session, redirect to login
        navigate('/login');
      }
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  return null; // Cette page ne rend rien, elle redirige seulement
};

export default Index;