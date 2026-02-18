import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout() {
  const { isImpersonating } = useAuth();
  
  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-layout">
      <ImpersonationBanner />
      <Sidebar />
      <div className={`ml-[280px] min-h-screen flex flex-col ${isImpersonating ? 'pt-10' : ''}`}>
        <Header />
        <main className="flex-1 p-6 md:p-8 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
