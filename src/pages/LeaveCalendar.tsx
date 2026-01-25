"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { TeamCalendar } from "@/components/TeamCalendar";
import { LeaveCalendarSkeleton } from "@/components/LeaveCalendarSkeleton";
import { format, parseISO, eachDayOfInterval } from "date-fns";

// Define types for better clarity and to resolve TS errors
interface EmployeeDetails {
  first_name: string | null;
  last_name: string | null;
}

interface LeaveRequestData {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string | null;
  status: string;
  employees: EmployeeDetails | null; // This should be an object or null, not an array
}

interface TunisianHolidayData {
  id: string;
  date: string;
  name: string;
}

const LeaveCalendar = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  // Fetch approved leave requests
  const { data: leaveRequests, isLoading: isLoadingLeaveRequests, error: leaveError } = useQuery<LeaveRequestData[]>({
    queryKey: ["approved_leave_requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          id,
          start_date,
          end_date,
          type,
          reason,
          status,
          employees (first_name, last_name)
        `)
        .eq("user_id", userId)
        .eq("status", "Approved");
      if (error) throw error;
      return data as LeaveRequestData[]; // Explicitly cast the data to the expected type
    },
    enabled: !!userId,
  });

  // Fetch Tunisian holidays
  const { data: tunisianHolidays, isLoading: isLoadingTunisianHolidays, error: holidayError } = useQuery<TunisianHolidayData[]>({
    queryKey: ["tunisian_holidays_calendar", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tunisian_holidays")
        .select("id, date, name");
      if (error) throw error;
      return data as TunisianHolidayData[]; // Explicitly cast the data to the expected type
    },
    enabled: !!userId,
  });

  if (isLoadingLeaveRequests || isLoadingTunisianHolidays) {
    return <LeaveCalendarSkeleton />;
  }

  if (leaveError) {
    toast.error("Erreur lors du chargement des demandes de congé : " + leaveError.message);
    return <div className="text-center py-8 text-red-500">Erreur : {leaveError.message}</div>;
  }

  if (holidayError) {
    toast.error("Erreur lors du chargement des jours fériés : " + holidayError.message);
    return <div className="text-center py-8 text-red-500">Erreur : {holidayError.message}</div>;
  }

  const allEvents: any[] = [];

  // Process leave requests
  leaveRequests?.forEach((request) => {
    const startDate = parseISO(request.start_date);
    const endDate = parseISO(request.end_date);
    const daysInLeave = eachDayOfInterval({ start: startDate, end: endDate });

    daysInLeave.forEach(day => {
      const employeeFullName = request.employees
        ? `${request.employees.first_name || ''} ${request.employees.last_name || ''}`.trim()
        : 'Employé inconnu';

      allEvents.push({
        id: `${request.id}-${format(day, 'yyyy-MM-dd')}`,
        date: format(day, 'yyyy-MM-dd'),
        title: `Congé (${request.type})`,
        description: request.reason,
        type: 'leave',
        employeeName: employeeFullName,
        status: request.status,
      });
    });
  });

  // Process Tunisian holidays
  tunisianHolidays?.forEach((holiday) => {
    allEvents.push({
      id: holiday.id,
      date: format(parseISO(holiday.date), 'yyyy-MM-dd'),
      title: holiday.name,
      type: 'holiday',
      description: "Jour férié officiel",
    });
  });

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Calendrier d'Équipe</h2>
      <p className="text-600 dark:text-gray-400 mb-6">
        Visualisez les congés approuvés et les jours fériés pour une meilleure planification.
      </p>
      <Separator className="mb-6" />

      <TeamCalendar events={allEvents} />
    </div>
  );
};

export default LeaveCalendar;