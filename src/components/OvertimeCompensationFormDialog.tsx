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

const overtimeCompensationFormSchema = z.object({
  employee_id: z.string().min(1, { message: "Veuillez sélectionner un employé." }),
  date: z.date({ required_error: "Une date est requise." }),
  compensated_hours: z.coerce.number().min(0.01, { message: "Les heures compensées doivent être supérieures à 0." }),
  reason: z.string().optional(),
});

type OvertimeCompensationFormValues = z.infer<typeof overtimeCompensationFormSchema>;

interface OvertimeCompensationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compensation?: any; // Optional compensation data for editing
}

export const OvertimeCompensationFormDialog: React.FC<OvertimeCompensationFormDialogProps> = ({
  open,
  onOpenChange,
  compensation,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<OvertimeCompensationFormValues>({
    resolver: zodResolver(overtimeCompensationFormSchema),
    defaultValues: {
      employee_id: compensation?.employee_id || "",
      date: compensation?.date ? new Date(compensation.date) : new Date(),
      compensated_hours: compensation?.compensated_hours || 0,
      reason: compensation?.reason || "",
    },
  });

  // Fetch employees for the dropdown
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, overtime_hours_balance")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (compensation) {
      form.reset({
        employee_id: compensation.employee_id,
        date: new Date(compensation.date),
        compensated_hours: compensation.compensated_hours,
        reason: compensation.reason || "",
      });
    } else {
      form.reset({
        employee_id: "",
        date: new Date(),
        compensated_hours: 0,
        reason: "",
      });
    }
  }, [compensation, form]);

  const upsertOvertimeCompensationMutation = useMutation({
    mutationFn: async (values: OvertimeCompensationFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        date: format(values.date, "yyyy-MM-dd"),
      };

      let oldCompensatedHours = 0;
      if (compensation?.id) {
        // If editing, get the old compensated_hours to adjust the balance correctly
        const { data: oldCompensationData, error: oldCompensationError } = await supabase
          .from("overtime_compensations")
          .select("compensated_hours")
          .eq("id", compensation.id)
          .single();
        if (oldCompensationError) throw oldCompensationError;
        oldCompensatedHours = oldCompensationData?.compensated_hours || 0;

        const { data, error } = await supabase
          .from("overtime_compensations")
          .update(payload)
          .eq("id", compensation.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("overtime_compensations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: async (data, variables) => {
      toast.success(compensation ? "Compensation mise à jour avec succès !" : "Compensation ajoutée avec succès !");

      // Update employee's overtime_hours_balance
      const employeeId = variables.employee_id;
      const compensatedHours = variables.compensated_hours;

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("overtime_hours_balance")
        .eq("id", employeeId)
        .single();

      if (employeeError) {
        toast.error("Erreur lors de la récupération du solde d'heures supplémentaires de l'employé : " + employeeError.message);
        return;
      }

      let newBalance = employeeData.overtime_hours_balance;
      if (compensation?.id) {
        // If editing, first revert the old compensation, then apply the new one
        const { data: oldCompensationData, error: oldCompensationError } = await supabase
          .from("overtime_compensations")
          .select("compensated_hours")
          .eq("id", compensation.id)
          .single();
        if (oldCompensationError) {
          toast.error("Erreur lors de la récupération de l'ancienne compensation : " + oldCompensationError.message);
          return;
        }
        const oldCompensatedHours = oldCompensationData?.compensated_hours || 0;
        newBalance = newBalance + oldCompensatedHours - compensatedHours;
      } else {
        // If new compensation, simply subtract
        newBalance -= compensatedHours;
      }

      const { error: updateError } = await supabase
        .from("employees")
        .update({ overtime_hours_balance: newBalance })
        .eq("id", employeeId);

      if (updateError) {
        toast.error("Erreur lors de la mise à jour du solde d'heures supplémentaires de l'employé : " + updateError.message);
      } else {
        queryClient.invalidateQueries({ queryKey: ["employees", userId] });
        queryClient.invalidateQueries({ queryKey: ["overtime_compensations", userId] });
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de la compensation : " + error.message);
    },
  });

  const onSubmit = (values: OvertimeCompensationFormValues) => {
    // Optional: Add a check here if compensated_hours exceeds available overtime_hours_balance
    // This would require fetching the employee's current balance before mutation
    upsertOvertimeCompensationMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{compensation ? "Modifier la compensation" : "Ajouter une compensation d'heures supplémentaires"}</DialogTitle>
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
                            {emp.first_name} {emp.last_name} (Solde HS: {emp.overtime_hours_balance?.toFixed(2) || 0})
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
                  <FormLabel>Date de compensation</FormLabel>
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
              name="compensated_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures compensées</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={upsertOvertimeCompensationMutation.isPending}>
                {upsertOvertimeCompensationMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};