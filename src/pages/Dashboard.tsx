"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { useNavigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CalendarDays, ShieldCheck } from "lucide-react";
import { DashboardOverviewSkeleton } from "@/components/DashboardOverviewSkeleton";

const DashboardLayout = () => {
  const { supabase, session } = useSession();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  // Fetch total employees
  const { data: totalEmployees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["total_employees_dashboard", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  // Fetch pending leave requests
  const { data: pendingLeaveRequests, isLoading: isLoadingLeaveRequests } = useQuery({
    queryKey: ["pending_leave_requests_dashboard", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "Submitted");
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  // Fetch pending authorizations
  const { data: pendingAuthorizations, isLoading: isLoadingAuthorizations } = useQuery({
    queryKey: ["pending_authorizations_dashboard", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("authorizations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "Submitted");
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  // Fetch total attendance records (for a simple count, could be refined for current month/week)
  const { data: totalAttendanceRecords, isLoading: isLoadingAttendanceRecords } = useQuery({
    queryKey: ["total_attendance_records_dashboard", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  const isLoadingOverview = isLoadingEmployees || isLoadingLeaveRequests || isLoadingAuthorizations || isLoadingAttendanceRecords;

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
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Aperçu Général
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Statistiques clés de votre gestion d'équipe.
            </p>
            {isLoadingOverview ? (
              <DashboardOverviewSkeleton />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Employés</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalEmployees}</div>
                    <p className="text-xs text-muted-foreground">
                      Employés enregistrés
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Congés en Attente</CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pendingLeaveRequests}</div>
                    <p className="text-xs text-muted-foreground">
                      Demandes de congé en attente d'approbation
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Autorisations en Attente</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pendingAuthorizations}</div>
                    <p className="text-xs text-muted-foreground">
                      Autorisations spéciales en attente
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Présences</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalAttendanceRecords}</div>
                    <p className="text-xs text-muted-foreground">
                      Enregistrements de présence
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <Outlet /> {/* This is where nested routes will render */}
        </main>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DashboardLayout;