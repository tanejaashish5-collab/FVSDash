import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, Calculator, Clock, Zap, BarChart3, Eye, Settings, ChevronRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RANGES = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '12 months' },
];

function KPICard({ label, value, subtext, icon: Icon, color = 'indigo', tooltipText }) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    violet: 'bg-violet-500/10 text-violet-400',
  };
  
  const labelElement = tooltipText ? (
    <AuraTooltip content={tooltipText} position="top">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
    </AuraTooltip>
  ) : (
    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
  );
  
  return (
    <Card className="bg-[#0B1120] border-[#1F2933]" data-testid={`kpi-${label.toLowerCase().replace(/[\s().]+/g, '-')}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          {labelElement}
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${colorClasses[color].split(' ')[0]}`}>
            <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[1]}`} />
          </div>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {value}
        </p>
        <p className="text-xs text-zinc-500 mt-1.5">{subtext}</p>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B1120] border border-[#1F2933] rounded-md p-3 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: entry.color || entry.fill }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ROIPage() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // ROI Settings with YouTube-native defaults
  const [cpmRate, setCpmRate] = useState(() => {
    const saved = localStorage.getItem('fvs_cpm_rate');
    return saved ? parseFloat(saved) : 1.50; // $1.50 default for Indian audience
  });
  const [sponsorshipPerVideo, setSponsorshipPerVideo] = useState(() => {
    const saved = localStorage.getItem('fvs_sponsorship_rate');
    return saved ? parseFloat(saved) : 0; // $0 default
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    
    // Fetch ROI dashboard data
    const roiReq = axios.get(`${API}/roi/dashboard?range=${range}`, { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
      });
    
    // Fetch real YouTube analytics for enhanced ROI calculation
    const analyticsReq = axios.get(`${API}/analytics/videos?limit=100`, { headers: authHeaders })
      .then(res => setAnalyticsData(res.data))
      .catch(() => {});
    
    // Fetch overview for subscriber count
    const overviewReq = axios.get(`${API}/analytics/overview`, { headers: authHeaders })
      .then(res => setOverviewData(res.data))
      .catch(() => {});
    
    Promise.all([roiReq, analyticsReq, overviewReq])
      .finally(() => setLoading(false));
  }, [authHeaders, range]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('fvs_cpm_rate', cpmRate.toString());
    localStorage.setItem('fvs_sponsorship_rate', sponsorshipPerVideo.toString());
    toast.success('ROI settings saved');
    setShowSettings(false);
  };

  // Calculate enhanced metrics from real YouTube data using CPM model
  const realViews = overviewData?.totalViews || analyticsData?.videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;
  const realWatchTime = analyticsData?.videos?.reduce((sum, v) => sum + (v.watchTimeMinutes || 0), 0) || 0;
  const videoCount = overviewData?.videoCount || analyticsData?.videos?.length || data?.episodesPublished || 0;
  
  // YouTube-native ROI calculation
  // Ad Revenue = (Views / 1000) * CPM
  const estimatedAdRevenue = (realViews / 1000) * cpmRate;
  // Sponsorship Revenue = Videos * Sponsorship Rate per Video
  const estimatedSponsorshipRevenue = videoCount * sponsorshipPerVideo;
  // Total Revenue
  const totalEstimatedRevenue = estimatedAdRevenue + estimatedSponsorshipRevenue;
  
  // Calculate production cost from data
  const productionCost = data?.totalCost || 0;
  const netProfit = totalEstimatedRevenue - productionCost;
  const roiMultiple = productionCost > 0 ? (totalEstimatedRevenue / productionCost).toFixed(2) : 0;

  // Chart data for revenue breakdown
  const revenueBreakdown = [
    { name: 'Ad Revenue', value: Math.round(estimatedAdRevenue), fill: '#10B981' },
    { name: 'Sponsorships', value: Math.round(estimatedSponsorshipRevenue), fill: '#8B5CF6' },
  ];
  
  // Chart data for cost vs ROI comparison
  const comparisonData = [
    { name: 'Production Cost', value: productionCost, fill: '#EF4444' },
    { name: 'Total Revenue', value: Math.round(totalEstimatedRevenue), fill: '#10B981' },
  ];

  const roiMultipleColor = parseFloat(roiMultiple) >= 2 ? 'text-emerald-400' : parseFloat(roiMultiple) >= 1 ? 'text-amber-400' : 'text-red-400';
  const netProfitColor = netProfit >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div data-testid="roi-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <AuraTooltip content={tooltipContent.roiCenter.roiCalculation} position="right">
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              ROI Center
            </h1>
          </AuraTooltip>
          <p className="text-sm text-zinc-500 mt-0.5">YouTube-native revenue estimation based on CPM and sponsorships.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800"
          data-testid="roi-settings-btn"
        >
          <Settings className="h-4 w-4 mr-2" />
          ROI Settings
        </Button>
      </div>

      {/* Range Selector */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Time period:</span>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <Button
                  key={r.value}
                  variant={range === r.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRange(r.value)}
                  className={`h-8 text-xs ${
                    range === r.value
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  data-testid={`range-${r.value}`}
                >
                  {r.label}
                </Button>
              ))}
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
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.episodesPublished === 0 ? (
        <Card className="bg-[#0B1120] border-[#1F2933]">
          <CardContent className="py-16 text-center">
            <Calculator className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Not enough data yet to compute ROI.</p>
            <p className="text-xs text-zinc-600 mt-1">Publish more episodes to see ROI here.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-row">
            <KPICard
              label="Total Cost"
              value={`$${data.totalCost.toLocaleString()}`}
              subtext={`Last ${data.range.days} days`}
              icon={DollarSign}
              color="amber"
              tooltipText={tooltipContent.roiCenter.totalInvestment}
            />
            <KPICard
              label="Total ROI"
              value={`$${data.totalROI.toLocaleString()}`}
              subtext="Estimated return"
              icon={TrendingUp}
              color="emerald"
              tooltipText={tooltipContent.roiCenter.totalReturn}
            />
            <KPICard
              label="ROI Multiple"
              value={`${data.roiMultiple}x`}
              subtext="Return on investment"
              icon={Zap}
              color="violet"
              tooltipText={tooltipContent.roiCenter.paybackPeriod}
            />
            <KPICard
              label="Episodes"
              value={data.episodesPublished}
              subtext="Published in period"
              icon={BarChart3}
              color="indigo"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Cost Assumptions */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="cost-assumptions">
                <CardHeader className="pb-3">
                  <AuraTooltip content={tooltipContent.roiCenter.costPerVideo} position="right">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-zinc-400" />
                      Cost Assumptions
                    </CardTitle>
                  </AuraTooltip>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                    <div>
                      <p className="text-xs text-zinc-500">Hourly Rate</p>
                      <p className="text-lg font-semibold text-white">${data.hourlyRate}</p>
                    </div>
                    <Clock className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                    <div>
                      <p className="text-xs text-zinc-500">Hours per Episode</p>
                      <p className="text-lg font-semibold text-white">{data.hoursPerEpisode} hrs</p>
                    </div>
                    <Clock className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                    <div>
                      <p className="text-xs text-zinc-500">Cost per Episode</p>
                      <p className="text-lg font-semibold text-white">${data.costPerEpisode}</p>
                    </div>
                    <DollarSign className="h-5 w-5 text-zinc-600" />
                  </div>
                  <p className="text-[10px] text-zinc-600 italic">
                    These values are configurable in Settings.
                  </p>
                </CardContent>
              </Card>

              {/* Net Profit Card */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="net-profit">
                <CardContent className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Net Profit</p>
                  <p className={`text-4xl font-bold tracking-tight ${netProfitColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {data.netProfit >= 0 ? '+' : ''}${data.netProfit.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Total ROI minus Total Cost
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right: ROI Breakdown */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="roi-breakdown">
                <CardHeader className="pb-3">
                  <AuraTooltip content={tooltipContent.roiCenter.revenuePerVideo} position="right">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-zinc-400" />
                      ROI Breakdown
                    </CardTitle>
                  </AuraTooltip>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-zinc-950/50 border border-[#1F2933] mb-6">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Based on <span className="text-white font-semibold">{data.episodesPublished} episode{data.episodesPublished !== 1 ? 's' : ''}</span> and{' '}
                      <span className="text-white font-semibold">{data.hoursPerEpisode} hours</span> per episode at{' '}
                      <span className="text-white font-semibold">${data.hourlyRate}/hr</span>, your estimated content cost is{' '}
                      <span className="text-amber-400 font-semibold">${data.totalCost.toLocaleString()}</span>, and your estimated ROI is{' '}
                      <span className="text-emerald-400 font-semibold">${data.totalROI.toLocaleString()}</span>{' '}
                      <span className={`font-bold ${roiMultipleColor}`}>({data.roiMultiple}×)</span>.
                    </p>
                  </div>

                  {/* Comparison Chart */}
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2933" />
                        <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#1F2933' }} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {comparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Metrics - Enhanced with Real Data */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-[#0B1120] border-[#1F2933]">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Total Downloads</p>
                    <p className="text-2xl font-bold text-white">{data.totalDownloads.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">In this period</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0B1120] border-[#1F2933]">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-white">
                      {(realViews > 0 ? realViews : data.totalViews).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {realViews > 0 ? 'From YouTube Analytics' : 'Across all content'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Real YouTube Watch Time Card */}
              {realWatchTime > 0 && (
                <Card className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Real Watch Time</p>
                        <p className="text-3xl font-bold text-white">{Math.round(realWatchTime / 60)}h {Math.round(realWatchTime % 60)}m</p>
                        <p className="text-xs text-violet-400 mt-1">
                          {realWatchTime.toLocaleString()} total minutes from YouTube Analytics
                        </p>
                      </div>
                      <div className="h-14 w-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Clock className="h-7 w-7 text-violet-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
