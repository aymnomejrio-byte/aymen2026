"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const LeaveCalendarSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <Skeleton className="h-8 w-72 mb-6" />
      <Skeleton className="h-5 w-96 mb-6" />
      <Separator className="mb-6" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Skeleton */}
        <div className="lg:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 p-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={`day-header-${i}`} className="h-6 w-full" />
                ))}
                {Array.from({ length: 42 }).map((_, i) => (
                  <Skeleton key={`day-cell-${i}`} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel Skeleton */}
        <div className="lg:w-1/2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <Skeleton className="h-7 w-64 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-3 border rounded-md bg-white dark:bg-gray-700 shadow-sm">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};