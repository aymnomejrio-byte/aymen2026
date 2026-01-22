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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { format, differenceInCalendarDays, isBefore } from "date-fns"; // Import isBefore
import { cn } from "@/lib/utils"; // Import cn

// Helper to calculate calendar days inclusive
const calculateCalendarDays = (startDate: Date, endDate: Date): number => {
  if (!startDate || !endDate || isBefore(endDate, startDate)) return 0;
  return differenceInCalendarDays(endDate, startDate) + 1; // +1 to include both start and end day
};

const leaveRequestFormSchema = z.object({
  employee_id: z.string().min(1, { message: "Veuillez sélectionner un employé." }),
  type: z.enum(["Annual", "Sick", "Unpaid", "Maternity", "Paternity", "Other"], { required_error: "Le type de congé est requis." }),
  start_date: z.date({ required_error: "Une date de début est requise." }),
  end_date: z.date({ required_error: "Une date de fin est requise." }),
  reason: z.string().optional(),
  status: z.enum(["Submitted", "Approved", "Rejected", "Cancelled"], { required_error: "Le statut est requis." }),
  compensation_applied: z.boolean().default(false).optional(),
  days_deducted: z.coerce.number().int().min(0).optional(), // Added for tracking
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;

interface LeaveRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveRequest?: any; // Optional leave request data for editing
}

export const LeaveRequestFormDialog: React.FC<LeaveRequestFormDialogProps> = ({
  open,
  onOpenChange,
  leaveRequest,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      employee_id: leaveRequest?.employee_id || "",
      type: leaveRequest?.type || "Annual",
      start_date: leaveRequest?.start_date ? new Date(leaveRequest.start_date) : new Date(),
      end_date: leaveRequest?.end_date ? new Date(leaveRequest.end_date) : new Date(),
      reason: leaveRequest?.reason || "",
      status: leaveRequest?.status || "Submitted",
      compensation_applied: leaveRequest?.compensation_applied || false,
      days_deducted: leaveRequest?.days_deducted || 0,
    },
  });

  // Fetch employees for the dropdown
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, annual_leave_balance")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (leaveRequest) {
      form.reset({
        employee_id: leaveRequest.employee_id,
        type: leaveRequest.type,
        start_date: new Date(leaveRequest.start_date),
        end_date: new Date(leaveRequest.end_date),
        reason: leaveRequest.reason || "",
        status: leaveRequest.status,
        compensation_applied: leaveRequest.compensation_applied || false,
        days_deducted: leaveRequest.days_deducted || 0,
      });
    } else {
      form.reset({
        employee_id: "",
        type: "Annual",
        start_date: new Date(),
        end_date: new Date(),
        reason: "",
        status: "Submitted",
        compensation_applied: false,
        days_deducted: 0,
      });
    }
  }, [leaveRequest, form]);

  const upsertLeaveRequestMutation = useMutation({
    mutationFn: async (values: LeaveRequestFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const newStartDate = values.start_date;
      const newEndDate = values.end_date;
      const newStatus = values.status;
      const newType = values.type;
      const newEmployeeId = values.employee_id;

      let oldLeaveRequest: any = null;
      let oldEmployeeAnnualLeaveBalance = 0;
      let oldDaysDeducted = 0;

      // 1. Fetch original leave request and employee balance if editing
      if (leaveRequest?.id) {
        const { data: originalRequest, error: fetchOriginalError } = await supabase
          .from("leave_requests")
          .select("status, type, days_deducted, employee_id")
          .eq("id", leaveRequest.id)
          .single();
        if (fetchOriginalError) throw fetchOriginalError;
        oldLeaveRequest = originalRequest;
        oldDaysDeducted = originalRequest.days_deducted || 0;
      }

      const { data: employeeData, error: fetchEmployeeError } = await supabase
        .from("employees")
        .select("annual_leave_balance")
        .eq("id", newEmployeeId)
        .eq("user_id", userId)
        .single();
      if (fetchEmployeeError) throw fetchEmployeeError;
      oldEmployeeAnnualLeaveBalance = employeeData.annual_leave_balance || 0;

      // 2. Calculate new days to deduct for the leave request
      const newCalculatedDaysForLeave = (newType === "Annual" && newStatus === "Approved")
        ? calculateCalendarDays(newStartDate, newEndDate)
        : 0;

      let balanceAdjustment = 0;

      // 3. Determine balance adjustment for the employee
      if (leaveRequest?.id) { // Editing existing request
        const wasApprovedAnnual = oldLeaveRequest.status === "Approved" && oldLeaveRequest.type === "Annual";
        const isApprovedAnnual = newStatus === "Approved" && newType === "Annual";

        if (wasApprovedAnnual && !isApprovedAnnual) {
          // Was approved annual, now it's not (rejected, cancelled, submitted, or type changed) -> credit back original deduction
          balanceAdjustment += oldDaysDeducted;
        } else if (!wasApprovedAnnual && isApprovedAnnual) {
          // Was not approved annual, now it is -> deduct new amount
          balanceAdjustment -= newCalculatedDaysForLeave;
        } else if (wasApprovedAnnual && isApprovedAnnual) {
          // Was approved annual, still approved annual -> adjust for date/days changes
          if (oldDaysDeducted !== newCalculatedDaysForLeave) {
            balanceAdjustment += oldDaysDeducted; // Credit back old
            balanceAdjustment -= newCalculatedDaysForLeave; // Deduct new
          }
        }
      } else { // New request
        if (newStatus === "Approved" && newType === "Annual") {
          balanceAdjustment -= newCalculatedDaysForLeave;
        }
      }

      // 4. Update employee balance if needed
      if (balanceAdjustment !== 0) {
        const updatedBalance = oldEmployeeAnnualLeaveBalance + balanceAdjustment;
        if (updatedBalance < 0) {
          throw new Error("Solde de congés annuels insuffisant pour cette opération.");
        }
        const { error: updateBalanceError } = await supabase
          .from("employees")
          .update({ annual_leave_balance: updatedBalance })
          .eq("id", newEmployeeId)
          .eq("user_id", userId);
        if (updateBalanceError) throw updateBalanceError;
      }

      // 5. Prepare payload for leave_requests upsert
      const payload = {
        ...values,
        user_id: userId,
        start_date: format(newStartDate, "yyyy-MM-dd"),
        end_date: format(newEndDate, "yyyy-MM-dd"),
        days_deducted: newCalculatedDaysForLeave, // Store the actual days deducted for this request
      };

      // 6. Perform leave_requests upsert
      if (leaveRequest?.id) {
        const { data, error } = await supabase
          .from("leave_requests")
          .update(payload)
          .eq("id", leaveRequest.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("leave_requests")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(leaveRequest ? "Demande de congé mise à jour avec succès !" : "Demande de congé ajoutée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["leave_requests", userId] });
      queryClient.invalidateQueries({ queryKey: ["employees", userId] }); // Invalidate employees query to reflect balance change
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de la demande de congé : " + error.message);
    },
  });

  const onSubmit = (values: LeaveRequestFormValues) => {
    upsertLeaveRequestMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{leaveRequest ? "Modifier la demande de congé" : "Ajouter une demande de congé"}</DialogTitle>
          <DialogDescription>
            {leaveRequest ? "Modifiez les détails de la demande de congé existante." : "Remplissez les informations pour créer une nouvelle demande de congé."}
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
                            {emp.first_name} {emp.last_name} (Solde: {emp.annual_leave_balance} jours)
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de congé</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Annual">Annuel</SelectItem>
                      <SelectItem value="Sick">Maladie</SelectItem>
                      <SelectItem value="Unpaid">Sans solde</SelectItem>
                      <SelectItem value="Maternity">Maternité</SelectItem>
                      <SelectItem value="Paternity">Paternité</SelectItem>
                      <SelectItem value="Other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début</FormLabel>
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
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de fin</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="Submitted">Soumise</SelectItem>
                      <SelectItem value="Approved">Approuvée</SelectItem>
                      <SelectItem value="Rejected">Rejetée</SelectItem>
                      <SelectItem value="Cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="compensation_applied"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Compensation appliquée
                    </FormLabel>
                    <FormDescription>
                      Indique si ce congé est compensé (ex: jours de récupération).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={upsertLeaveRequestMutation.isPending}>
                {upsertLeaveRequestMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};