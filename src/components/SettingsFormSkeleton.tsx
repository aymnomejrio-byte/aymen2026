"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export const SettingsFormSkeleton = () => {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-5 w-80 mb-6" />
      <Separator className="mb-6" />

      <div className="space-y-8">
        {/* Work Days */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Time Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Other Number Inputs */}
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
};