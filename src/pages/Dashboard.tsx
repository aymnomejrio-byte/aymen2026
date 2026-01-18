"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { useNavigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar"; // Import the Sidebar component

const DashboardLayout = () => {
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
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de Bord</h1>
          <div className="flex items-center space-x-4">
            {session && (
              <span className="text-gray-700 dark:text-gray-300 text-sm hidden sm:block">
                Connecté en tant que : {session.user?.email}
              </span>
            )}
            <Button onClick={handleLogout} variant="outline">
              Déconnexion
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet /> {/* This is where nested routes will render */}
          <div className="text-center mt-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Bienvenue sur votre Tableau de Bord
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Commencez à gérer votre équipe ici !
            </p>
            {/* You can add initial dashboard widgets here */}
          </div>
        </main>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DashboardLayout;