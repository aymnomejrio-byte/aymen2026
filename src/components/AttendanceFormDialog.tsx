"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { calculateAttendanceMetrics } from "@/utils/attendanceCalculations"; // Import the utility
import { DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription

const attendanceFormSchema = z.object({
  employee_id: z.string().min(1, { message: "Veuillez sélectionner un employé." }),
  date: z.date({ required_error: "Une date est requise." }),
  check_in_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }).optional().or(z.literal('')),
  check_out_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }).optional().or(z.literal('')),
  status: z.enum(["Present", "Absent", "Leave", "Holiday"], { required_error: "Le statut est requis." }),
  notes: z.string().optional(),
  worked_hours: z.coerce.number().min(0).optional(),
  late_minutes: z.coerce.number().int().min(0).optional(),
  overtime_hours: z.coerce.number().min(0).optional(),
});

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

interface AttendanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance?: any; // Optional attendance data for editing
}

export const AttendanceFormDialog: React.FC<AttendanceFormDialogProps> = ({
  open,
  onOpenChange,
  attendance,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      employee_id: attendance?.employee_id || "",
      date: attendance?.date ? new Date(attendance.date) : new Date(),
      check_in_time: attendance?.check_in_time?.substring(0, 5) || "",
      check_out_time: attendance?.check_out_time?.substring(0, 5) || "",
      status: attendance?.status || "Absent",
      notes: attendance?.notes || "",
      worked_hours: attendance?.worked_hours || 0,
      late_minutes: attendance?.late_minutes || 0,
      overtime_hours: attendance?.overtime_hours || 0,
    },
  });

  // Fetch employees for the dropdown
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch app settings for calculations
  const { data: appSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["app_settings", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (attendance) {
      form.reset({
        employee_id: attendance.employee_id,
        date: new Date(attendance.date),
        check_in_time: attendance.check_in_time?.substring(0, 5) || "",
        check_out_time: attendance.check_out_time?.substring(0, 5) || "",
        status: attendance.status,
        notes: attendance.notes || "",
        worked_hours: attendance.worked_hours || 0,
        late_minutes: attendance.late_minutes || 0,
        overtime_hours: attendance.overtime_hours || 0,
      });
    } else {
      form.reset({
        employee_id: "",
        date: new Date(),
        check_in_time: "",
        check_out_time: "",
        status: "Absent",
        notes: "",
        worked_hours: 0,
        late_minutes: 0,
        overtime_hours: 0,
      });
    }
  }, [attendance, form]);

  // Effect to calculate attendance metrics automatically
  useEffect(() => {
    const checkInTime = form.watch("check_in_time");
    const checkOutTime = form.watch("check_out_time");
    const status = form.watch("status");

    if (status === "Present" && checkInTime && checkOutTime && appSettings) {
      const { workedHours, lateMinutes, overtimeHours } = calculateAttendanceMetrics(
        { checkInTime, checkOutTime },
        appSettings
      );
      form.setValue("worked_hours", workedHours);
      form.setValue("late_minutes", lateMinutes);
      form.setValue("overtime_hours", overtimeHours);
    } else {
      // Reset calculated fields if not 'Present' or times are missing
      form.setValue("worked_hours", 0);
      form.setValue("late_minutes", 0);
      form.setValue("overtime_hours", 0);
    }
  }, [form, form.watch("check_in_time"), form.watch("check_out_time"), form.watch("status"), appSettings]);


  const upsertAttendanceMutation = useMutation({
    mutationFn: async (values: AttendanceFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        date: format(values.date, "yyyy-MM-dd"),
        check_in_time: values.check_in_time || null,
        check_out_time: values.check_out_time || null,
        worked_hours: values.worked_hours || 0,
        late_minutes: values.late_minutes || 0,
        overtime_hours: values.overtime_hours || 0,
      };

      if (attendance?.id) {
        const { data, error } = await supabase
          .from("attendance")
          .update(payload)
          .eq("id", attendance.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("attendance")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(attendance ? "Enregistrement de présence mis à jour avec succès !" : "Enregistrement de présence ajouté avec succès !");
      queryClient.invalidateQueries({ queryKey: ["attendance", userId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de présence : " + error.message);
    },
  });

  const onSubmit = (values: AttendanceFormValues) => {
    upsertAttendanceMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{attendance ? "Modifier la présence" : "Ajouter une présence"}</DialogTitle>
          <DialogDescription>
            {attendance ? "Modifiez les détails de l'enregistrement de présence." : "Remplissez les informations pour ajouter un nouvel enregistrement de présence."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employé</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un employé" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingEmployees ? (
                        <SelectItem value="loading" disabled>Chargement des employés...</SelectItem>
                      ) : (
                        employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Choisir une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="check_in_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure d'arrivée</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="check_out_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de départ</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Present">Présent</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Leave">Congé</SelectItem>
                      <SelectItem value="Holiday">Jour Férié</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="worked_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heures travaillées</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="late_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes de retard</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overtime_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heures supp.</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={upsertAttendanceMutation.isPending}>
                {upsertAttendanceMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};