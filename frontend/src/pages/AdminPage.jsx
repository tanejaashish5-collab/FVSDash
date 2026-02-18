import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldCheck, Users, Eye, UserCheck, HelpCircle, X,
  FileText, Download, BarChart3, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const { authHeaders, startImpersonation } = useAuth();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSummary, setClientSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [authHeaders]);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/admin/clients`, { headers: authHeaders });
      setClients(res.data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSummary = async (client) => {
    setSelectedClient(client);
    setSummaryLoading(true);
    try {
      const res = await axios.get(`${API}/admin/clients/${client.id}/summary`, { headers: authHeaders });
      setClientSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch client summary:', err);
      toast.error('Failed to load client summary');
      setClientSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleImpersonate = async (client) => {
    try {
      const res = await axios.post(`${API}/admin/impersonate`, { clientId: client.id }, { headers: authHeaders });
      const { clientId, clientName } = res.data;
      startImpersonation(clientId, clientName);
      toast.success(`Now viewing dashboard as ${clientName}`);
      navigate('/dashboard/overview');
    } catch (err) {
      console.error('Failed to impersonate:', err);
      toast.error('Failed to impersonate client. Please try again.');
    }
  };

  const closeSummary = () => {
    setSelectedClient(null);
    setClientSummary(null);
  };

  const showAdminTour = () => {
    toast.info('1. Use this table to view all clients and their activity.', { duration: 4000 });
    setTimeout(() => {
      toast.info('2. Click "View Summary" to see client stats at a glance.', { duration: 4000 });
    }, 1000);
    setTimeout(() => {
      toast.info('3. Click "Impersonate" to see the dashboard as the selected client.', { duration: 4000 });
    }, 2000);
    setTimeout(() => {
      toast.info('4. Use the yellow banner to exit impersonation and return to admin view.', { duration: 4000 });
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="admin-loading">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-sm bg-indigo-500/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Admin Dashboard
            </h1>
            <p className="text-xs text-zinc-500">Manage clients and impersonation controls</p>
          </div>
        </div>
        <button
          data-testid="admin-help-btn"
          onClick={showAdminTour}
          className="h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          title="Show admin guide"
        >
          <HelpCircle className="h-4 w-4 text-zinc-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className={`${selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" />
                <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  All Clients ({clients.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Client</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Plan</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Submissions</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Last Activity</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(client => (
                    <TableRow key={client.id} className="border-zinc-800 hover:bg-white/[0.02]">
                      <TableCell>
                        <div>
                          <p className="text-sm text-white font-medium">{client.name}</p>
                          <p className="text-xs text-zinc-500">{client.primaryContactEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 ${
                            client.plan === 'Enterprise' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : client.plan === 'Pro'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {client.plan || 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-300">{client.submissionsCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-500">
                          {client.lastActivityDate 
                            ? new Date(client.lastActivityDate).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`view-summary-${client.id}`}
                            onClick={() => handleViewSummary(client)}
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`impersonate-${client.id}`}
                            onClick={() => handleImpersonate(client)}
                            className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Impersonate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                        No clients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Client Summary Panel */}
        {selectedClient && (
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900/50 border-zinc-800 sticky top-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Client Summary
                  </CardTitle>
                  <button
                    onClick={closeSummary}
                    className="h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>
                <p className="text-lg font-bold text-indigo-400">{selectedClient.name}</p>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : clientSummary ? (
                  <div className="space-y-4">
                    {/* Last 30 Days Metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-zinc-800/50 rounded p-2 text-center">
                        <FileText className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{clientSummary.metricsLast30Days.totalSubmissions || 0}</p>
                        <p className="text-[10px] text-zinc-500">Submissions</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded p-2 text-center">
                        <BarChart3 className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{clientSummary.metricsLast30Days.totalViews?.toLocaleString() || 0}</p>
                        <p className="text-[10px] text-zinc-500">Views</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded p-2 text-center">
                        <Download className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{clientSummary.metricsLast30Days.totalDownloads?.toLocaleString() || 0}</p>
                        <p className="text-[10px] text-zinc-500">Downloads</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center">Last 30 days</p>

                    {/* Billing Status */}
                    <div className="flex items-center justify-between py-2 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-zinc-500" />
                        <span className="text-xs text-zinc-400">Billing</span>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 ${
                            clientSummary.billingStatus === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {clientSummary.billingStatus || 'demo/mock'}
                        </Badge>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{clientSummary.billingPlan || 'demo/mock'}</p>
                      </div>
                    </div>

                    {/* Recent Submissions */}
                    <div className="border-t border-zinc-800 pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                        Recent Submissions (Last 5)
                      </p>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {clientSummary.recentSubmissions.length > 0 ? (
                            clientSummary.recentSubmissions.map((sub, idx) => (
                              <div key={sub.id || idx} className="flex items-center justify-between py-1">
                                <div className="min-w-0 flex-1 mr-2">
                                  <p className="text-xs text-white truncate">{sub.title}</p>
                                  <p className="text-[10px] text-zinc-500">{sub.contentType}</p>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] px-1 py-0 shrink-0 ${
                                    sub.status === 'PUBLISHED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : sub.status === 'SCHEDULED'
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                  }`}
                                >
                                  {sub.status}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-zinc-500 text-center py-4">No recent submissions</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Impersonate Button */}
                    <Button
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                      onClick={() => handleImpersonate(selectedClient)}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Impersonate This Client
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-8">Failed to load summary</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
