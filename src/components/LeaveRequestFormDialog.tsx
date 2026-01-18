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
  FormDescription, // Added FormDescription here
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const leaveRequestFormSchema = z.object({
  employee_id: z.string().min(1, { message: "Veuillez sélectionner un employé." }),
  type: z.enum(["Annual", "Sick", "Unpaid", "Maternity", "Paternity", "Other"], { required_error: "Le type de congé est requis." }),
  start_date: z.date({ required_error: "Une date de début est requise." }),
  end_date: z.date({ required_error: "Une date de fin est requise." }),
  reason: z.string().optional(),
  status: z.enum(["Submitted", "Approved", "Rejected", "Cancelled"], { required_error: "Le statut est requis." }),
  compensation_applied: z.boolean().default(false).optional(),
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
      });
    }
  }, [leaveRequest, form]);

  const upsertLeaveRequestMutation = useMutation({
    mutationFn: async (values: LeaveRequestFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
      };

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