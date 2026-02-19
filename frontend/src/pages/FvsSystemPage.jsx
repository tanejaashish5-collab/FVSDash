import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Sparkles, Zap, Play, X, Check, Loader2, RefreshCw,
  Lightbulb, TrendingUp, Clock, Activity, Settings, Radio,
  FileText, Video, Image, Music, ChevronRight, AlertCircle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AUTOMATION_LEVELS = [
  { value: 'manual', label: 'Manual Only', description: 'No auto runs. You control everything.' },
  { value: 'semi_auto', label: 'Semi-Auto', description: 'Brain proposes ideas, you click to produce.' },
  { value: 'full_auto_short', label: 'Full Auto (Shorts)', description: 'Brain auto-produces short episodes overnight.' },
];

const statusCfg = {
  proposed: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Lightbulb },
  approved: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Check },
  rejected: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', icon: X },
  in_progress: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', icon: Loader2 },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: Check },
};

const sourceCfg = {
  youtube_analytics: { label: 'YouTube', color: 'text-red-400' },
  reddit: { label: 'Reddit', color: 'text-orange-400' },
  search_trends: { label: 'Search', color: 'text-blue-400' },
  competitor_analysis: { label: 'Competitors', color: 'text-purple-400' },
  audience_feedback: { label: 'Audience', color: 'text-emerald-400' },
  original: { label: 'Original', color: 'text-indigo-400' },
};

const activityIcons = {
  propose_ideas: Lightbulb,
  produce_episode: Video,
  default: Activity,
};

export default function FvsSystemPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [config, setConfig] = useState({ automationLevel: 'manual' });
  const [snapshot, setSnapshot] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [producing, setProducing] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, snapshotRes, ideasRes, activityRes] = await Promise.all([
        axios.get(`${API}/fvs/config`, { headers: authHeaders }),
        axios.get(`${API}/fvs/brain-snapshot`, { headers: authHeaders }),
        axios.get(`${API}/fvs/ideas`, { headers: authHeaders }),
        axios.get(`${API}/fvs/activity`, { headers: authHeaders }),
      ]);
      setConfig(configRes.data || { automationLevel: 'manual' });
      setSnapshot(snapshotRes.data);
      setIdeas(ideasRes.data || []);
      setActivities(activityRes.data || []);
    } catch (err) {
      console.error('Failed to fetch FVS data:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save automation config
  const handleSaveConfig = async (level) => {
    setSavingConfig(true);
    try {
      const res = await axios.put(`${API}/fvs/config`, { automationLevel: level }, { headers: authHeaders });
      setConfig(res.data);
      toast.success(`Automation set to ${AUTOMATION_LEVELS.find(l => l.value === level)?.label}`);
    } catch (err) {
      toast.error('Failed to save automation settings');
    } finally {
      setSavingConfig(false);
    }
  };

  // Propose ideas
  const handleProposeIdeas = async () => {
    setProposing(true);
    try {
      const res = await axios.post(`${API}/fvs/propose-ideas`, { format: 'short', range: '30d' }, { headers: authHeaders });
      setIdeas(prev => [...res.data.ideas, ...prev]);
      setSnapshot(res.data.snapshot);
      setActivities(prev => [{
        id: Date.now().toString(),
        action: 'propose_ideas',
        description: `FVS proposed ${res.data.ideas.length} new short ideas`,
        createdAt: new Date().toISOString()
      }, ...prev]);
      toast.success(`Generated ${res.data.ideas.length} new episode ideas`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to propose ideas');
    } finally {
      setProposing(false);
    }
  };

  // Produce episode
  const handleProduceEpisode = async (ideaId) => {
    setProducing(ideaId);
    try {
      const res = await axios.post(`${API}/fvs/produce-episode`, { ideaId, mode: 'full_auto_short' }, { headers: authHeaders });
      
      // Update ideas list
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: 'completed', submissionId: res.data.submission.id } : i));
      
      // Add activity
      setActivities(prev => [{
        id: Date.now().toString(),
        action: 'produce_episode',
        description: `FVS produced episode '${res.data.submission.title}'`,
        metadata: res.data,
        createdAt: new Date().toISOString()
      }, ...prev]);
      
      toast.success(`Episode '${res.data.submission.title}' created!`, {
        description: 'Script, audio, video, and thumbnail generated.'
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to produce episode');
    } finally {
      setProducing(null);
    }
  };

  // Reject idea
  const handleRejectIdea = async (ideaId) => {
    try {
      await axios.patch(`${API}/fvs/ideas/${ideaId}/status`, { status: 'rejected' }, { headers: authHeaders });
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: 'rejected' } : i));
      toast.success('Idea rejected');
    } catch (err) {
      toast.error('Failed to reject idea');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatConviction = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 80) return { text: `${pct}%`, color: 'text-emerald-400' };
    if (pct >= 60) return { text: `${pct}%`, color: 'text-amber-400' };
    return { text: `${pct}%`, color: 'text-zinc-400' };
  };

  const proposedIdeas = ideas.filter(i => i.status === 'proposed');
  const inProgressIdeas = ideas.filter(i => i.status === 'in_progress');
  const completedIdeas = ideas.filter(i => i.status === 'completed');

  return (
    <div data-testid="fvs-system-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            FVS System
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Autonomous brain for ideas, scripting, and production.</p>
        </div>
        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1">
          <Brain className="h-3.5 w-3.5 mr-1.5" />
          Active
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Automation Controls */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="automation-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-400" />
                Automation Level
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Control how autonomously FVS operates for your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.automationLevel}
                onValueChange={handleSaveConfig}
                disabled={savingConfig}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                {AUTOMATION_LEVELS.map(level => (
                  <Label
                    key={level.value}
                    htmlFor={level.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      config.automationLevel === level.value
                        ? 'bg-indigo-500/10 border-indigo-500/30'
                        : 'bg-zinc-950/50 border-[#1F2933] hover:border-zinc-700'
                    }`}
                  >
                    <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{level.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{level.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Brain Snapshot */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="brain-snapshot-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Brain className="h-4 w-4 text-indigo-400" />
                      What FVS Has Learned
                    </CardTitle>
                    {snapshot && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">
                        {snapshot.timeWindow}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {snapshot ? (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-300 leading-relaxed">{snapshot.summary}</p>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Top Patterns</p>
                        <ul className="space-y-1.5">
                          {snapshot.topPatterns?.map((pattern, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                              <TrendingUp className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                              {pattern}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <p className="text-[10px] text-zinc-600">
                        Last updated: {formatDate(snapshot.createdAt)}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">No brain snapshot yet.</p>
                      <p className="text-xs text-zinc-600 mt-1">Run the brain to analyze your content.</p>
                    </div>
                  )}
                  
                  <Separator className="bg-[#1F2933] my-4" />
                  
                  <Button
                    onClick={handleProposeIdeas}
                    disabled={proposing}
                    className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
                    data-testid="run-brain-btn"
                  >
                    {proposing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Run Brain Now (Propose Ideas)
                  </Button>
                </CardContent>
              </Card>

              {/* Activity Log */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="activity-log-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[240px]">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <Clock className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">No activity yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#1F2933]">
                        {activities.slice(0, 10).map(activity => {
                          const Icon = activityIcons[activity.action] || activityIcons.default;
                          return (
                            <div key={activity.id} className="flex items-start gap-3 p-4">
                              <div className="h-7 w-7 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <Icon className="h-3.5 w-3.5 text-indigo-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-300">{activity.description}</p>
                                <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(activity.createdAt)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right: Idea Queue */}
            <div className="lg:col-span-7">
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="idea-queue-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      Episode Ideas
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                        {proposedIdeas.length} proposed
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {completedIdeas.length} completed
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  {ideas.length === 0 ? (
                    <div className="text-center py-12">
                      <Lightbulb className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">No ideas yet.</p>
                      <p className="text-xs text-zinc-600 mt-1">Click "Run Brain Now" to generate ideas.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#1F2933] hover:bg-transparent">
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Topic</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-20">Format</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-20">Score</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-20">Source</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-24">Status</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ideas.map(idea => {
                          const sc = statusCfg[idea.status] || statusCfg.proposed;
                          const StatusIcon = sc.icon;
                          const conviction = formatConviction(idea.convictionScore);
                          const source = sourceCfg[idea.source] || sourceCfg.original;
                          
                          return (
                            <TableRow
                              key={idea.id}
                              className="border-[#1F2933] hover:bg-white/[0.02]"
                              data-testid={`idea-row-${idea.id}`}
                            >
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p className="text-sm text-white font-medium truncate">{idea.topic}</p>
                                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{idea.hypothesis}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-400">
                                  {idea.format}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs font-mono font-medium ${conviction.color}`}>
                                  {conviction.text}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`text-[10px] ${source.color}`}>{source.label}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                                  <StatusIcon className={`h-3 w-3 mr-1 ${idea.status === 'in_progress' ? 'animate-spin' : ''}`} />
                                  {idea.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {idea.status === 'proposed' && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/dashboard/strategy/idea/${idea.id}`)}
                                      className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                      data-testid={`view-idea-btn-${idea.id}`}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleProduceEpisode(idea.id)}
                                      disabled={producing === idea.id}
                                      className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                      data-testid={`produce-btn-${idea.id}`}
                                    >
                                      {producing === idea.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Play className="h-3 w-3 mr-1" />
                                          Produce
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRejectIdea(idea.id)}
                                      className="h-7 px-2 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                      data-testid={`reject-btn-${idea.id}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {idea.status === 'in_progress' && (
                                  <span className="text-[10px] text-violet-400">Processing...</span>
                                )}
                                {/* Deep-link to view the produced submission when idea is completed */}
                                {idea.status === 'completed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => idea.submissionId && navigate(`/dashboard/submissions/${idea.submissionId}`)}
                                    disabled={!idea.submissionId}
                                    className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                    data-testid={`view-episode-btn-${idea.id}`}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Episode
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{proposedIdeas.length}</p>
                  <p className="text-[10px] text-zinc-500">Proposed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{inProgressIdeas.length}</p>
                  <p className="text-[10px] text-zinc-500">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{completedIdeas.length}</p>
                  <p className="text-[10px] text-zinc-500">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{activities.length}</p>
                  <p className="text-[10px] text-zinc-500">Actions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
