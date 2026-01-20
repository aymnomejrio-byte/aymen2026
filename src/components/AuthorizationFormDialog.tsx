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
  FormDescription,
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

const authorizationFormSchema = z.object({
  employee_id: z.string().min(1, { message: "Veuillez sélectionner un employé." }),
  type: z.enum(["Late Arrival", "Early Departure", "Other"], { required_error: "Le type d'autorisation est requis." }),
  date: z.date({ required_error: "Une date est requise." }),
  requested_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }).optional().or(z.literal('')),
  reason: z.string().optional(),
  status: z.enum(["Submitted", "Approved", "Rejected"], { required_error: "Le statut est requis." }),
});

type AuthorizationFormValues = z.infer<typeof authorizationFormSchema>;

interface AuthorizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorization?: any; // Optional authorization data for editing
}

export const AuthorizationFormDialog: React.FC<AuthorizationFormDialogProps> = ({
  open,
  onOpenChange,
  authorization,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<AuthorizationFormValues>({
    resolver: zodResolver(authorizationFormSchema),
    defaultValues: {
      employee_id: authorization?.employee_id || "",
      type: authorization?.type || "Late Arrival",
      date: authorization?.date ? new Date(authorization.date) : new Date(),
      requested_time: authorization?.requested_time?.substring(0, 5) || "",
      reason: authorization?.reason || "",
      status: authorization?.status || "Submitted",
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
    if (authorization) {
      form.reset({
        employee_id: authorization.employee_id,
        type: authorization.type,
        date: new Date(authorization.date),
        requested_time: authorization.requested_time?.substring(0, 5) || "",
        reason: authorization.reason || "",
        status: authorization.status,
      });
    } else {
      form.reset({
        employee_id: "",
        type: "Late Arrival",
        date: new Date(),
        requested_time: "",
        reason: "",
        status: "Submitted",
      });
    }
  }, [authorization, form]);

  const upsertAuthorizationMutation = useMutation({
    mutationFn: async (values: AuthorizationFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        date: format(values.date, "yyyy-MM-dd"),
        requested_time: values.requested_time || null,
      };

      if (authorization?.id) {
        const { data, error } = await supabase
          .from("authorizations")
          .update(payload)
          .eq("id", authorization.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("authorizations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(authorization ? "Autorisation mise à jour avec succès !" : "Autorisation ajoutée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["authorizations", userId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de l'autorisation : " + error.message);
    },
  });

  const onSubmit = (values: AuthorizationFormValues) => {
    upsertAuthorizationMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{authorization ? "Modifier l'autorisation" : "Ajouter une autorisation spéciale"}</DialogTitle>
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
                  <FormLabel>Type d'autorisation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Late Arrival">Arrivée tardive</SelectItem>
                      <SelectItem value="Early Departure">Départ anticipé</SelectItem>
                      <SelectItem value="Other">Autre</SelectItem>
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

            <FormField
              control={form.control}
              name="requested_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure demandée</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>
                    L'heure d'arrivée souhaitée (pour arrivée tardive) ou de départ (pour départ anticipé).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={upsertAuthorizationMutation.isPending}>
                {upsertAuthorizationMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};