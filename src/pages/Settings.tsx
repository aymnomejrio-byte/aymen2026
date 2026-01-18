"use client";

import React, { useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  work_days: z.array(z.string()).min(1, { message: "Veuillez sélectionner au moins un jour de travail." }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }),
  break_duration_minutes: z.coerce.number().min(0, { message: "La durée de la pause ne peut pas être négative." }),
  overtime_threshold_hours: z.coerce.number().min(0, { message: "Le seuil d'heures supplémentaires ne peut pas être négatif." }),
  overtime_rate_multiplier: z.coerce.number().min(1, { message: "Le multiplicateur d'heures supplémentaires doit être au moins 1." }),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const defaultWorkDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const Settings = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_days: defaultWorkDays,
      start_time: "08:00",
      end_time: "17:00",
      break_duration_minutes: 60,
      overtime_threshold_hours: 8,
      overtime_rate_multiplier: 1.5,
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app_settings", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        work_days: settings.work_days || defaultWorkDays,
        start_time: settings.start_time?.substring(0, 5) || "08:00",
        end_time: settings.end_time?.substring(0, 5) || "17:00",
        break_duration_minutes: settings.break_duration_minutes || 60,
        overtime_threshold_hours: settings.overtime_threshold_hours || 8,
        overtime_rate_multiplier: settings.overtime_rate_multiplier || 1.5,
      });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SettingsFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from("app_settings")
        .upsert({
          ...newSettings,
          user_id: userId,
          id: settings?.id, // Include ID for update, if exists
        }, { onConflict: 'user_id' }) // Use onConflict to handle upsert based on user_id
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Paramètres mis à jour avec succès !");
      queryClient.invalidateQueries({ queryKey: ["app_settings", userId] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour des paramètres : " + error.message);
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des paramètres...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Paramètres de l'Application</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Configurez les paramètres globaux de votre application de gestion d'équipe.
      </p>
      <Separator className="mb-6" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="work_days"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Jours de travail de la semaine</FormLabel>
                  <FormDescription>
                    Sélectionnez les jours où votre équipe est généralement active.
                  </FormDescription>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {allDays.map((day) => (
                    <FormField
                      key={day}
                      control={form.control}
                      name="work_days"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={day}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(day)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, day])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== day
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {day}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure de début de journée</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>
                    L'heure à laquelle la journée de travail commence habituellement.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure de fin de journée</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>
                    L'heure à laquelle la journée de travail se termine habituellement.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="break_duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durée de la pause (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  La durée standard de la pause déjeuner ou des pauses combinées.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="overtime_threshold_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seuil d'heures supplémentaires (heures)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.5" {...field} />
                </FormControl>
                <FormDescription>
                  Nombre d'heures travaillées au-delà duquel les heures sont considérées comme supplémentaires.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="overtime_rate_multiplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taux de majoration des heures supplémentaires</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormDescription>
                  Multiplicateur appliqué au salaire horaire pour le calcul des heures supplémentaires (ex: 1.5 pour 150%).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? "Enregistrement..." : "Enregistrer les paramètres"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default Settings;