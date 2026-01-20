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
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { OvertimeCompensationFormDialog } from "@/components/OvertimeCompensationFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const OvertimeCompensations = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedCompensation, setSelectedCompensation] = useState<any | null>(null);

  const { data: compensations, isLoading, error } = useQuery({
    queryKey: ["overtime_compensations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("overtime_compensations")
        .select(`
          *,
          employees (first_name, last_name)
        `)
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deleteCompensationMutation = useMutation({
    mutationFn: async (compensationId: string) => {
      // First, get the compensation details to revert the employee's balance
      const { data: oldCompensationData, error: oldCompensationError } = await supabase
        .from("overtime_compensations")
        .select("employee_id, compensated_hours")
        .eq("id", compensationId)
        .single();

      if (oldCompensationError) throw oldCompensationError;

      const { employee_id, compensated_hours } = oldCompensationData;

      // Delete the compensation record
      const { error: deleteError } = await supabase
        .from("overtime_compensations")
        .delete()
        .eq("id", compensationId);
      if (deleteError) throw deleteError;

      // Revert employee's overtime_hours_balance
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("overtime_hours_balance")
        .eq("id", employee_id)
        .single();

      if (employeeError) throw employeeError;

      const newBalance = employeeData.overtime_hours_balance + compensated_hours;

      const { error: updateError } = await supabase
        .from("employees")
        .update({ overtime_hours_balance: newBalance })
        .eq("id", employee_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Compensation supprimée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["overtime_compensations", userId] });
      queryClient.invalidateQueries({ queryKey: ["employees", userId] }); // Invalidate employees to reflect balance change
    },
    onError: (err) => {
      toast.error("Erreur lors de la suppression de la compensation : " + err.message);
    },
  });

  const handleAddCompensation = () => {
    setSelectedCompensation(null);
    setIsFormDialogOpen(true);
  };

  const handleEditCompensation = (compensation: any) => {
    setSelectedCompensation(compensation);
    setIsFormDialogOpen(true);
  };

  const handleDeleteCompensation = (compensationId: string) => {
    deleteCompensationMutation.mutate(compensationId);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des compensations...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur : {error.message}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compensations d'Heures Supplémentaires</h2>
        <Button onClick={handleAddCompensation}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une compensation
        </Button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Gérez les enregistrements de compensation pour les heures supplémentaires de vos employés.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Heures compensées</TableHead>
              <TableHead>Raison</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compensations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Aucune compensation d'heures supplémentaires trouvée.
                </TableCell>
              </TableRow>
            ) : (
              compensations?.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">
                    {comp.employees?.first_name} {comp.employees?.last_name}
                  </TableCell>
                  <TableCell>{format(new Date(comp.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{comp.compensated_hours?.toFixed(2)}</TableCell>
                  <TableCell>{comp.reason || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCompensation(comp)}
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
                            Cette action ne peut pas être annulée. Cela supprimera définitivement la compensation de
                            <span className="font-bold"> {comp.compensated_hours?.toFixed(2)} heures</span> pour <span className="font-bold">{comp.employees?.first_name} {comp.employees?.last_name}</span> le <span className="font-bold">{format(new Date(comp.date), "dd/MM/yyyy")}</span> et réajustera le solde de l'employé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCompensation(comp.id)} className="bg-red-500 hover:bg-red-600">
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

      <OvertimeCompensationFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        compensation={selectedCompensation}
      />
    </div>
  );
};

export default OvertimeCompensations;