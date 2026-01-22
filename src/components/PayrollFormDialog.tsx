"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form"; // Corrected import path
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateNetPay, getAutomatedOvertimePay } from "@/utils/payrollCalculations"; // Import the new utility

const payrollFormSchema = z.object({
  employee_id: z.string().min(1, { message: "Veuillez sélectionner un employé." }),
  month: z.coerce.number().min(1).max(12, { message: "Le mois doit être entre 1 et 12." }),
  year: z.coerce.number().min(2000, { message: "L'année doit être valide." }),
  base_salary: z.coerce.number().min(0, { message: "Le salaire de base ne peut pas être négatif." }),
  overtime_pay: z.coerce.number().min(0, { message: "La paie des heures supplémentaires ne peut pas être négative." }).optional(),
  deductions: z.coerce.number().min(0, { message: "Les déductions ne peuvent pas être négatives." }).optional(),
  net_pay: z.coerce.number().min(0, { message: "Le salaire net ne peut pas être négatif." }),
  pdf_url: z.string().url({ message: "URL PDF invalide." }).optional().or(z.literal('')),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

interface PayrollFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll?: any; // Optional payroll data for editing
}

export const PayrollFormDialog: React.FC<PayrollFormDialogProps> = ({
  open,
  onOpenChange,
  payroll,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employee_id: payroll?.employee_id || "",
      month: payroll?.month || new Date().getMonth() + 1,
      year: payroll?.year || new Date().getFullYear(),
      base_salary: payroll?.base_salary || 0,
      overtime_pay: payroll?.overtime_pay || 0, // This will be overridden by automated calculation
      deductions: payroll?.deductions || 0,
      net_pay: payroll?.net_pay || 0,
      pdf_url: payroll?.pdf_url || "",
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

  // Watch form fields for automated overtime calculation
  const watchedEmployeeId = form.watch("employee_id");
  const watchedMonth = form.watch("month");
  const watchedYear = form.watch("year");

  const { data: automatedOvertimePay, isLoading: isLoadingAutomatedOvertimePay } = useQuery({
    queryKey: ["automated_overtime_pay", watchedEmployeeId, watchedMonth, watchedYear, userId],
    queryFn: () => getAutomatedOvertimePay(watchedEmployeeId, watchedMonth, watchedYear, userId!),
    enabled: !!watchedEmployeeId && !!userId && !payroll?.id, // Only enable for new payroll records or if explicitly requested
    initialData: 0, // Provide an initial value to avoid undefined
  });

  useEffect(() => {
    if (payroll) {
      form.reset({
        employee_id: payroll.employee_id,
        month: payroll.month,
        year: payroll.year,
        base_salary: payroll.base_salary,
        overtime_pay: payroll.overtime_pay || 0,
        deductions: payroll.deductions || 0,
        net_pay: payroll.net_pay,
        pdf_url: payroll.pdf_url || "",
      });
    } else {
      form.reset({
        employee_id: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        base_salary: 0,
        overtime_pay: 0, // Reset to 0 for new forms, will be updated by query
        deductions: 0,
        net_pay: 0,
        pdf_url: "",
      });
    }
  }, [payroll, form]);

  // Effect to update overtime_pay when automatedOvertimePay changes (for new records)
  useEffect(() => {
    if (!payroll?.id && automatedOvertimePay !== undefined) { // Only for new records
      form.setValue("overtime_pay", automatedOvertimePay);
    }
  }, [automatedOvertimePay, form, payroll?.id]);


  // Effect to calculate net pay automatically
  useEffect(() => {
    const baseSalary = form.watch("base_salary") || 0;
    const overtimePay = form.watch("overtime_pay") || 0; // Use the watched value, which might be automated or manual
    const deductions = form.watch("deductions") || 0;

    const { netPay } = calculateNetPay({ baseSalary, overtimePay, deductions });
    form.setValue("net_pay", netPay);
  }, [form, form.watch("base_salary"), form.watch("overtime_pay"), form.watch("deductions")]);

  const upsertPayrollMutation = useMutation({
    mutationFn: async (values: PayrollFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        overtime_pay: values.overtime_pay !== undefined ? values.overtime_pay : 0,
        deductions: values.deductions !== undefined ? values.deductions : 0,
      };

      if (payroll?.id) {
        const { data, error } = await supabase
          .from("payroll")
          .update(payload)
          .eq("id", payroll.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("payroll")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(payroll ? "Fiche de paie mise à jour avec succès !" : "Fiche de paie ajoutée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["payroll", userId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de la fiche de paie : " + error.message);
    },
  });

  const onSubmit = (values: PayrollFormValues) => {
    upsertPayrollMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{payroll ? "Modifier la fiche de paie" : "Ajouter une fiche de paie"}</DialogTitle>
          <DialogDescription>
            {payroll ? "Modifiez les détails de la fiche de paie existante." : "Remplissez les informations pour créer une nouvelle fiche de paie."}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mois</FormLabel>
                    <Select onValueChange={field.onChange} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un mois" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(0, i).toLocaleString('fr-FR', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              name="overtime_pay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paie heures supplémentaires</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} disabled={!payroll?.id && isLoadingAutomatedOvertimePay} /> {/* Disable for new records while loading */}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deductions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Déductions</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="net_pay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salaire net</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pdf_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL du PDF de la fiche de paie</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={upsertPayrollMutation.isPending}>
                {upsertPayrollMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};