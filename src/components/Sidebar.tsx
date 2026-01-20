"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, Settings, Users, CalendarDays, Clock, DollarSign, FileText, BarChart3, CalendarCheck, UserCircle, Hourglass } from "lucide-react"; // Added Hourglass icon
import { useIsMobile } from "@/hooks/use-mobile";

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isActive }) => (
  <Button
    asChild
    variant="ghost"
    className={cn(
      "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
    )}
  >
    <Link to={to} className="flex items-center space-x-3">
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  </Button>
);

const SidebarContent = () => {
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de Bord" },
    { to: "/dashboard/employees", icon: Users, label: "Gestion d'Équipe" },
    { to: "/dashboard/attendance", icon: Clock, label: "Pointage Manuel" },
    { to: "/dashboard/leave-requests", icon: CalendarDays, label: "Demandes de Congé" },
    { to: "/dashboard/tunisian-holidays", icon: CalendarCheck, label: "Jours Fériés" },
    { to: "/dashboard/overtime-compensations", icon: Hourglass, label: "Compensations HS" }, // New item for Overtime Compensations
    { to: "/dashboard/payroll", icon: DollarSign, label: "Paie Automatique" },
    { to: "/dashboard/reports", icon: BarChart3, label: "Rapports & Analyses" },
    { to: "/dashboard/profile", icon: UserCircle, label: "Mon Profil" },
    { to: "/dashboard/settings", icon: Settings, label: "Paramètres" },
  ];

  return (
    <ScrollArea className="h-full px-3 py-4">
      <div className="flex flex-col space-y-1">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-sidebar-primary-foreground">
          Gestion d'Équipe
        </h2>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export const Sidebar = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar">
          <div className="flex h-full flex-col py-4">
            <div className="px-4 mb-6">
              <h1 className="text-2xl font-bold text-sidebar-primary-foreground">Dyad HR</h1>
            </div>
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:flex flex-col h-screen w-64 border-r bg-sidebar text-sidebar-foreground p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sidebar-primary-foreground">Dyad HR</h1>
      </div>
      <SidebarContent />
    </div>
  );
};