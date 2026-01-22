"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const ReportsSkeleton = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-5 w-80 mb-6" />
      <Separator className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-32" />
              </CardTitle>
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Skeleton className="h-8 w-24" />
              </div>
              <p className="text-xs text-muted-foreground">
                <Skeleton className="h-3 w-40 mt-1" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-64" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      {/* New skeletons for monthly hours chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-80" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      {/* New skeletons for leave types pie chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-80" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      <div className="mt-8 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center text-gray-500 dark:text-gray-400">
        <Skeleton className="h-5 w-full max-w-md mx-auto" />
      </div>
    </div>
  );
};