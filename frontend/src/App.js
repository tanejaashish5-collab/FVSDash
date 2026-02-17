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
        <Route path="/dashboard/submissions" element={<PlaceholderPage title="Submissions" />} />
        <Route path="/dashboard/calendar" element={<PlaceholderPage title="Calendar" />} />
        <Route path="/dashboard/deliverables" element={<PlaceholderPage title="Deliverables" />} />
        <Route path="/dashboard/assets" element={<PlaceholderPage title="Assets" />} />
        <Route path="/dashboard/blog" element={<PlaceholderPage title="Blog" />} />
        <Route path="/dashboard/strategy" element={<PlaceholderPage title="Strategy Lab" />} />
        <Route path="/dashboard/video-lab" element={<PlaceholderPage title="AI Video Lab" />} />
        <Route path="/dashboard/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/dashboard/roi" element={<PlaceholderPage title="ROI Center" />} />
        <Route path="/dashboard/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/dashboard/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/dashboard/help" element={<PlaceholderPage title="Help / Support" />} />

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
