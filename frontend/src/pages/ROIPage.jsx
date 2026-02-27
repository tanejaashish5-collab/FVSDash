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
      ) : realViews === 0 && videoCount === 0 ? (
        <Card className="bg-[#0B1120] border-[#1F2933]">
          <CardContent className="py-16 text-center">
            <Calculator className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Not enough data yet to compute ROI.</p>
            <p className="text-xs text-zinc-600 mt-1">Connect your YouTube channel and sync analytics to see revenue estimates.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards - YouTube-Native Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-row">
            <KPICard
              label="Total Views"
              value={realViews.toLocaleString()}
              subtext="From connected channel"
              icon={Eye}
              color="indigo"
              tooltipText="Real view count from your YouTube channel"
            />
            <KPICard
              label="Est. Ad Revenue"
              value={`$${estimatedAdRevenue.toFixed(2)}`}
              subtext={`Based on $${cpmRate.toFixed(2)} CPM`}
              icon={DollarSign}
              color="emerald"
              tooltipText={tooltipContent.roiCenter.totalReturn}
            />
            <KPICard
              label="Est. Sponsorship"
              value={`$${estimatedSponsorshipRevenue.toFixed(2)}`}
              subtext={`${videoCount} videos × $${sponsorshipPerVideo}`}
              icon={TrendingUp}
              color="violet"
              tooltipText="Potential sponsorship revenue based on your rate per video"
            />
            <KPICard
              label="Total Revenue"
              value={`$${totalEstimatedRevenue.toFixed(2)}`}
              subtext="Ad + Sponsorship"
              icon={Zap}
              color="amber"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Revenue Model Info */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="revenue-model">
                <CardHeader className="pb-3">
                  <AuraTooltip content="YouTube-native revenue model based on CPM and sponsorship rates" position="right">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-zinc-400" />
                      Revenue Model
                    </CardTitle>
                  </AuraTooltip>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                    <div>
                      <p className="text-xs text-zinc-500">CPM Rate</p>
                      <p className="text-lg font-semibold text-white">${cpmRate.toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                    <div>
                      <p className="text-xs text-zinc-500">Sponsorship / Video</p>
                      <p className="text-lg font-semibold text-white">${sponsorshipPerVideo.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                    <div>
                      <p className="text-xs text-zinc-500">Videos Published</p>
                      <p className="text-lg font-semibold text-white">{videoCount}</p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="w-full bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                  >
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Adjust Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Net Profit Card */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="net-profit">
                <CardContent className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Net Profit</p>
                  <p className={`text-4xl font-bold tracking-tight ${netProfitColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Total Revenue minus Production Cost
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#1F2933]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">ROI Multiple</span>
                      <span className={`font-bold ${roiMultipleColor}`}>{roiMultiple}×</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* CPM Info Card */}
              <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-indigo-300 font-medium">About CPM Rates</p>
                      <p className="text-[10px] text-indigo-200/70 mt-1 leading-relaxed">
                        Indian YouTube CPM typically ranges from $0.50-$2.50. The default $1.50 is a conservative middle estimate. Adjust based on your niche and audience location.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Revenue Breakdown */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="roi-breakdown">
                <CardHeader className="pb-3">
                  <AuraTooltip content={tooltipContent.roiCenter.revenuePerVideo} position="right">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-zinc-400" />
                      Revenue Breakdown
                    </CardTitle>
                  </AuraTooltip>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-zinc-950/50 border border-[#1F2933] mb-6">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Based on <span className="text-white font-semibold">{realViews.toLocaleString()} views</span> at{' '}
                      <span className="text-white font-semibold">${cpmRate.toFixed(2)} CPM</span>, your estimated ad revenue is{' '}
                      <span className="text-emerald-400 font-semibold">${estimatedAdRevenue.toFixed(2)}</span>.
                      {sponsorshipPerVideo > 0 && (
                        <> Plus <span className="text-violet-400 font-semibold">${estimatedSponsorshipRevenue.toFixed(2)}</span> from sponsorships ({videoCount} videos × ${sponsorshipPerVideo}).</>
                      )}
                      {' '}Total estimated revenue: <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>${totalEstimatedRevenue.toFixed(2)}</span>.
                    </p>
                  </div>

                  {/* Comparison Chart */}
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2933" />
                        <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#1F2933' }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#1F2933' }} width={100} />
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
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Ad Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400" data-testid="ad-revenue-value">${estimatedAdRevenue.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500 mt-1">({realViews.toLocaleString()} views × ${cpmRate} CPM / 1000)</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0B1120] border-[#1F2933]">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Sponsorship Revenue</p>
                    <p className="text-2xl font-bold text-violet-400">${estimatedSponsorshipRevenue.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500 mt-1">({videoCount} videos × ${sponsorshipPerVideo} each)</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0B1120] border-[#1F2933]">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Production Cost</p>
                    <p className="text-2xl font-bold text-red-400">${productionCost.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Based on hours invested</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#0B1120] border-[#1F2933]">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Revenue per 1K Views</p>
                    <p className="text-2xl font-bold text-white">${cpmRate.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500 mt-1">Your configured CPM</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* ROI Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="bg-[#0B1120] border-l border-[#1F2933] w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-400" />
              ROI Settings
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CPM Rate ($)</label>
              <p className="text-[10px] text-zinc-500 mt-1 mb-2">Revenue per 1,000 views. Indian CPM typically ranges $0.50-$2.50.</p>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cpmRate}
                onChange={(e) => setCpmRate(parseFloat(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 text-white"
                data-testid="cpm-rate-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sponsorship Revenue per Video ($)</label>
              <p className="text-[10px] text-zinc-500 mt-1 mb-2">Average sponsorship income you earn per video. Set to $0 if no sponsorships.</p>
              <Input
                type="number"
                step="1"
                min="0"
                value={sponsorshipPerVideo}
                onChange={(e) => setSponsorshipPerVideo(parseFloat(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 text-white"
                data-testid="sponsorship-rate-input"
              />
            </div>
            <div className="pt-4 border-t border-[#1F2933]">
              <Button onClick={saveSettings} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="save-roi-settings">
                Save Settings
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
