"use client";

import React, { useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CalendarEvent {
  id: string;
  date: string; // ISO string
  title: string;
  description?: string;
  type: 'leave' | 'holiday';
  employeeName?: string; // For leave requests
  status?: string; // For leave requests
}

interface TeamCalendarProps {
  events: CalendarEvent[];
}

export const TeamCalendar: React.FC<TeamCalendarProps> = ({ events }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(new Date());

  const eventsByDay = events.reduce((acc, event) => {
    const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const modifiers = {
    eventDay: (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return eventsByDay[dateKey] && eventsByDay[dateKey].length > 0;
    },
  };

  const modifiersClassNames = {
    eventDay: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full",
  };

  const handleDayClick = (day: Date | undefined) => {
    setSelectedDate(day);
  };

  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDay[dateKey] || [];

    return (
      <div className="relative text-center">
        {day.getDate()}
        {dayEvents.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-1">
            {dayEvents.map((event, index) => (
              <span
                key={event.id}
                className={cn(
                  "h-1 w-1 rounded-full",
                  event.type === 'leave' ? "bg-blue-500" : "bg-green-500"
                )}
                title={event.title}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDayClick}
          month={month}
          onMonthChange={setMonth}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          components={{
            DayContent: ({ date }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      isSameDay(date, selectedDate || new Date()) && "bg-accent text-accent-foreground",
                      modifiers.eventDay(date) && "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
                      "hover:bg-blue-200 dark:hover:bg-blue-800"
                    )}
                    onClick={() => handleDayClick(date)}
                  >
                    {renderDay(date)}
                  </Button>
                </PopoverTrigger>
                {eventsByDay[format(date, 'yyyy-MM-dd')] && eventsByDay[format(date, 'yyyy-MM-dd')].length > 0 && (
                  <PopoverContent className="w-80">
                    <h4 className="font-bold mb-2">Événements le {format(date, "PPP", { locale: fr })}</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {eventsByDay[format(date, 'yyyy-MM-dd')].map((event) => (
                          <div key={event.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                            <Badge
                              className={cn(
                                "mr-2",
                                event.type === 'leave' ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"
                              )}
                            >
                              {event.type === 'leave' ? "Congé" : "Jour Férié"}
                            </Badge>
                            <span className="font-medium">{event.title}</span>
                            {event.employeeName && (
                              <p className="text-sm text-muted-foreground">Employé: {event.employeeName}</p>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                )}
              </Popover>
            ),
          }}
          locale={fr}
        />
      </div>
      <div className="lg:w-1/2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Détails du jour sélectionné : {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Aucun jour sélectionné"}
        </h3>
        {selectedDate && eventsByDay[format(selectedDate, 'yyyy-MM-dd')] && eventsByDay[format(selectedDate, 'yyyy-MM-dd')].length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {eventsByDay[format(selectedDate, 'yyyy-MM-dd')].map((event) => (
                <div key={event.id} className="p-3 border rounded-md bg-white dark:bg-gray-700 shadow-sm">
                  <div className="flex items-center mb-2">
                    <Badge
                      className={cn(
                        "mr-2",
                        event.type === 'leave' ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      {event.type === 'leave' ? "Congé" : "Jour Férié"}
                    </Badge>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{event.title}</h4>
                  </div>
                  {event.employeeName && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Employé:</span> {event.employeeName}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Raison:</span> {event.description}
                    </p>
                  )}
                  {event.status && event.type === 'leave' && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Statut:</span> {event.status}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground">
            {selectedDate ? "Aucun événement pour ce jour." : "Sélectionnez un jour pour voir les détails."}
          </p>
        )}
      </div>
    </div>
  );
};