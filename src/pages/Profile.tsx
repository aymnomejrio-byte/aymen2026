"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

const profileFormSchema = z.object({
  first_name: z.string().min(1, { message: "Le prénom est requis." }).optional().or(z.literal('')),
  last_name: z.string().min(1, { message: "Le nom de famille est requis." }).optional().or(z.literal('')),
  avatar_url: z.string().url({ message: "URL d'avatar invalide." }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      avatar_url: "",
    },
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (newProfile: ProfileFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          ...newProfile,
          id: userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour avec succès !");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour du profil : " + error.message);
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement du profil...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Mon Profil</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Gérez vos informations personnelles et votre avatar.
      </p>
      <Separator className="mb-6" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={form.watch("avatar_url") || undefined} alt="Avatar" />
              <AvatarFallback>
                <User className="h-10 w-10 text-gray-500" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{userEmail}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {userId}</p>
            </div>
          </div>
          <Separator />

          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Votre prénom tel qu'il apparaîtra dans l'application.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de famille</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Votre nom de famille tel qu'il apparaîtra dans l'application.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL de l'avatar</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Lien vers votre image de profil (ex: Gravatar, URL d'image).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default Profile;