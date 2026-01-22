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
import { SettingsFormSkeleton } from "@/components/SettingsFormSkeleton";

const daySettingsSchema = z.object({
  day: z.string(),
  is_work_day: z.boolean(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }).optional().or(z.literal('')),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Format d'heure invalide (HH:MM)." }).optional().or(z.literal('')),
  break_duration_minutes: z.coerce.number().min(0, { message: "La durée de la pause ne peut pas être négative." }).optional(),
  overtime_threshold_hours: z.coerce.number().min(0, { message: "Le seuil d'heures supplémentaires ne peut pas être négatif." }).optional(),
  overtime_rate_multiplier: z.coerce.number().min(1, { message: "Le multiplicateur d'heures supplémentaires doit être au moins 1." }).optional(),
});

const formSchema = z.object({
  daily_settings: z.array(daySettingsSchema),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultDailySettings = allDays.map(day => ({
  day,
  is_work_day: day !== "Sunday",
  start_time: day === "Saturday" ? "08:00" : (day !== "Sunday" ? "08:00" : ""),
  end_time: day === "Saturday" ? "13:00" : (day !== "Sunday" ? "17:00" : ""),
  break_duration_minutes: day === "Saturday" ? 0 : (day !== "Sunday" ? 60 : 0),
  overtime_threshold_hours: day === "Saturday" ? 5 : (day !== "Sunday" ? 8 : 0),
  overtime_rate_multiplier: day !== "Sunday" ? 1.5 : 0,
}));

const Settings = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daily_settings: defaultDailySettings,
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app_settings", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("app_settings")
        .select("id, daily_settings")
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
    if (settings?.daily_settings) {
      // Merge fetched settings with default to ensure all days are present
      const mergedSettings = defaultDailySettings.map(defaultDay => {
        const fetchedDay = settings.daily_settings.find((s: any) => s.day === defaultDay.day);
        return {
          ...defaultDay,
          ...fetchedDay,
          // Ensure time fields are strings and numbers are numbers
          start_time: fetchedDay?.start_time?.substring(0, 5) || defaultDay.start_time,
          end_time: fetchedDay?.end_time?.substring(0, 5) || defaultDay.end_time,
          break_duration_minutes: fetchedDay?.break_duration_minutes !== undefined ? Number(fetchedDay.break_duration_minutes) : defaultDay.break_duration_minutes,
          overtime_threshold_hours: fetchedDay?.overtime_threshold_hours !== undefined ? Number(fetchedDay.overtime_threshold_hours) : defaultDay.overtime_threshold_hours,
          overtime_rate_multiplier: fetchedDay?.overtime_rate_multiplier !== undefined ? Number(fetchedDay.overtime_rate_multiplier) : defaultDay.overtime_rate_multiplier,
        };
      });
      form.reset({ daily_settings: mergedSettings });
    } else {
      form.reset({ daily_settings: defaultDailySettings });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SettingsFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        user_id: userId,
        daily_settings: newSettings.daily_settings,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        Object.assign(payload, { id: settings.id });
      }

      const { data, error } = await supabase
        .from("app_settings")
        .upsert(payload, { onConflict: 'user_id' })
        .select("id, daily_settings")
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
    return <SettingsFormSkeleton />;
  }

  const dayLabels: { [key: string]: string } = {
    Monday: "Lundi",
    Tuesday: "Mardi",
    Wednesday: "Mercredi",
    Thursday: "Jeudi",
    Friday: "Vendredi",
    Saturday: "Samedi",
    Sunday: "Dimanche",
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Paramètres de l'Application</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Configurez les paramètres de travail pour chaque jour de la semaine.
      </p>
      <Separator className="mb-6" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {form.watch("daily_settings").map((daySetting, index) => (
            <div key={daySetting.day} className="border p-4 rounded-md space-y-4">
              <div className="flex items-center space-x-3">
                <FormField
                  control={form.control}
                  name={`daily_settings.${index}.is_work_day`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-lg font-semibold">
                          {dayLabels[daySetting.day]}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {daySetting.is_work_day && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name={`daily_settings.${index}.start_time`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de début</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`daily_settings.${index}.end_time`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de fin</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`daily_settings.${index}.break_duration_minutes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée de la pause (min)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`daily_settings.${index}.overtime_threshold_hours`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seuil heures supp. (h)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`daily_settings.${index}.overtime_rate_multiplier`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux heures supp.</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          ))}

          <Button type="submit" disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? "Enregistrement..." : "Enregistrer les paramètres"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default Settings;