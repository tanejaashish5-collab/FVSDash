import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Briefcase, Radio, FolderOpen, DollarSign, MoreHorizontal, Calendar,
  ArrowRight, FlaskConical, Video, Zap, Activity, Users, TrendingUp, Eye, Youtube, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';
import { AuraSpinner } from '@/components/animations/AuraSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ['INTAKE', 'EDITING', 'DESIGN', 'SCHEDULED', 'PUBLISHED'];

// Silk easing
const silkEase = [0.22, 1, 0.36, 1];

// Check reduced motion preference
const getPrefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function KPICard({ label, value, subtext, icon: Icon, trend, tooltipKey, delay = 0 }) {
  const tooltipText = tooltipKey ? tooltipContent.overview[tooltipKey] : null;
  const prefersReducedMotion = getPrefersReducedMotion();
  
  // Parse numeric value for animation
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && !value.startsWith('$'));
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  const isCurrency = typeof value === 'string' && value.includes('$');
  
  const labelElement = tooltipText ? (
    <AuraTooltip content={tooltipText} position="top">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
    </AuraTooltip>
  ) : (
    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
  );

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: silkEase, delay }}
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
      style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
    >
      <Card className="bg-[#0B1120] border-[#1F2933] glass-flutter card-lift" data-testid={`kpi-${label.toLowerCase().replace(/[\s().]+/g, '-').replace(/-+/g, '-').replace(/-$/, '')}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            {labelElement}
            <div className="h-9 w-9 rounded-md bg-indigo-500/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {isNumeric ? (
              <AnimatedNumber 
                value={numericValue} 
                prefix={isCurrency ? '$' : ''} 
                delay={delay + 0.2}
                duration={2}
              />
            ) : value}
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
    </motion.div>
  );
}

function PipelineCard({ submission, onStatusChange }) {
  const tc = typeCfg[submission.contentType] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  return (
    <div
      className="aura-card-hover p-3 bg-[#060c17] rounded-md mb-2 group"
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
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [brainScores, setBrainScores] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [activeChallenges, setActiveChallenges] = useState(null);
  
  const isAdmin = user?.role === 'admin';

  const fetchData = useCallback(() => {
    // Fetch dashboard overview
    const dashboardReq = axios.get(buildApiUrl(`${API}/dashboard/overview`), { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(console.error);
    
    // Fetch admin-specific overview if admin
    const adminReq = isAdmin 
      ? axios.get(buildApiUrl(`${API}/dashboard/admin-overview`), { headers: authHeaders })
          .then(res => setAdminOverview(res.data))
          .catch(() => {})
      : Promise.resolve();
    
    // Fetch real YouTube analytics overview (only for clients)
    const analyticsReq = !isAdmin
      ? axios.get(buildApiUrl(`${API}/analytics/overview`), { headers: authHeaders })
          .then(res => setAnalyticsOverview(res.data))
          .catch(() => {})
      : Promise.resolve();
    
    // Fetch top performing videos (only for clients)
    const topPerformersReq = !isAdmin
      ? axios.get(buildApiUrl(`${API}/analytics/top-performers?limit=3`), { headers: authHeaders })
          .then(res => setTopPerformers(res.data?.videos || []))
          .catch(() => {})
      : Promise.resolve();
    
    // Fetch brain scores for accuracy widget (only for clients)
    const brainReq = !isAdmin
      ? axios.get(buildApiUrl(`${API}/brain/scores`), { headers: authHeaders })
          .then(res => setBrainScores(res.data))
          .catch(() => {})
      : Promise.resolve();
    
    // Fetch active challenges count (only for clients)
    const challengesReq = !isAdmin
      ? axios.get(buildApiUrl(`${API}/brain/active-challenges`), { headers: authHeaders })
          .then(res => setActiveChallenges(res.data))
          .catch(() => {})
      : Promise.resolve();
    
    Promise.all([dashboardReq, adminReq, analyticsReq, topPerformersReq, brainReq, challengesReq])
      .finally(() => setLoading(false));
  }, [authHeaders, buildApiUrl, isAdmin]);

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
        <AuraSpinner size="md" />
      </div>
    );
  }

  return (
    <div data-testid="overview-page" className="space-y-6">
      {/* Welcome Header - Admin vs Client */}
      <div data-testid="welcome-header">
        {isAdmin ? (
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              ForgeVoice Admin Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage all client channels and monitor platform health.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Welcome back, {data.clientName}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Here's what's happening across your content production.</p>
          </>
        )}
      </div>

      {/* Admin KPI Cards - Cross-Channel Summary */}
      {isAdmin && adminOverview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-kpi-row">
          <KPICard label="Total Clients" value={adminOverview.totalClients} subtext="Active accounts" icon={Users} delay={0} />
          <KPICard label="Videos Managed" value={adminOverview.totalVideosManaged} subtext="Across all clients" icon={Video} delay={0.05} />
          <KPICard label="Total Views" value={adminOverview.totalViewsManaged} subtext="Platform-wide" icon={Eye} delay={0.1} />
          <KPICard label="Active Channels" value={adminOverview.activeChannels} subtext="YouTube connected" icon={Youtube} delay={0.15} />
        </div>
      )}

      {/* Client KPI Cards */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-row" data-tour="kpi-cards">
          <KPICard label="Active Projects" value={data.kpis.activeProjects} subtext="Episodes in production" icon={Briefcase} trend={8} tooltipKey="activeProjects" delay={0} />
          <KPICard label="Published (30d)" value={data.kpis.publishedLast30d} subtext="Last 30 days" icon={Radio} trend={12} tooltipKey="publishedLast30d" delay={0.05} />
          <KPICard label="Total Assets" value={data.kpis.totalAssets} subtext="Video, audio, and design" icon={FolderOpen} tooltipKey="totalAssets" delay={0.1} />
          <KPICard label="Est. ROI (30d)" value={`$${data.kpis.roiLast30d.toLocaleString()}`} subtext="At a glance ROI" icon={DollarSign} trend={15} tooltipKey="estRoi" delay={0.15} />
        </div>
      )}

      {/* Brain Accuracy Widget - Only for clients */}
      {!isAdmin && brainScores && (
        <Card 
          className={`bg-[#0B1120] border-[#1F2933] cursor-pointer hover:border-indigo-500/30 transition-colors ${
            brainScores.accuracy_percentage >= 80 
              ? 'ring-1 ring-amber-500/20' 
              : ''
          }`}
          onClick={() => navigate('/dashboard/fvs')}
          data-testid="brain-accuracy-widget"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  brainScores.accuracy_percentage >= 80 
                    ? 'bg-amber-500/20' 
                    : brainScores.accuracy_percentage >= 60 
                    ? 'bg-teal-500/20' 
                    : 'bg-zinc-700/50'
                }`}>
                  <Brain className={`h-5 w-5 ${
                    brainScores.accuracy_percentage >= 80 
                      ? 'text-amber-400' 
                      : brainScores.accuracy_percentage >= 60 
                      ? 'text-teal-400' 
                      : 'text-zinc-400'
                  }`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">FVS Brain Accuracy</p>
                  {brainScores.total_predictions > 0 ? (
                    <p className={`text-2xl font-bold ${
                      brainScores.accuracy_percentage >= 80 
                        ? 'text-amber-400' 
                        : brainScores.accuracy_percentage >= 60 
                        ? 'text-teal-400' 
                        : 'text-zinc-300'
                    }`}>
                      {brainScores.accuracy_percentage}%
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500">No predictions yet</p>
                  )}
                </div>
              </div>
              {brainScores.total_predictions > 0 ? (
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-lg font-bold text-white">{brainScores.total_predictions}</p>
                    <p className="text-[10px] text-zinc-500">Predictions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{brainScores.correct}</p>
                    <p className="text-[10px] text-zinc-500">Correct</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-zinc-400">{brainScores.pending}</p>
                    <p className="text-[10px] text-zinc-500">Pending</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Make your first AI-recommended Short</p>
                  <p className="text-xs text-zinc-500">to start tracking Brain accuracy</p>
                  <ArrowRight className="h-4 w-4 text-zinc-500 ml-auto mt-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Active Challenges Link - Under Brain Widget */}
      {!isAdmin && activeChallenges?.total_active > 0 && (
        <div 
          className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg cursor-pointer hover:bg-amber-500/15 transition-colors"
          onClick={() => navigate('/dashboard/fvs#active-challenges')}
          data-testid="active-challenges-link"
        >
          <Swords className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-amber-400 font-medium">
            {activeChallenges.total_active} active prediction{activeChallenges.total_active !== 1 ? 's' : ''} awaiting verdict
          </span>
        </div>
      )}

      {/* YouTube Channel Stats - Real Data - Only for clients */}
      {!isAdmin && analyticsOverview && (
        <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="youtube-stats-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube Channel Stats
              </CardTitle>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Subscribers</span>
                </div>
                <p className="text-xl font-bold text-white">
                  <AnimatedNumber value={analyticsOverview.subscriberCount || 0} delay={0.2} />
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Total Views</span>
                </div>
                <p className="text-xl font-bold text-white">
                  <AnimatedNumber value={analyticsOverview.totalViews || 0} delay={0.25} />
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Videos</span>
                </div>
                <p className="text-xl font-bold text-white">
                  <AnimatedNumber value={analyticsOverview.videoCount || 0} delay={0.3} />
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Avg View Duration</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {Math.round(analyticsOverview.avgAvd || 0)}s
                </p>
              </div>
            </div>

            {/* Best Performing Short */}
            {topPerformers.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Best Performing Short</span>
                </div>
                <div className="flex items-start gap-3">
                  {topPerformers[0].thumbnailUrl && (
                    <img 
                      src={topPerformers[0].thumbnailUrl} 
                      alt={topPerformers[0].title} 
                      className="w-20 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{topPerformers[0].title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-emerald-400">{(topPerformers[0].views || 0).toLocaleString()} views</span>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="text-xs text-zinc-400">{(topPerformers[0].likes || 0).toLocaleString()} likes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Middle Section: Pipeline + Schedule/Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Production Pipeline */}
        <Card className="lg:col-span-8 bg-[#0B1120] border-[#1F2933]" data-testid="pipeline-board" data-tour="pipeline">
          <CardHeader className="pb-2">
            <AuraTooltip content={tooltipContent.overview.productionPipeline} position="right">
              <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Production Pipeline
              </CardTitle>
            </AuraTooltip>
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
