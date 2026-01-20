"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const tunisianHolidayFormSchema = z.object({
  name: z.string().min(1, { message: "Le nom du jour férié est requis." }),
  date: z.date({ required_error: "Une date est requise." }),
});

type TunisianHolidayFormValues = z.infer<typeof tunisianHolidayFormSchema>;

interface TunisianHolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday?: any; // Optional holiday data for editing
}

export const TunisianHolidayFormDialog: React.FC<TunisianHolidayFormDialogProps> = ({
  open,
  onOpenChange,
  holiday,
}) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const form = useForm<TunisianHolidayFormValues>({
    resolver: zodResolver(tunisianHolidayFormSchema),
    defaultValues: {
      name: holiday?.name || "",
      date: holiday?.date ? new Date(holiday.date) : new Date(),
    },
  });

  useEffect(() => {
    if (holiday) {
      form.reset({
        name: holiday.name,
        date: new Date(holiday.date),
      });
    } else {
      form.reset({
        name: "",
        date: new Date(),
      });
    }
  }, [holiday, form]);

  const upsertHolidayMutation = useMutation({
    mutationFn: async (values: TunisianHolidayFormValues) => {
      if (!userId) throw new Error("User not authenticated.");

      const payload = {
        ...values,
        user_id: userId,
        date: format(values.date, "yyyy-MM-dd"),
      };

      if (holiday?.id) {
        const { data, error } = await supabase
          .from("tunisian_holidays")
          .update(payload)
          .eq("id", holiday.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("tunisian_holidays")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(holiday ? "Jour férié mis à jour avec succès !" : "Jour férié ajouté avec succès !");
      queryClient.invalidateQueries({ queryKey: ["tunisian_holidays", userId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement du jour férié : " + error.message);
    },
  });

  const onSubmit = (values: TunisianHolidayFormValues) => {
    upsertHolidayMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{holiday ? "Modifier le jour férié" : "Ajouter un jour férié"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du jour férié</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Choisir une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={upsertHolidayMutation.isPending}>
                {upsertHolidayMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};