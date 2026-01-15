"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Dashboard = () => {
  const { supabase, session } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion : " + error.message);
    } else {
      toast.success("Déconnexion réussie !");
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Bienvenue sur votre Tableau de Bord
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
          Commencez à gérer votre équipe ici !
        </p>
        {session && (
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            Connecté en tant que : {session.user?.email}
          </p>
        )}
        <Button onClick={handleLogout} className="mt-4">
          Déconnexion
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;