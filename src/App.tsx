import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthPage from "./components/AuthPage";
import NotFound from "./pages/NotFound";
import WeekendPayroll from "./pages/WeekendPayroll";
import GeneralPayroll from "./pages/GeneralPayroll";
import StaffPage from "./pages/Staff";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import TimeAttendanceTab from "./components/staff/TimeAttendanceTab";
import LoansAndBonusesTab from "./components/staff/LoansAndBonusesTab";
import StaffDirectory from "./components/staff/StaffDirectory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const AppContent = () => {
  const { user, loading } = useAuth();


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Connecting to database...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('AppContent: No user, showing AuthPage');
    return <AuthPage />;
  }

  console.log('AppContent: User authenticated, showing main app');
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/staff" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/staff" element={<StaffPage />}>
            <Route index element={<Navigate to="directory" replace />} />
            <Route path="directory" element={<StaffDirectory />} />
            <Route path="attendance" element={<TimeAttendanceTab />} />
            <Route path="loans" element={<LoansAndBonusesTab />} />
          </Route>
          <Route path="/payroll/general" element={<GeneralPayroll />} />
          <Route path="/payroll/weekend" element={<WeekendPayroll />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
        <Toaster />
        <Sonner />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

