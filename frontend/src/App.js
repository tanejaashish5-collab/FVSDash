import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OverviewPage from "@/pages/OverviewPage";
import AdminPage from "@/pages/AdminPage";
import SubmissionsPage from "@/pages/SubmissionsPage";
import CalendarPage from "@/pages/CalendarPage";
import DeliverablesPage from "@/pages/DeliverablesPage";
import AssetsPage from "@/pages/AssetsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ROIPage from "@/pages/ROIPage";
import BillingPage from "@/pages/BillingPage";
import SettingsPage from "@/pages/SettingsPage";
import HelpPage from "@/pages/HelpPage";
import BlogPage from "@/pages/BlogPage";
import StrategyPage from "@/pages/StrategyPage";
import VideoLabPage from "@/pages/VideoLabPage";
import FvsSystemPage from "@/pages/FvsSystemPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminGuard({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard/overview" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard/overview" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

      {/* Protected dashboard routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
        <Route path="/dashboard/overview" element={<OverviewPage />} />
        <Route path="/dashboard/submissions" element={<SubmissionsPage />} />
        <Route path="/dashboard/calendar" element={<CalendarPage />} />
        <Route path="/dashboard/deliverables" element={<DeliverablesPage />} />
        <Route path="/dashboard/assets" element={<AssetsPage />} />
        <Route path="/dashboard/blog" element={<BlogPage />} />
        <Route path="/dashboard/strategy" element={<StrategyPage />} />
        <Route path="/dashboard/video-lab" element={<VideoLabPage />} />
        <Route path="/dashboard/system" element={<FvsSystemPage />} />
        <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
        <Route path="/dashboard/roi" element={<ROIPage />} />
        <Route path="/dashboard/billing" element={<BillingPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/help" element={<HelpPage />} />

        {/* Admin route inside layout */}
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fafafa',
              fontSize: '13px',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
