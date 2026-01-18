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
import { AttendanceFormDialog } from "@/components/AttendanceFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const Attendance = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any | null>(null);

  const { data: attendanceRecords, isLoading, error } = useQuery({
    queryKey: ["attendance", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("attendance")
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

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enregistrement de présence supprimé avec succès !");
      queryClient.invalidateQueries({ queryKey: ["attendance", userId] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la suppression de l'enregistrement : " + err.message);
    },
  });

  const handleAddAttendance = () => {
    setSelectedAttendance(null);
    setIsFormDialogOpen(true);
  };

  const handleEditAttendance = (record: any) => {
    setSelectedAttendance(record);
    setIsFormDialogOpen(true);
  };

  const handleDeleteAttendance = (attendanceId: string) => {
    deleteAttendanceMutation.mutate(attendanceId);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des enregistrements de présence...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur : {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Présences</h2>
        <Button onClick={handleAddAttendance}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une présence
        </Button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Enregistrez et suivez les présences de vos employés.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Départ</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Heures travaillées</TableHead>
              <TableHead>Retard (min)</TableHead>
              <TableHead>Heures supp.</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceRecords?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Aucun enregistrement de présence trouvé. Ajoutez-en un pour commencer !
                </TableCell>
              </TableRow>
            ) : (
              attendanceRecords?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employees?.first_name} {record.employees?.last_name}
                  </TableCell>
                  <TableCell>{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{record.check_in_time ? record.check_in_time.substring(0, 5) : '-'}</TableCell>
                  <TableCell>{record.check_out_time ? record.check_out_time.substring(0, 5) : '-'}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.worked_hours}</TableCell>
                  <TableCell>{record.late_minutes}</TableCell>
                  <TableCell>{record.overtime_hours}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditAttendance(record)}
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
                            Cette action ne peut pas être annulée. Cela supprimera définitivement l'enregistrement de présence pour
                            <span className="font-bold"> {record.employees?.first_name} {record.employees?.last_name}</span> le <span className="font-bold">{format(new Date(record.date), "dd/MM/yyyy")}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAttendance(record.id)} className="bg-red-500 hover:bg-red-600">
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

      <AttendanceFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        attendance={selectedAttendance}
      />
    </div>
  );
};

export default Attendance;