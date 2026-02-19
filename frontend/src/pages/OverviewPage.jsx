import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Briefcase, Radio, FolderOpen, DollarSign, MoreHorizontal, Calendar,
  ArrowRight, FlaskConical, Video, Zap, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ['INTAKE', 'EDITING', 'DESIGN', 'SCHEDULED', 'PUBLISHED'];

const statusCfg = {
  INTAKE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  EDITING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  DESIGN: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  SCHEDULED: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  PUBLISHED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const typeCfg = {
  Podcast: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Short: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Blog: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Webinar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function KPICard({ label, value, subtext, icon: Icon, trend, tooltip }) {
  const labelElement = tooltip ? (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 cursor-help border-b border-dashed border-zinc-600">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 text-white border-zinc-700">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
  );

  return (
    <Card className="bg-[#0B1120] border-[#1F2933] stat-card" data-testid={`kpi-${label.toLowerCase().replace(/[\s().]+/g, '-').replace(/-+/g, '-').replace(/-$/, '')}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          {labelElement}
          <div className="h-9 w-9 rounded-md bg-indigo-500/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-indigo-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {value}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-zinc-500">{subtext}</span>
          {trend != null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineCard({ submission, onStatusChange }) {
  const tc = typeCfg[submission.contentType] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  return (
    <div
      className="p-3 bg-[#060c17] border border-[#1F2933] rounded-md mb-2 group hover:border-indigo-500/30 transition-colors"
      data-testid={`pipeline-card-${submission.id}`}
    >
      <div className="flex items-start justify-between gap-1">
        <h4 className="text-xs font-medium text-white leading-tight line-clamp-2 flex-1">{submission.title}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid={`move-${submission.id}`}
              className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all shrink-0"
            >
              <MoreHorizontal className="h-3 w-3 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0B1120] border-[#1F2933] w-40">
            {STATUSES.filter(s => s !== submission.status).map(s => {
              const sc = statusCfg[s];
              return (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onStatusChange(submission.id, s)}
                  className="text-xs text-zinc-300 cursor-pointer hover:text-white"
                  data-testid={`move-to-${s.toLowerCase()}-${submission.id}`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${sc.dot} mr-2 shrink-0`} />
                  Move to {s}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {submission.guest && <p className="text-[10px] text-zinc-500 mt-1">w/ {submission.guest}</p>}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${tc}`}>
          {submission.contentType}
        </Badge>
        {submission.releaseDate && (
          <span className="text-[9px] text-zinc-600 font-mono">{submission.releaseDate}</span>
        )}
      </div>
    </div>
  );
}

function PipelineColumn({ status, submissions, onStatusChange }) {
  const sc = statusCfg[status];
  return (
    <div className="flex-1 min-w-[150px]" data-testid={`pipeline-col-${status.toLowerCase()}`}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`h-2 w-2 rounded-full ${sc.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{status}</span>
        <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 rounded">{submissions.length}</span>
      </div>
      <div className="space-y-0 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
        {submissions.map(sub => (
          <PipelineCard key={sub.id} submission={sub} onStatusChange={onStatusChange} />
        ))}
        {submissions.length === 0 && (
          <div className="p-4 border border-dashed border-[#1F2933] rounded-md text-center">
            <p className="text-[10px] text-zinc-600">No items</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { authHeaders, user, buildApiUrl, isImpersonating, impersonatedClientName } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    axios.get(buildApiUrl(`${API}/dashboard/overview`), { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders, buildApiUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (submissionId, newStatus) => {
    try {
      await axios.patch(buildApiUrl(`${API}/submissions/${submissionId}/status`), { status: newStatus }, { headers: authHeaders });
      toast.success(`Moved to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="overview-loading">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="overview-page" className="space-y-6">
      {/* Welcome Header */}
      <div data-testid="welcome-header">
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Welcome back, {data.clientName}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Here's what's happening across your content production.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-row">
        <KPICard label="Active Projects" value={data.kpis.activeProjects} subtext="Episodes in production" icon={Briefcase} trend={8} />
        <KPICard label="Published (30d)" value={data.kpis.publishedLast30d} subtext="Last 30 days" icon={Radio} trend={12} />
        <KPICard label="Total Assets" value={data.kpis.totalAssets} subtext="Video, audio, and design" icon={FolderOpen} />
        <KPICard label="Est. ROI (30d)" value={`$${data.kpis.roiLast30d.toLocaleString()}`} subtext="At a glance ROI" icon={DollarSign} trend={15} />
      </div>

      {/* Middle Section: Pipeline + Schedule/Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Production Pipeline */}
        <Card className="lg:col-span-8 bg-[#0B1120] border-[#1F2933]" data-testid="pipeline-board">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Production Pipeline
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5">Track every episode from intake to publish.</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STATUSES.map(status => (
                <PipelineColumn
                  key={status}
                  status={status}
                  submissions={data.pipeline[status] || []}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Schedule */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="upcoming-schedule">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Upcoming Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcoming.length > 0 ? (
                <div className="space-y-2">
                  {data.upcoming.map(item => {
                    const sc = statusCfg[item.status] || statusCfg.SCHEDULED;
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-white/[0.02] transition-colors border border-transparent hover:border-[#1F2933]">
                        <div className="shrink-0 mt-0.5">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-zinc-500">{item.releaseDate}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No upcoming releases.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Plan your next drop with Quick Actions below.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="quick-actions">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Quick Actions
              </CardTitle>
              <p className="text-[10px] text-zinc-500">Create, plan, or experiment with AI in one click.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                data-testid="action-submit-content"
                onClick={() => navigate('/dashboard/submissions')}
                className="w-full justify-start gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 h-9 text-xs"
                variant="ghost"
              >
                <Zap className="h-3.5 w-3.5" />
                Submit New Content
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
              </Button>
              <Button
                data-testid="action-strategy-lab"
                onClick={() => navigate('/dashboard/strategy')}
                className="w-full justify-start gap-2 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-[#1F2933] h-9 text-xs"
                variant="ghost"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Open Strategy Lab
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
              </Button>
              <Button
                data-testid="action-video-lab"
                onClick={() => navigate('/dashboard/video-lab')}
                className="w-full justify-start gap-2 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-[#1F2933] h-9 text-xs"
                variant="ghost"
              >
                <Video className="h-3.5 w-3.5" />
                Launch AI Video Lab
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Activity + Episodes Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-4 bg-[#0B1120] border-[#1F2933]" data-testid="recent-activity">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-400" />
              <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Recent Activity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-0">
                {data.activities.map((act, i) => {
                  const sc = statusCfg[act.status] || { dot: 'bg-zinc-500' };
                  return (
                    <div key={i} className="flex gap-3 py-2.5 border-b border-[#1F2933]/50 last:border-0">
                      <div className="shrink-0 mt-1.5">
                        <div className={`h-2 w-2 rounded-full ${sc.dot}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-300 leading-relaxed">{act.message}</p>
                        <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                          {act.timestamp ? new Date(act.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {data.activities.length === 0 && (
                  <p className="text-xs text-zinc-600 text-center py-6">No recent activity</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Episodes & Deliverables Table */}
        <Card className="lg:col-span-8 bg-[#0B1120] border-[#1F2933]" data-testid="episodes-table">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Episodes & Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1F2933] hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Title</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Priority</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Release</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSubmissions.map(sub => {
                  const sc = statusCfg[sub.status] || statusCfg.INTAKE;
                  const tc = typeCfg[sub.contentType] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
                  return (
                    <TableRow
                      key={sub.id}
                      className="border-[#1F2933] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => navigate('/dashboard/submissions')}
                      data-testid={`episode-row-${sub.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm text-white font-medium">{sub.title}</p>
                          {sub.guest && <p className="text-[10px] text-zinc-500">w/ {sub.guest}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc}`}>{sub.contentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>{sub.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${sub.priority === 'High' ? 'text-red-400' : sub.priority === 'Medium' ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {sub.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-zinc-500">{sub.releaseDate || '—'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
