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
import { LeaveRequestFormDialog } from "@/components/LeaveRequestFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { LeaveRequestTableSkeleton } from "@/components/LeaveRequestTableSkeleton"; // Import the new skeleton component

const LeaveRequests = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<any | null>(null);

  const { data: leaveRequests, isLoading, error } = useQuery({
    queryKey: ["leave_requests", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employees (first_name, last_name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deleteLeaveRequestMutation = useMutation({
    mutationFn: async (leaveRequestId: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", leaveRequestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande de congé supprimée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["leave_requests", userId] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la suppression de la demande de congé : " + err.message);
    },
  });

  const handleAddLeaveRequest = () => {
    setSelectedLeaveRequest(null);
    setIsFormDialogOpen(true);
  };

  const handleEditLeaveRequest = (request: any) => {
    setSelectedLeaveRequest(request);
    setIsFormDialogOpen(true);
  };

  const handleDeleteLeaveRequest = (leaveRequestId: string) => {
    deleteLeaveRequestMutation.mutate(leaveRequestId);
  };

  if (isLoading) {
    return <LeaveRequestTableSkeleton />; // Render skeleton while loading
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur : {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Demandes de Congé</h2>
        <Button onClick={handleAddLeaveRequest}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle demande
        </Button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Gérez les demandes de congé de vos employés.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Compensé</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveRequests?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Aucune demande de congé trouvée.
                </TableCell>
              </TableRow>
            ) : (
              leaveRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.employees?.first_name} {request.employees?.last_name}
                  </TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell>{format(new Date(request.start_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{format(new Date(request.end_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell>{request.compensation_applied ? "Oui" : "Non"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditLeaveRequest(request)}
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
                            Cette action ne peut pas être annulée. Cela supprimera définitivement la demande de congé pour
                            <span className="font-bold"> {request.employees?.first_name} {request.employees?.last_name}</span> du <span className="font-bold">{format(new Date(request.start_date), "dd/MM/yyyy")}</span> au <span className="font-bold">{format(new Date(request.end_date), "dd/MM/yyyy")}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteLeaveRequest(request.id)} className="bg-red-500 hover:bg-red-600">
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

      <LeaveRequestFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        leaveRequest={selectedLeaveRequest}
      />
    </div>
  );
};

export default LeaveRequests;