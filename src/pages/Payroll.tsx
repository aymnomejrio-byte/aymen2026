"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, FileText } from "lucide-react";
import { PayrollFormDialog } from "@/components/PayrollFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Payroll = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);

  const { data: payrollRecords, isLoading, error } = useQuery({
    queryKey: ["payroll", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("payroll")
        .select(`
          *,
          employees (first_name, last_name)
        `)
        .eq("user_id", userId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deletePayrollMutation = useMutation({
    mutationFn: async (payrollId: string) => {
      const { error } = await supabase
        .from("payroll")
        .delete()
        .eq("id", payrollId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fiche de paie supprimée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["payroll", userId] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la suppression de la fiche de paie : " + err.message);
    },
  });

  const handleAddPayroll = () => {
    setSelectedPayroll(null);
    setIsFormDialogOpen(true);
  };

  const handleEditPayroll = (record: any) => {
    setSelectedPayroll(record);
    setIsFormDialogOpen(true);
  };

  const handleDeletePayroll = (payrollId: string) => {
    deletePayrollMutation.mutate(payrollId);
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('fr-FR', { month: 'long' });
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des fiches de paie...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur : {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion de la Paie</h2>
        <Button onClick={handleAddPayroll}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une fiche de paie
        </Button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Gérez les enregistrements de paie de vos employés.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Mois/Année</TableHead>
              <TableHead>Salaire de base</TableHead>
              <TableHead>Heures supp.</TableHead>
              <TableHead>Déductions</TableHead>
              <TableHead>Salaire net</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollRecords?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Aucune fiche de paie trouvée.
                </TableCell>
              </TableRow>
            ) : (
              payrollRecords?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employees?.first_name} {record.employees?.last_name}
                  </TableCell>
                  <TableCell>{getMonthName(record.month)} {record.year}</TableCell>
                  <TableCell>{record.base_salary?.toFixed(2)} TND</TableCell>
                  <TableCell>{record.overtime_pay?.toFixed(2)} TND</TableCell>
                  <TableCell>{record.deductions?.toFixed(2)} TND</TableCell>
                  <TableCell className="font-bold">{record.net_pay?.toFixed(2)} TND</TableCell>
                  <TableCell className="text-right">
                    {record.pdf_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(record.pdf_url, '_blank')}
                        className="mr-2"
                        title="Voir PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPayroll(record)}
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action ne peut pas être annulée. Cela supprimera définitivement la fiche de paie pour
                            <span className="font-bold"> {record.employees?.first_name} {record.employees?.last_name}</span> pour <span className="font-bold">{getMonthName(record.month)} {record.year}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePayroll(record.id)} className="bg-red-500 hover:bg-red-600">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PayrollFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        payroll={selectedPayroll}
      />
    </div>
  );
};

export default Payroll;