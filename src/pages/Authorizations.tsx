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
import { AuthorizationFormDialog } from "@/components/AuthorizationFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { AuthorizationTableSkeleton } from "@/components/AuthorizationTableSkeleton"; // Import the new skeleton component

const Authorizations = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedAuthorization, setSelectedAuthorization] = useState<any | null>(null);

  const { data: authorizations, isLoading, error } = useQuery({
    queryKey: ["authorizations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("authorizations")
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

  const deleteAuthorizationMutation = useMutation({
    mutationFn: async (authorizationId: string) => {
      const { error } = await supabase
        .from("authorizations")
        .delete()
        .eq("id", authorizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorisation supprimée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["authorizations", userId] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la suppression de l'autorisation : " + err.message);
    },
  });

  const handleAddAuthorization = () => {
    setSelectedAuthorization(null);
    setIsFormDialogOpen(true);
  };

  const handleEditAuthorization = (auth: any) => {
    setSelectedAuthorization(auth);
    setIsFormDialogOpen(true);
  };

  const handleDeleteAuthorization = (authorizationId: string) => {
    deleteAuthorizationMutation.mutate(authorizationId);
  };

  if (isLoading) {
    return <AuthorizationTableSkeleton />; // Render skeleton while loading
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur : {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Autorisations Spéciales</h2>
        <Button onClick={handleAddAuthorization}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle autorisation
        </Button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Gérez les demandes d'arrivées tardives, de départs anticipés et autres autorisations.
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Heure demandée</TableHead>
              <TableHead>Raison</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {authorizations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Aucune autorisation spéciale trouvée.
                </TableCell>
              </TableRow>
            ) : (
              authorizations?.map((auth) => (
                <TableRow key={auth.id}>
                  <TableCell className="font-medium">
                    {auth.employees?.first_name} {auth.employees?.last_name}
                  </TableCell>
                  <TableCell>{auth.type}</TableCell>
                  <TableCell>{format(new Date(auth.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{auth.requested_time ? auth.requested_time.substring(0, 5) : '-'}</TableCell>
                  <TableCell>{auth.reason}</TableCell>
                  <TableCell>{auth.status}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditAuthorization(auth)}
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
                            Cette action ne peut pas être annulée. Cela supprimera définitivement l'autorisation pour
                            <span className="font-bold"> {auth.employees?.first_name} {auth.employees?.last_name}</span> de type <span className="font-bold">{auth.type}</span> le <span className="font-bold">{format(new Date(auth.date), "dd/MM/yyyy")}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAuthorization(auth.id)} className="bg-red-500 hover:bg-red-600">
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

      <AuthorizationFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        authorization={selectedAuthorization}
      />
    </div>
  );
};

export default Authorizations;