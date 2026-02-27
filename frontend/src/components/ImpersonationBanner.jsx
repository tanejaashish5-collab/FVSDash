import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, X } from 'lucide-react';

export default function ImpersonationBanner() {
  const { isImpersonating, impersonatedClientName, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleStopImpersonation = () => {
    stopImpersonation();
    toast.success('Stopped impersonation; returned to admin view.');
    navigate('/dashboard/admin');
  };

  return (
    <div 
      data-testid="impersonation-banner"
      className="fixed top-0 left-[280px] right-0 z-50 bg-amber-500/90 backdrop-blur-sm border-b border-amber-600"
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-900" />
          <span className="text-sm font-medium text-amber-900">
            You are impersonating: <strong>{impersonatedClientName}</strong>
          </span>
        </div>
        <button
          data-testid="stop-impersonation-btn"
          onClick={handleStopImpersonation}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-900 text-amber-100 rounded hover:bg-amber-800 transition-colors"
        >
          <X className="h-3 w-3" />
          Return to Admin View
        </button>
      </div>
    </div>
  );
}
