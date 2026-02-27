import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, Users, Eye, UserCheck, HelpCircle, X, Plus, Pencil, Ban,
  FileText, Download, BarChart3, CreditCard, Youtube, Check
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
  
  // Slide-over states
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Deactivation confirmation
  const [deactivatingClientId, setDeactivatingClientId] = useState(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    niche: '',
    language_style: 'English',
    content_pillars: [],
    channel_description: ''
  });
  const [pillarInput, setPillarInput] = useState('');

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

  // Create new client
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setFormSubmitting(true);
    try {
      await axios.post(`${API}/admin/clients`, formData, { headers: authHeaders });
      toast.success(`${formData.full_name} channel created successfully`);
      setShowAddPanel(false);
      resetForm();
      fetchClients();
    } catch (err) {
      console.error('Failed to create client:', err);
      const msg = err.response?.data?.detail || 'Failed to create client';
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Update client
  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editingClient) return;
    
    setFormSubmitting(true);
    try {
      await axios.patch(`${API}/admin/clients/${editingClient.id}`, {
        full_name: formData.full_name || undefined,
        email: formData.email || undefined,
        channel_description: formData.channel_description || undefined,
        niche: formData.niche || undefined
      }, { headers: authHeaders });
      toast.success('Client updated successfully');
      setShowEditPanel(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (err) {
      console.error('Failed to update client:', err);
      const msg = err.response?.data?.detail || 'Failed to update client';
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Deactivate client
  const handleDeactivate = async (clientId) => {
    try {
      await axios.delete(`${API}/admin/clients/${clientId}`, { headers: authHeaders });
      toast.success('Client deactivated');
      setDeactivatingClientId(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to deactivate client:', err);
      toast.error('Failed to deactivate client');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      niche: '',
      language_style: 'English',
      content_pillars: [],
      channel_description: ''
    });
    setPillarInput('');
  };

  const openEditPanel = (client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.name || '',
      email: client.primaryContactEmail || '',
      password: '',
      niche: '',
      language_style: 'English',
      content_pillars: [],
      channel_description: ''
    });
    setShowEditPanel(true);
  };

  const addPillar = () => {
    if (pillarInput.trim() && !formData.content_pillars.includes(pillarInput.trim())) {
      setFormData({
        ...formData,
        content_pillars: [...formData.content_pillars, pillarInput.trim()]
      });
      setPillarInput('');
    }
  };

  const removePillar = (pillar) => {
    setFormData({
      ...formData,
      content_pillars: formData.content_pillars.filter(p => p !== pillar)
    });
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
        <div className="flex items-center gap-2">
          <Button
            data-testid="add-new-channel-btn"
            onClick={() => { resetForm(); setShowAddPanel(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Channel
          </Button>
          <button
            data-testid="admin-help-btn"
            onClick={showAdminTour}
            className="h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            title="Show admin guide"
          >
            <HelpCircle className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
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
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Channel</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">YouTube</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Subs</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Videos</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</TableHead>
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
                        <span className="text-xs text-zinc-300">{client.channel_name || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className={`h-2.5 w-2.5 rounded-full ${client.youtube_connected ? 'bg-emerald-500' : 'bg-red-500'}`} 
                          title={client.youtube_connected ? 'Connected' : 'Not connected'} 
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-300">
                          {client.subscriber_count ? client.subscriber_count.toLocaleString() : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-300">{client.total_videos || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 ${
                            client.is_active 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {client.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {deactivatingClientId === client.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[10px] text-zinc-400 mr-2">Deactivate?</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(client.id)}
                              className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivatingClientId(null)}
                              className="h-6 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`edit-${client.id}`}
                              onClick={() => openEditPanel(client)}
                              className="h-7 px-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`deactivate-${client.id}`}
                              onClick={() => setDeactivatingClientId(client.id)}
                              className="h-7 px-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
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

      {/* Add New Channel Slide-over */}
      {showAddPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddPanel(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Add New Channel
              </h2>
              <button
                onClick={() => setShowAddPanel(false)}
                className="h-8 w-8 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
              <div>
                <Label className="text-zinc-400 text-xs">Channel Name *</Label>
                <Input
                  data-testid="input-channel-name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="e.g. Chanakya Sutra"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Email Address *</Label>
                <Input
                  data-testid="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. creator@email.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Password *</Label>
                <Input
                  data-testid="input-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter password"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
              
              <div className="border-t border-zinc-800 pt-4">
                <Label className="text-zinc-400 text-xs">Channel Niche *</Label>
                <Input
                  data-testid="input-niche"
                  value={formData.niche}
                  onChange={(e) => setFormData({...formData, niche: e.target.value})}
                  placeholder="e.g. Chanakya wisdom, ancient strategy"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Language Style</Label>
                <select
                  data-testid="select-language"
                  value={formData.language_style}
                  onChange={(e) => setFormData({...formData, language_style: e.target.value})}
                  className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
                >
                  <option value="Hinglish">Hinglish</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                </select>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Content Pillars</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={pillarInput}
                    onChange={(e) => setPillarInput(e.target.value)}
                    placeholder="Add a pillar..."
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPillar(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addPillar} className="border-zinc-700">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.content_pillars.map(pillar => (
                    <Badge key={pillar} variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/20">
                      {pillar}
                      <button type="button" onClick={() => removePillar(pillar)} className="ml-1 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Channel Description</Label>
                <Textarea
                  data-testid="input-description"
                  value={formData.channel_description}
                  onChange={(e) => setFormData({...formData, channel_description: e.target.value})}
                  placeholder="Brief description of the channel..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <Button type="button" variant="outline" onClick={() => setShowAddPanel(false)} className="flex-1 border-zinc-700">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="create-channel-btn"
                  disabled={formSubmitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {formSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Create Channel'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Slide-over */}
      {showEditPanel && editingClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowEditPanel(false); setEditingClient(null); }} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Edit Client
              </h2>
              <button
                onClick={() => { setShowEditPanel(false); setEditingClient(null); }}
                className="h-8 w-8 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateClient} className="p-4 space-y-4">
              <div>
                <Label className="text-zinc-400 text-xs">Channel Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="e.g. Chanakya Sutra"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. creator@email.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Channel Niche</Label>
                <Input
                  value={formData.niche}
                  onChange={(e) => setFormData({...formData, niche: e.target.value})}
                  placeholder="e.g. Tech Reviews"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Channel Description</Label>
                <Textarea
                  value={formData.channel_description}
                  onChange={(e) => setFormData({...formData, channel_description: e.target.value})}
                  placeholder="Brief description..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <Button type="button" variant="outline" onClick={() => { setShowEditPanel(false); setEditingClient(null); }} className="flex-1 border-zinc-700">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={formSubmitting}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  {formSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
