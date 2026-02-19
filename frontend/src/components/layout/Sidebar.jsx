import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, FileText, Calendar, Package, FolderOpen,
  BookOpen, FlaskConical, Video, BarChart3, TrendingUp,
  CreditCard, Settings, HelpCircle, ShieldCheck, Mic, Brain, Send
} from 'lucide-react';

const mainNav = [
  { label: 'Overview', path: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Submissions', path: '/dashboard/submissions', icon: FileText },
  { label: 'Calendar', path: '/dashboard/calendar', icon: Calendar },
  { label: 'Deliverables', path: '/dashboard/deliverables', icon: Package },
  { label: 'Assets', path: '/dashboard/assets', icon: FolderOpen },
  { label: 'Publishing', path: '/dashboard/publishing', icon: Send },
  { label: 'Blog', path: '/dashboard/blog', icon: BookOpen },
];

const labNav = [
  { label: 'Strategy Lab', path: '/dashboard/strategy', icon: FlaskConical },
  { label: 'AI Video Lab', path: '/dashboard/video-lab', icon: Video },
  { label: 'FVS System', path: '/dashboard/system', icon: Brain },
];

const insightsNav = [
  { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  { label: 'ROI Center', path: '/dashboard/roi', icon: TrendingUp },
];

const mgmtNav = [
  { label: 'Billing', path: '/dashboard/billing', icon: CreditCard },
  { label: 'Settings', path: '/dashboard/settings', icon: Settings },
  { label: 'Help / Support', path: '/dashboard/help', icon: HelpCircle },
];

function NavSection({ title, items, currentPath }) {
  return (
    <div className="mb-2">
      {title && (
        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </p>
      )}
      {items.map(item => {
        const isActive = currentPath === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(/[\s/]+/g, '-')}`}
            className={`sidebar-nav-item flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm border-l-2 ${
              isActive
                ? 'border-l-indigo-500 bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 text-white font-medium shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]'
                : 'border-l-transparent text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 transition-all duration-200 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_4px_rgba(99,102,241,0.5)] scale-105' : ''}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  return (
    <aside
      data-testid="sidebar"
      className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#0c0c0f]/90 backdrop-blur-xl border-r border-white/[0.06] flex flex-col z-30"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-white/[0.06]">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ForgeVoice
          </h1>
          <p className="text-[10px] text-zinc-500 -mt-0.5">Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <NavSection items={mainNav} currentPath={currentPath} />
        <Separator className="my-2 mx-4 bg-white/[0.06]" />
        <NavSection title="Labs" items={labNav} currentPath={currentPath} />
        <Separator className="my-2 mx-4 bg-white/[0.06]" />
        <NavSection title="Insights" items={insightsNav} currentPath={currentPath} />
        <Separator className="my-2 mx-4 bg-white/[0.06]" />
        <NavSection title="Management" items={mgmtNav} currentPath={currentPath} />

        {user?.role === 'admin' && (
          <>
            <Separator className="my-2 mx-4 bg-white/[0.06]" />
            <NavSection
              title="Admin"
              items={[{ label: 'Admin Panel', path: '/dashboard/admin', icon: ShieldCheck }]}
              currentPath={currentPath}
            />
          </>
        )}
      </ScrollArea>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0 bg-gradient-to-t from-black/20 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 flex items-center justify-center text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/20">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-zinc-500 capitalize">{user?.role || 'client'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
