"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Separator } from "@/components/ui/separator";
import { Users, Clock, CalendarDays, CalendarCheck } from "lucide-react";
import { ReportsSkeleton } from "@/components/ReportsSkeleton";

const Reports = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  // Fetch total employees
  const { data: totalEmployees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["total_employees", userId],
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

  // Fetch employees by department for chart
  const { data: employeesByDepartment, isLoading: isLoadingEmployeesByDepartment } = useQuery({
    queryKey: ["employees_by_department", userId],
    queryFn: async () => {
      if (!userId) return [];
      // Corrected: Select only the department column, then aggregate client-side
      const { data, error } = await supabase
        .from("employees")
        .select("department")
        .eq("user_id", userId);
      if (error) throw error;

      // Aggregate counts by department
      const departmentCounts: { [key: string]: number } = {};
      data.forEach((employee: any) => {
        const departmentName = employee.department || "Non spécifié";
        departmentCounts[departmentName] = (departmentCounts[departmentName] || 0) + 1;
      });

      return Object.keys(departmentCounts).map(department => ({
        department,
        count: departmentCounts[department],
      }));
    },
    enabled: !!userId,
  });

  // Fetch total attendance records
  const { data: totalAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["total_attendance", userId],
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

  // Fetch total leave requests
  const { data: totalLeaveRequests, isLoading: isLoadingLeaveRequests } = useQuery({
    queryKey: ["total_leave_requests", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  // Fetch total Tunisian holidays
  const { data: totalTunisianHolidays, isLoading: isLoadingTunisianHolidays } = useQuery({
    queryKey: ["total_tunisian_holidays", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("tunisian_holidays")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count;
    },
    enabled: !!userId,
  });

  const isLoading = isLoadingEmployees || isLoadingEmployeesByDepartment || isLoadingAttendance || isLoadingLeaveRequests || isLoadingTunisianHolidays;

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Rapports & Analyses</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Visualisez les statistiques clés de votre équipe.
      </p>
      <Separator className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Nombre total d'employés enregistrés
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Présences Enregistrées</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendance}</div>
            <p className="text-xs text-muted-foreground">
              Total des enregistrements de présence
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes de Congé</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">
              Total des demandes de congé soumises
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours Fériés</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTunisianHolidays}
            </div>
            <p className="text-xs text-muted-foreground">
              Nombre de jours fériés configurés
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Répartition des Employés par Département</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesByDepartment && employeesByDepartment.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={employeesByDepartment}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Nombre d'employés" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground">Aucune donnée de département disponible.</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center text-gray-500 dark:text-gray-400">
        Plus de rapports et d'analyses seront ajoutés ici prochainement !
      </div>
    </div>
  );
};

export default Reports;