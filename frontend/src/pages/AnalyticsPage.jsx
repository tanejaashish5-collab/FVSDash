import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BarChart3, TrendingUp, Download, Eye, Users, CalendarIcon, Radio, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';
import { AuraSpinner } from '@/components/animations/AuraSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Silk easing
const silkEase = [0.22, 1, 0.36, 1];

// Check reduced motion preference
const getPrefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 12 months' },
];

function KPICard({ label, value, subtext, icon: Icon, trend, tooltipContent: tipContent, delay = 0 }) {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  // Parse numeric value for animation
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  const isNumeric = !isNaN(numericValue);
  const isCurrency = typeof value === 'string' && value.includes('$');
  
  const labelElement = tipContent ? (
    <AuraTooltip content={tipContent} position="top">
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
      <Card className="bg-[#0B1120] border-[#1F2933] glass-flutter card-lift" data-testid={`kpi-${label.toLowerCase().replace(/[\s().]+/g, '-')}`}>
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B1120] border border-[#1F2933] rounded-md p-3 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo] = useState(null);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [videos, setVideos] = useState([]);

  const fetchData = useCallback(() => {
    setLoading(true);
    
    // Fetch analytics overview (real YouTube data)
    const overviewReq = axios.get(`${API}/analytics/overview`, { headers: authHeaders })
      .then(res => setOverview(res.data))
      .catch(() => {});
    
    // Fetch video-level analytics
    const videosReq = axios.get(`${API}/analytics/videos?limit=20`, { headers: authHeaders })
      .then(res => setVideos(res.data?.videos || []))
      .catch(() => {});
    
    // Fetch dashboard data (legacy + real)
    let url = `${API}/analytics/dashboard?range=${range}`;
    if (customFrom && customTo) {
      url = `${API}/analytics/dashboard?from_date=${format(customFrom, 'yyyy-MM-dd')}&to_date=${format(customTo, 'yyyy-MM-dd')}`;
    }
    const dashboardReq = axios.get(url, { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(err => {
        // Only show error for actual failures, not empty data
        if (err.response?.status >= 500) {
          toast.error('Failed to load analytics data');
        }
        console.error(err);
      });
    
    Promise.all([overviewReq, videosReq, dashboardReq])
      .finally(() => setLoading(false));
  }, [authHeaders, range, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync YouTube Analytics
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/analytics/sync`, {}, { headers: authHeaders });
      if (res.data.success) {
        toast.success(`Synced ${res.data.synced} videos from YouTube`);
        fetchData(); // Refresh data
      } else {
        toast.error(res.data.errors?.[0] || 'Sync failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to sync analytics');
    } finally {
      setSyncing(false);
    }
  };

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    setCustomFrom(null);
    setCustomTo(null);
  };

  const handleCustomDateChange = (type, date) => {
    if (type === 'from') {
      setCustomFrom(date);
      setFromOpen(false);
    } else {
      setCustomTo(date);
      setToOpen(false);
    }
  };

  // Format chart data - use real YouTube analytics if available
  const chartData = data?.youtubeAnalytics?.length > 0 
    ? data.youtubeAnalytics.slice(0, 30).map((v, i) => ({
        date: `Video ${i + 1}`,
        views: v.views,
        watchTime: Math.round(v.watchTimeMinutes),
        ctr: v.ctr,
      }))
    : data?.snapshots?.map(s => ({
        date: s.date?.slice(5) || '', // MM-DD format
        downloads: s.downloads,
        views: s.views,
        episodes: s.episodesPublished,
        roi: Math.round(s.roiEstimate || 0),
      })) || [];

  // Use real overview data for KPIs
  const totalViews = overview?.totalViews || data?.summary?.totalViews || 0;
  const totalWatchTime = overview?.totalWatchTimeMinutes || 0;
  const avgCtr = overview?.avgCtr || 0;
  const avgAvd = overview?.avgAvd || 0;
  const subscriberCount = overview?.subscriberCount || 0;
  const videoCount = overview?.videoCount || data?.summary?.totalEpisodes || 0;
  const lastSyncedAt = overview?.lastSyncedAt;

  return (
    <div data-testid="analytics-page" className="space-y-6">
      {/* Page Header with Sync Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Analytics
          </h1>
          <AuraTooltip content={tooltipContent.analytics.views30d} position="right">
            <p className="text-sm text-zinc-500 mt-0.5">Real YouTube Analytics for your channel.</p>
          </AuraTooltip>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncedAt && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last synced: {new Date(lastSyncedAt).toLocaleDateString()}
            </span>
          )}
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            size="sm"
            data-testid="sync-analytics-btn"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Analytics
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Range Selector */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {RANGES.map(r => (
                <Button
                  key={r.value}
                  variant={range === r.value && !customFrom ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleRangeChange(r.value)}
                  className={`h-8 text-xs ${
                    range === r.value && !customFrom
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  data-testid={`range-${r.value}`}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            
            <div className="h-5 w-px bg-[#1F2933] mx-2" />
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Custom:</span>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white"
                    data-testid="custom-from"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {customFrom ? format(customFrom, 'MMM d') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0B1120] border-[#1F2933]" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={(d) => handleCustomDateChange('from', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white"
                    data-testid="custom-to"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {customTo ? format(customTo, 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0B1120] border-[#1F2933]" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={(d) => handleCustomDateChange('to', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {data?.range && (
              <span className="text-[10px] text-zinc-600 ml-auto">
                {data.range.from} to {data.range.to}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <AuraSpinner size="md" />
        </div>
      ) : !data && !overview ? (
        <Card className="bg-[#0B1120] border-[#1F2933]">
          <CardContent className="py-16 text-center">
            <BarChart3 className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No analytics data yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Click "Sync Analytics" to fetch data from YouTube.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards - Real YouTube Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-row">
            <KPICard
              label="Total Views"
              value={totalViews.toLocaleString()}
              subtext="Across all Shorts"
              icon={Eye}
              tooltipContent={tooltipContent.analytics.views30d}
              delay={0}
            />
            <KPICard
              label="Watch Time"
              value={`${Math.round(totalWatchTime / 60)}h`}
              subtext={`${totalWatchTime.toLocaleString()} minutes total`}
              icon={Clock}
              delay={0.05}
              tooltipContent={tooltipContent.analytics.watchTime}
            />
            <KPICard
              label="Videos"
              value={videoCount}
              subtext={`${subscriberCount.toLocaleString()} subscribers`}
              icon={Radio}
              tooltipContent={tooltipContent.analytics.ctr}
              delay={0.1}
            />
            <KPICard
              label="Avg View Duration"
              value={`${Math.round(avgAvd)}s`}
              subtext={avgCtr > 0 ? `${avgCtr.toFixed(1)}% CTR` : 'CTR not available'}
              icon={TrendingUp}
              tooltipContent={tooltipContent.analytics.revenue}
              delay={0.15}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Downloads Chart */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="chart-downloads">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Download className="h-4 w-4 text-zinc-400" />
                  Downloads Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2933" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="downloads"
                        name="Downloads"
                        stroke="#6366F1"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#6366F1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Views Chart */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="chart-views">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-zinc-400" />
                  Views Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2933" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="views"
                        name="Views"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Episodes Published Chart */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="chart-episodes">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Radio className="h-4 w-4 text-zinc-400" />
                  Episodes Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2933" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="episodes" name="Episodes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ROI Chart */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="chart-roi">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-400" />
                  Estimated ROI Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2933" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="roi"
                        name="ROI"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fill="url(#roiGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
