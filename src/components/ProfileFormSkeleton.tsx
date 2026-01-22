"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export const ProfileFormSkeleton = () => {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-5 w-64 mb-6" />
      <Separator className="mb-6" />

      <div className="flex items-center space-x-4 mb-8">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Separator className="mb-8" />

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
};