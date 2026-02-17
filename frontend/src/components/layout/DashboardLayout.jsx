import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-layout">
      <Sidebar />
      <div className="ml-[280px] min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6 md:p-8 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
