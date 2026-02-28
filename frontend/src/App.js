import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { AuraSpinner } from "@/components/animations/AuraSpinner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OnboardingModal from "@/components/OnboardingModal";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OverviewPage from "@/pages/OverviewPage";
import AdminPage from "@/pages/AdminPage";
import SubmissionsPage from "@/pages/SubmissionsPage";
import SubmissionDetailPage from "@/pages/SubmissionDetailPage";
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
import StrategyIdeaDetailPage from "@/pages/StrategyIdeaDetailPage";
import PublishingDashboardPage from "@/pages/PublishingDashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-screen">
      <div className="flex flex-col items-center gap-4">
        <AuraSpinner size="lg" />
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

// Guard to redirect admin away from client-only pages (Labs)
function ClientOnlyGuard({ children }) {
  const { user } = useAuth();
  // If admin tries to access client-only pages, redirect to admin panel
  if (user?.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard/overview" replace />;
  return children;
}

function AppRoutes() {
  const { showOnboarding, dismissOnboarding, authHeaders } = useAuth();
  
  return (
    <>
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
          <Route path="/dashboard/publishing" element={<PublishingDashboardPage />} />
          <Route path="/dashboard/blog" element={<BlogPage />} />
          {/* Labs pages - accessible to all authenticated users */}
          <Route path="/dashboard/strategy" element={<StrategyPage />} />
          <Route path="/dashboard/video-lab" element={<VideoLabPage />} />
          <Route path="/dashboard/system" element={<FvsSystemPage />} />
          {/* Strategy Idea Detail */}
          <Route path="/dashboard/strategy/idea/:ideaId" element={<StrategyIdeaDetailPage />} />
          <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard/roi" element={<ROIPage />} />
          <Route path="/dashboard/billing" element={<BillingPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          <Route path="/dashboard/help" element={<HelpPage />} />
          <Route path="/dashboard/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          {/* Deep-link route for viewing a specific submission */}
          <Route path="/dashboard/submissions/:submissionId" element={<SubmissionDetailPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Routes>
      
      {/* Onboarding Modal - shown at app root level for non-admin users */}
      <OnboardingModal 
        open={showOnboarding} 
        onDismiss={dismissOnboarding}
        authHeaders={authHeaders}
      />
    </>
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
