"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
}
from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const employeeFormSchema = z.object({
  first_name: z.string().min(1, { message: "Le prénom est requis." }),
  last_name: z.string().min(1, { message: "Le nom est requis." }),
  cin: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email({ message: "Adresse email invalide." }).optional().or(z.literal('')),
  position: z.string().optional(),
  department: z.string().optional(),
  hire_date: z.string().optional(), // Consider using a date picker for better UX
  base_salary: z.coerce.number().min(0, { message: "Le salaire de base ne peut pas être négatif." }).optional(),
  annual_leave_balance: z.coerce.number().int().min(0, { message: "Le solde de congés ne peut pas être négatif." }).optional(),
  overtime_hours_balance: z.coerce.number().min(0, { message: "Le solde d'heures supplémentaires ne peut pas être négatif." }).optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: any; // Optional employee data for editing
}

export const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onOpenChange,
  employee,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      first_name: employee?.first_name || "",
      last_name: employee?.last_name || "",
      cin: employee?.cin || "",
      contact_number: employee?.contact_number || "",
      email: employee?.email || "",
      position: employee?.position || "",
      department: employee?.department || "",
      hire_date: employee?.hire_date || "",
      base_salary: employee?.base_salary || 0,
      annual_leave_balance: employee?.annual_leave_balance || 20,
      overtime_hours_balance: employee?.overtime_hours_balance || 0,
    },
  });

  React.useEffect(() => {
    if (employee) {
      form.reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        cin: employee.cin || "",
        contact_number: employee.contact_number || "",
        email: employee.email || "",
        position: employee.position || "",
        department: employee.department || "",
        hire_date: employee.hire_date || "",
        base_salary: employee.base_salary || 0,
        annual_leave_balance: employee.annual_leave_balance || 20,
        overtime_hours_balance: employee.overtime_hours_balance || 0,
      });
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        cin: "",
        contact_number: "",
        email: "",
        position: "",
        department: "",
        hire_date: "",
        base_salary: 0,
        annual_leave_balance: 20,
        overtime_hours_balance: 0,
      });
    }
  }, [employee, form]);

  const upsertEmployeeMutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        base_salary: values.base_salary !== undefined ? values.base_salary : 0,
        annual_leave_balance: values.annual_leave_balance !== undefined ? values.annual_leave_balance : 20,
        overtime_hours_balance: values.overtime_hours_balance !== undefined ? values.overtime_hours_balance : 0,
      };

      if (employee?.id) {
        const { data, error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", employee.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("employees")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(employee ? "Employé mis à jour avec succès !" : "Employé ajouté avec succès !");
      queryClient.invalidateQueries({ queryKey: ["employees", userId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de l'employé : " + error.message);
    },
  });

  const onSubmit = (values: EmployeeFormValues) => {
    upsertEmployeeMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{employee ? "Modifier l'employé" : "Ajouter un nouvel employé"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIN</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de contact</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poste</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Département</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hire_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'embauche</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="base_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salaire de base</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="annual_leave_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solde congés annuels</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overtime_hours_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solde heures supplémentaires</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={upsertEmployeeMutation.isPending}>
                {upsertEmployeeMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};