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
import { TunisianHolidayFormDialog } from "@/components/TunisianHolidayFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const TunisianHolidays = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<any | null>(null);

  const { data: holidays, isLoading, error } = useQuery({
    queryKey: ["tunisian_holidays", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tunisian_holidays")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase
        .from("tunisian_holidays")
        .delete()
        .eq("id", holidayId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jour férié supprimé avec succès !");
      queryClient.invalidateQueries({ queryKey: ["tunisian_holidays", userId] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la suppression du jour férié : " + err.message);
    },
  });

  const handleAddHoliday = () => {
    setSelectedHoliday(null);
    setIsFormDialogOpen(true);
  };

  const handleEditHoliday = (holiday: any) => {
    setSelectedHoliday(holiday);
    setIsFormDialogOpen(true);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    deleteHolidayMutation.mutate(holidayId);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des jours fériés...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur : {error.message}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Jours Fériés Tunisiens</h2>
        <Button onClick={handleAddHoliday}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un jour férié
        </Button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Gérez les jours fériés officiels en Tunisie pour votre équipe.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du jour férié</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Aucun jour férié trouvé. Ajoutez-en un pour commencer !
                </TableCell>
              </TableRow>
            ) : (
              holidays?.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>{format(new Date(holiday.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditHoliday(holiday)}
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
                            Cette action ne peut pas être annulée. Cela supprimera définitivement le jour férié
                            <span className="font-bold"> {holiday.name}</span> du <span className="font-bold">{format(new Date(holiday.date), "dd/MM/yyyy")}</span> de votre base de données.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteHoliday(holiday.id)} className="bg-red-500 hover:bg-red-600">
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

      <TunisianHolidayFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        holiday={selectedHoliday}
      />
    </div>
  );
};

export default TunisianHolidays;