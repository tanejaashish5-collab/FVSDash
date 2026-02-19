import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calculator, Clock, Zap, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RANGES = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '12 months' },
];

function KPICard({ label, value, subtext, icon: Icon, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    violet: 'bg-violet-500/10 text-violet-400',
  };
  
  return (
    <Card className="bg-[#0B1120] border-[#1F2933]" data-testid={`kpi-${label.toLowerCase().replace(/[\s().]+/g, '-')}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
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

  const fetchData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/roi/dashboard?range=${range}`, { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(err => {
        toast.error('Failed to load ROI data');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [authHeaders, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Chart data for cost vs ROI comparison
  const comparisonData = data ? [
    { name: 'Total Cost', value: data.totalCost, fill: '#EF4444' },
    { name: 'Total ROI', value: data.totalROI, fill: '#10B981' },
  ] : [];

  const roiMultipleColor = data?.roiMultiple >= 2 ? 'text-emerald-400' : data?.roiMultiple >= 1 ? 'text-amber-400' : 'text-red-400';
  const netProfitColor = data?.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div data-testid="roi-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          ROI Center
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Estimate the return on your investment in content.</p>
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
            />
            <KPICard
              label="Total ROI"
              value={`$${data.totalROI.toLocaleString()}`}
              subtext="Estimated return"
              icon={TrendingUp}
              color="emerald"
            />
            <KPICard
              label="ROI Multiple"
              value={`${data.roiMultiple}x`}
              subtext="Return on investment"
              icon={Zap}
              color="violet"
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
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-zinc-400" />
                    Cost Assumptions
                  </CardTitle>
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
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-zinc-400" />
                    ROI Breakdown
                  </CardTitle>
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

              {/* Additional Metrics */}
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
                    <p className="text-2xl font-bold text-white">{data.totalViews.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Across all content</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
