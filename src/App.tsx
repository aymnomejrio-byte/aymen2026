import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import DashboardLayout from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import LeaveRequests from "./pages/LeaveRequests";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import TunisianHolidays from "./pages/TunisianHolidays";
import Profile from "./pages/Profile";
import Authorizations from "./pages/Authorizations";
import LeaveCalendar from "./pages/LeaveCalendar"; // Import the new LeaveCalendar page
import { SessionContextProvider } from "./components/SessionContextProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            {/* Use DashboardLayout for all authenticated routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              {/* Nested routes for dashboard content */}
              <Route index element={
                <div className="text-center mt-8">
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                    Bienvenue sur votre Tableau de Bord
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                    Commencez à gérer votre équipe ici !
                  </p>
                </div>
              } /> {/* Default content for /dashboard */}
              <Route path="settings" element={<Settings />} />
              <Route path="employees" element={<Employees />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="leave-requests" element={<LeaveRequests />} />
              <Route path="authorizations" element={<Authorizations />} />
              <Route path="tunisian-holidays" element={<TunisianHolidays />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<Profile />} />
              <Route path="leave-calendar" element={<LeaveCalendar />} /> {/* New nested route for LeaveCalendar */}
              {/* Add other nested routes here as we build them */}
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;