import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FolderOpen, Eye, Download, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  PUBLISHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EDITING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DESIGN: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  INTAKE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const priorityColors = {
  High: 'text-red-400',
  Medium: 'text-amber-400',
  Low: 'text-zinc-400',
};

function StatCard({ title, value, icon: Icon, trend }) {
  return (
    <Card className="stat-card bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{title}</span>
          <div className="h-8 w-8 rounded-sm bg-indigo-500/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-indigo-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <p className="text-xs text-emerald-400 mt-1">+{trend}% from last period</p>
        )}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { authHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/dashboard/stats`, { headers: authHeaders })
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="overview-loading">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="overview-page" className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Submissions" value={stats?.totalSubmissions || 0} icon={FileText} />
        <StatCard title="Assets" value={stats?.totalAssets || 0} icon={FolderOpen} />
        <StatCard title="Total Views" value={stats?.totalViews || 0} icon={Eye} trend={12} />
        <StatCard title="Downloads" value={stats?.totalDownloads || 0} icon={Download} trend={8} />
        <StatCard title="New Subscribers" value={stats?.subscribersGained || 0} icon={Users} trend={15} />
      </div>

      {/* Chart + Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Analytics Chart */}
        <Card className="lg:col-span-8 bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Audience Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.analyticsData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    tickFormatter={v => v.slice(5)}
                    stroke="#27272a"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} stroke="#27272a" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} dot={false} name="Views" />
                  <Line type="monotone" dataKey="downloads" stroke="#818cf8" strokeWidth={2} dot={false} name="Downloads" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Summary */}
        <Card className="lg:col-span-4 bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Pipeline Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['INTAKE', 'EDITING', 'DESIGN', 'SCHEDULED', 'PUBLISHED'].map(status => {
                const count = stats?.recentSubmissions?.filter(s => s.status === status).length || 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[status]}`}>
                        {status}
                      </Badge>
                    </div>
                    <span className="text-sm font-mono text-zinc-300">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Recent Submissions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Title</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Type</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Priority</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Release</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recentSubmissions?.map(sub => (
                <TableRow key={sub.id} className="border-zinc-800 hover:bg-white/[0.02]">
                  <TableCell>
                    <div>
                      <p className="text-sm text-white font-medium">{sub.title}</p>
                      {sub.guest && <p className="text-xs text-zinc-500">w/ {sub.guest}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-400">{sub.contentType}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[sub.status]}`}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${priorityColors[sub.priority]}`}>
                      {sub.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-zinc-400">
                      {sub.releaseDate || '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
