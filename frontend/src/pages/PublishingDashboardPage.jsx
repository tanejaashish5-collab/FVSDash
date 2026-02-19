import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, Calendar, CheckCircle2, XCircle, Clock, Loader2,
  Youtube, Instagram, Filter, RefreshCw, ExternalLink,
  AlertCircle, Users
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const platformCfg = {
  youtube_shorts: { 
    label: 'YouTube Shorts', 
    icon: Youtube, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  },
  tiktok: { 
    label: 'TikTok', 
    icon: TikTokIcon, 
    color: 'text-pink-400', 
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20'
  },
  instagram_reels: { 
    label: 'Instagram Reels', 
    icon: Instagram, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  },
};

const statusCfg = {
  draft: { label: 'Draft', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  posting: { label: 'Posting', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  posted: { label: 'Posted', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

export default function PublishingDashboardPage() {
  const navigate = useNavigate();
  const { authHeaders, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Admin-only: client filter
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('all');

  // Fetch client list for admin users
  useEffect(() => {
    if (!authHeaders || !isAdmin) return;
    
    const fetchClients = async () => {
      try {
        const res = await axios.get(`${API}/admin/clients`, { headers: authHeaders });
        // Map to expected format: id is the client id, name comes from response
        const mapped = res.data.map(c => ({
          id: c.id,
          fullName: c.name || c.primaryContactName || 'Unknown'
        }));
        setClients(mapped);
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      }
    };
    
    fetchClients();
  }, [authHeaders, isAdmin]);

  const fetchData = useCallback(async () => {
    if (!authHeaders) return;
    
    try {
      setLoading(true);
      
      // Build query params for admin client filter
      const params = new URLSearchParams();
      if (isAdmin && clientFilter !== 'all') {
        params.append('clientId', clientFilter);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const [tasksRes, statsRes] = await Promise.all([
        axios.get(`${API}/publishing-tasks${queryString}`, { headers: authHeaders }),
        axios.get(`${API}/publishing-stats${queryString}`, { headers: authHeaders })
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load publishing data');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAdmin, clientFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    if (platformFilter !== 'all' && task.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    return true;
  });

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]" data-testid="publishing-dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="publishing-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Send className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Publishing
            </h1>
            <p className="text-sm text-zinc-400">Manage your scheduled and posted content</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="text-zinc-400 hover:text-white"
          data-testid="refresh-btn"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{stats.posted}</p>
                  <p className="text-xs text-zinc-500">Posted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{stats.scheduled}</p>
                  <p className="text-xs text-zinc-500">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                  <p className="text-xs text-zinc-500">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-500/5 border-zinc-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-400">{stats.total}</p>
                  <p className="text-xs text-zinc-500">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">Filters:</span>
            </div>
            
            {/* Admin-only: Client Filter */}
            {isAdmin && (
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-48 bg-zinc-900/50 border-zinc-700 text-white" data-testid="client-filter">
                  <Users className="h-4 w-4 mr-2 text-zinc-400" />
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all" className="text-white">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id} className="text-white">
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-700 text-white" data-testid="platform-filter">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-white">All Platforms</SelectItem>
                <SelectItem value="youtube_shorts" className="text-white">YouTube Shorts</SelectItem>
                <SelectItem value="tiktok" className="text-white">TikTok</SelectItem>
                <SelectItem value="instagram_reels" className="text-white">Instagram Reels</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-700 text-white" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-white">All Statuses</SelectItem>
                <SelectItem value="draft" className="text-white">Draft</SelectItem>
                <SelectItem value="scheduled" className="text-white">Scheduled</SelectItem>
                <SelectItem value="posting" className="text-white">Posting</SelectItem>
                <SelectItem value="posted" className="text-white">Posted</SelectItem>
                <SelectItem value="failed" className="text-white">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <span className="text-xs text-zinc-500 ml-auto">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-white">Publishing Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No publishing tasks found.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Create tasks from the Submission Detail page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Submission</th>
                    {isAdmin && (
                      <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client</th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Platform</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scheduled</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Posted</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const platform = platformCfg[task.platform] || platformCfg.youtube_shorts;
                    const status = statusCfg[task.status] || statusCfg.draft;
                    const PlatformIcon = platform.icon;
                    
                    return (
                      <tr 
                        key={task.id} 
                        className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/submissions/${task.submissionId}`)}
                        data-testid={`task-row-${task.id}`}
                      >
                        <td className="py-3 px-4">
                          <span className="text-sm text-white font-medium line-clamp-1">
                            {task.submissionTitle || 'Untitled'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <span className="text-sm text-zinc-400" data-testid={`task-client-${task.id}`}>
                              {task.clientName || 'Unknown'}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <PlatformIcon className={`h-4 w-4 ${platform.color}`} />
                            <span className="text-sm text-zinc-300">{platform.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${status.bg} ${status.color} border ${status.border}`}>
                            {status.label}
                          </Badge>
                          {task.status === 'failed' && task.errorMessage && (
                            <span className="ml-2" title={task.errorMessage}>
                              <AlertCircle className="h-4 w-4 text-red-400 inline" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {formatDate(task.scheduledAt)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {formatDate(task.postedAt)}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-zinc-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/submissions/${task.submissionId}`);
                            }}
                            data-testid={`view-submission-btn-${task.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
