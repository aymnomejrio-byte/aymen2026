"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Connexion
        </h1>
        <Auth
          supabaseClient={supabase}
          providers={[]} // Vous pouvez ajouter des fournisseurs comme 'google', 'github' ici si nécessaire
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light" // Utilise le thème clair par défaut, le mode sombre sera géré par Tailwind
          redirectTo={window.location.origin + '/dashboard'}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;