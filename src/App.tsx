import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import NotFound from './pages/NotFound';
import WeekendPayroll from './pages/WeekendPayroll';
import GeneralPayroll from './pages/GeneralPayroll';
import StaffPage from './pages/Staff';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import TimeAttendanceTab from './components/staff/TimeAttendanceTab';
import LoansAndBonusesTab from './components/staff/LoansAndBonusesTab';
import StaffDirectory from './components/staff/StaffDirectory';
import PayrollBatchSlips from './pages/PayrollBatchSlips';
import ApprovalsPage from './pages/Approvals';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Viewer Route wrapper (redirects viewers away from write-action pages)
const ViewerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user?.role === 'viewer') return <Navigate to="/staff/directory" replace />;
  return <>{children}</>;
};

// Public Route wrapper (redirects to app if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/staff" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/staff" element={<StaffPage />}>
          <Route index element={<Navigate to="attendance" replace />} />
          <Route path="directory" element={<StaffDirectory />} />
          <Route path="attendance" element={<TimeAttendanceTab />} />
          <Route path="loans" element={<LoansAndBonusesTab />} />
        </Route>
        <Route path="/payroll/general" element={<GeneralPayroll />} />
        <Route path="/payroll/weekend" element={<WeekendPayroll />} />
        <Route path="/staff/payroll-batches/:id/slips" element={<PayrollBatchSlips />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
          <Sonner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
