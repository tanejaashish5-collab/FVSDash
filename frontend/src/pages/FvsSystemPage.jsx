import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Brain, Sparkles, Zap, Play, X, Check, Loader2, RefreshCw,
  Lightbulb, TrendingUp, Clock, Activity, ExternalLink,
  FileText, ChevronRight, AlertCircle, Eye,
  Copy, Send, Hash, Target, Radar, Swords, ArrowRight,
  Layers, Calendar, CheckCircle2, BarChart2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Source label map
const SOURCE_LABELS = {
  youtube_analytics:  { label: 'Analytics',   color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  reddit:             { label: 'Reddit',       color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  search_trends:      { label: 'Trend',        color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  competitor_analysis:{ label: 'Competitor',   color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  audience_feedback:  { label: 'Audience',     color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ai_recommendation:  { label: 'AI',           color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  original:           { label: 'AI',           color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

function SourceBadge({ source }) {
  const cfg = SOURCE_LABELS[source] || { label: source || 'AI', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${cfg.color}`}>
      {cfg.label}
    </Badge>
  );
}

function ConvictionDot({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-zinc-400';
  return <span className={`text-xs font-semibold tabular-nums ${color}`}>{pct}%</span>;
}

function IdeaStatusBadge({ status }) {
  const cfg = {
    proposed:    { cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', label: 'Proposed' },
    approved:    { cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20',       label: 'Approved' },
    in_progress: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    label: 'In Progress' },
    completed:   { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Done' },
    rejected:    { cls: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',       label: 'Rejected' },
  }[status] || { cls: 'bg-zinc-500/10 text-zinc-400', label: status };
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  );
}

export default function FvsSystemPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [snapshot, setSnapshot]             = useState(null);
  const [ideas, setIdeas]                   = useState([]);
  const [activities, setActivities]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [proposing, setProposing]           = useState(false);
  const [producing, setProducing]           = useState(null);

  // Trend state
  const [recommendations, setRecommendations] = useState(null);
  const [competitors, setCompetitors]         = useState([]);
  const [scanning, setScanning]               = useState(false);
  const [scanStatus, setScanStatus]           = useState(null);

  // Brain state
  const [brainScores, setBrainScores]         = useState(null);
  const [activeChallenges, setActiveChallenges] = useState(null);

  // Pulse bar: pipeline submissions
  const [submissions, setSubmissions]         = useState([]);

  // Side panel
  const [selectedIdea, setSelectedIdea]       = useState(null);
  const [panelOpen, setPanelOpen]             = useState(false);
  const [loadingScript, setLoadingScript]     = useState(false);
  const [scriptData, setScriptData]           = useState(null);
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  const [copied, setCopied]                   = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshotRes, ideasRes, activityRes, recsRes, compRes, statusRes, brainRes, challengesRes, subsRes] = await Promise.all([
        axios.get(`${API}/fvs/brain-snapshot`, { headers: authHeaders }),
        axios.get(`${API}/fvs/ideas`, { headers: authHeaders }),
        axios.get(`${API}/fvs/activity`, { headers: authHeaders }),
        axios.get(`${API}/trends/recommendations`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/trends/competitors?limit=8`, { headers: authHeaders }).catch(() => ({ data: { videos: [] } })),
        axios.get(`${API}/trends/scan/status`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/brain/scores`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/brain/active-challenges`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/submissions`, { headers: authHeaders }).catch(() => ({ data: [] })),
      ]);
      setSnapshot(snapshotRes.data);
      setIdeas(ideasRes.data || []);
      setActivities(activityRes.data || []);
      setRecommendations(recsRes.data);
      setCompetitors(compRes.data?.videos || []);
      setScanStatus(statusRes.data);
      setBrainScores(brainRes.data);
      setActiveChallenges(challengesRes.data);
      setSubmissions(subsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch FVS data:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Trigger trend scan
  const handleTrendScan = async () => {
    setScanning(true);
    try {
      await axios.post(`${API}/trends/scan`, {}, { headers: authHeaders });
      toast.success('Trend scan started', { description: 'Analysing 11 competitor channels...' });

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API}/trends/scan/status`, { headers: authHeaders });
          setScanStatus(statusRes.data);
          if (statusRes.data.status === 'complete' || statusRes.data.status === 'error') {
            clearInterval(pollInterval);
            setScanning(false);
            if (statusRes.data.status === 'complete') {
              toast.success('Scan complete!', {
                description: `${statusRes.data.results?.recommendationsGenerated || 0} recommendations generated.`
              });
              fetchData();
            } else {
              toast.error('Scan failed', { description: statusRes.data.error });
            }
          }
        } catch {
          clearInterval(pollInterval);
          setScanning(false);
        }
      }, 3000);

      setTimeout(() => { clearInterval(pollInterval); setScanning(false); }, 120000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start trend scan');
      setScanning(false);
    }
  };

  // Propose ideas (kept for use in idea queue empty state)
  const handleProposeIdeas = async () => {
    setProposing(true);
    try {
      const res = await axios.post(`${API}/fvs/propose-ideas`, { format: 'short', range: '30d' }, { headers: authHeaders });
      setIdeas(prev => [...res.data.ideas, ...prev]);
      setSnapshot(res.data.snapshot);
      setActivities(prev => [{
        id: Date.now().toString(),
        action: 'propose_ideas',
        description: `FVS proposed ${res.data.ideas.length} new ideas`,
        createdAt: new Date().toISOString()
      }, ...prev]);
      toast.success(`${res.data.ideas.length} new episode ideas generated`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to propose ideas');
    } finally {
      setProposing(false);
    }
  };

  // Produce episode (full auto)
  const handleProduceEpisode = async (ideaId) => {
    setProducing(ideaId);
    try {
      const res = await axios.post(`${API}/fvs/produce-episode`, { ideaId, mode: 'full_auto_short' }, { headers: authHeaders });
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: 'completed', submissionId: res.data.submission.id } : i));
      setActivities(prev => [{
        id: Date.now().toString(),
        action: 'produce_episode',
        description: `Produced '${res.data.submission.title}'`,
        metadata: res.data,
        createdAt: new Date().toISOString()
      }, ...prev]);
      toast.success(`Episode created!`, { description: 'Script, audio, video, and thumbnail generated.' });
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
      toast.success('Idea removed');
    } catch {
      toast.error('Failed to reject idea');
    }
  };

  // Send idea to Content Studio (pre-fill topic)
  const handleSendToStudio = (idea) => {
    sessionStorage.setItem('studio_prefill_idea', JSON.stringify({
      topic: idea.topic,
      hypothesis: idea.hypothesis,
      source: idea.source,
    }));
    navigate('/dashboard/studio');
  };

  // Open idea detail panel
  const handleOpenIdeaPanel = async (idea) => {
    setSelectedIdea(idea);
    setPanelOpen(true);
    setScriptData(null);
    if (!idea.script) {
      setLoadingScript(true);
      try {
        const res = await axios.post(`${API}/fvs/ideas/${idea.id}/generate-script`, {}, { headers: authHeaders });
        setScriptData(res.data);
        setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, script: res.data.scriptText } : i));
      } catch {
        toast.error('Failed to generate script');
      } finally {
        setLoadingScript(false);
      }
    } else {
      setScriptData({
        scriptText: idea.script,
        hooks: idea.generatedHooks || idea.hooks,
        caption: idea.caption,
        hashtags: idea.hashtags
      });
    }
  };

  const handleClosePanel = () => { setPanelOpen(false); setSelectedIdea(null); setScriptData(null); };

  // Create submission from idea
  const handleCreateSubmissionFromIdea = async () => {
    if (!selectedIdea) return;
    setCreatingSubmission(true);
    try {
      const isFromRecommendation = selectedIdea.source === 'ai_recommendation' || selectedIdea.id?.startsWith('rec-');
      const res = await axios.post(`${API}/submissions`, {
        title: selectedIdea.topic,
        description: selectedIdea.hypothesis || scriptData?.scriptText?.slice(0, 500) || '',
        contentType: selectedIdea.format === 'short' ? 'Short' : 'Podcast',
        priority: 'High',
        strategyIdeaId: selectedIdea.id,
        recommendation_id: isFromRecommendation ? selectedIdea.id : null
      }, { headers: authHeaders });

      toast.success('Added to Pipeline!', {
        description: `"${res.data.title}" is ready to produce.`
      });
      handleClosePanel();
      navigate('/dashboard/submissions');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setCreatingSubmission(false);
    }
  };

  // Copy script
  const handleCopyScript = () => {
    if (scriptData?.scriptText) {
      navigator.clipboard.writeText(scriptData.scriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Script copied');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatConviction = (score) => {
    const pct = Math.round((score || 0) * 100);
    if (pct >= 80) return { text: `${pct}%`, color: 'text-emerald-400' };
    if (pct >= 60) return { text: `${pct}%`, color: 'text-amber-400' };
    return { text: `${pct}%`, color: 'text-zinc-400' };
  };

  // Derived values for pulse bar
  const pipelineItems = submissions.filter(s => s.status !== 'PUBLISHED');
  const publishedItems = submissions.filter(s => s.status === 'PUBLISHED');
  const lastPublished = publishedItems.length
    ? (() => {
        const sorted = [...publishedItems].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        const diff = Math.floor((Date.now() - new Date(sorted[0].updatedAt || sorted[0].createdAt)) / 86400000);
        return diff === 0 ? 'Today' : `${diff}d ago`;
      })()
    : null;

  const brainAccuracy = brainScores?.total_predictions >= 3
    ? `${Math.round(brainScores.accuracy_percentage)}%`
    : 'Training';

  const activeCount = activeChallenges?.total_active || 0;

  const proposedIdeas   = ideas.filter(i => i.status === 'proposed');
  const inProgressIdeas = ideas.filter(i => i.status === 'in_progress');
  const completedIdeas  = ideas.filter(i => i.status === 'completed');
  const visibleIdeas    = ideas.filter(i => i.status !== 'rejected');

  // Activity icon
  const activityIcon = (action) => {
    if (action === 'propose_ideas') return <Brain className="h-3 w-3 text-indigo-400" />;
    if (action === 'produce_episode') return <Zap className="h-3 w-3 text-amber-400" />;
    return <Activity className="h-3 w-3 text-zinc-400" />;
  };

  return (
    <div data-testid="fvs-system-page" className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            FVS System
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your channel's autonomous intelligence brain.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleTrendScan}
            disabled={scanning}
            size="sm"
            variant="outline"
            className="border-[#1F2933] bg-transparent text-zinc-300 hover:bg-white/[0.05] h-8 text-xs gap-1.5"
          >
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
            {scanning ? 'Scanning…' : 'Scan Trends'}
          </Button>
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1">
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            Active
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── ZONE 1: Channel Pulse Bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* In Pipeline */}
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wide">In Pipeline</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{pipelineItems.length}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {pipelineItems.length === 0 ? 'No active production' : 'episodes in production'}
                </div>
              </CardContent>
            </Card>

            {/* Last Published */}
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Last Published</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {lastPublished || '—'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {publishedItems.length > 0 ? `${publishedItems.length} total published` : 'No published content yet'}
                </div>
              </CardContent>
            </Card>

            {/* Brain Accuracy */}
            <Card className={`bg-[#0B1120] border-[#1F2933] ${brainScores?.accuracy_percentage >= 80 ? 'ring-1 ring-amber-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Brain Accuracy</span>
                </div>
                <div className={`text-2xl font-bold tabular-nums ${brainScores?.total_predictions >= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {brainAccuracy}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {brainScores?.total_predictions
                    ? `${brainScores.total_predictions} predictions tracked`
                    : 'Needs more data'}
                </div>
              </CardContent>
            </Card>

            {/* Active Predictions */}
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3.5 w-3.5 text-teal-400" />
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Predictions</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{activeCount}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {activeCount === 0 ? 'No active challenges' : 'awaiting 30-day verdict'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── ZONE 2: Two-Column Intelligence Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT COLUMN — What to Create (3/5 width) */}
            <div className="lg:col-span-3 space-y-6">

              {/* Card A: Smart Ideas Queue */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="smart-ideas-queue">
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Smart Ideas Queue
                      </CardTitle>
                      {proposedIdeas.length > 0 && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-4 px-1.5">
                          {proposedIdeas.length}
                        </Badge>
                      )}
                    </div>
                    <AuraTooltip content={tooltipContent?.fvsIdeas}>
                      <Button
                        onClick={handleProposeIdeas}
                        disabled={proposing}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-zinc-400 hover:text-white gap-1 px-2"
                      >
                        {proposing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Refresh
                      </Button>
                    </AuraTooltip>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {visibleIdeas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Lightbulb className="h-5 w-5 text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400 font-medium">No ideas yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Run a Trend Scan or generate ideas below</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleProposeIdeas}
                          disabled={proposing}
                          size="sm"
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 h-8 text-xs gap-1.5"
                        >
                          {proposing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                          Generate Ideas
                        </Button>
                        <Button
                          onClick={handleTrendScan}
                          disabled={scanning}
                          size="sm"
                          variant="outline"
                          className="border-[#1F2933] bg-transparent text-zinc-400 hover:text-white h-8 text-xs gap-1.5"
                        >
                          <Radar className="h-3 w-3" />
                          Scan Trends
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleIdeas.slice(0, 8).map((idea) => {
                        const cv = formatConviction(idea.convictionScore);
                        const isProducing = producing === idea.id;
                        return (
                          <div
                            key={idea.id}
                            className="group flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-[#1F2933] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
                          >
                            {/* Conviction score */}
                            <div className="shrink-0 w-8 text-right pt-0.5">
                              <span className={`text-xs font-bold tabular-nums ${cv.color}`}>{cv.text}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-1.5 flex-wrap mb-1">
                                <SourceBadge source={idea.source} />
                                <IdeaStatusBadge status={idea.status} />
                                {idea.format === 'short' && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-zinc-800/50 text-zinc-400 border-zinc-700">
                                    Short
                                  </Badge>
                                )}
                              </div>
                              <p
                                className="text-xs font-medium text-white leading-snug cursor-pointer hover:text-indigo-300 transition-colors"
                                onClick={() => handleOpenIdeaPanel(idea)}
                              >
                                {idea.topic}
                              </p>
                              {idea.hypothesis && (
                                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{idea.hypothesis}</p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {idea.status === 'proposed' && (
                                <>
                                  <Button
                                    onClick={() => handleSendToStudio(idea)}
                                    size="sm"
                                    className="h-7 text-[10px] px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 gap-1"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Studio
                                  </Button>
                                  <Button
                                    onClick={() => handleProduceEpisode(idea.id)}
                                    disabled={isProducing}
                                    size="sm"
                                    className="h-7 text-[10px] px-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 gap-1"
                                    title="Full auto-produce"
                                  >
                                    {isProducing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Zap className="h-2.5 w-2.5" />}
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectIdea(idea.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400"
                                    title="Dismiss"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {idea.status === 'completed' && idea.submissionId && (
                                <Button
                                  onClick={() => navigate('/dashboard/submissions')}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] px-2 text-emerald-400 gap-1"
                                >
                                  <ArrowRight className="h-2.5 w-2.5" /> View
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Footer hint */}
                      <div className="pt-2 flex items-center justify-between">
                        <p className="text-[11px] text-zinc-600">
                          {inProgressIdeas.length > 0 && `${inProgressIdeas.length} in progress · `}
                          {completedIdeas.length > 0 && `${completedIdeas.length} completed`}
                        </p>
                        <Button
                          onClick={() => navigate('/dashboard/studio')}
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-zinc-500 hover:text-indigo-400 px-2 gap-1"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          Open Content Studio
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card B: Content DNA */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="content-dna">
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-teal-400" />
                    <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Content DNA
                    </CardTitle>
                    <span className="text-[11px] text-zinc-500">What's working for your channel</span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {snapshot?.topPatterns?.length > 0 ? (
                    <div className="space-y-2">
                      {snapshot.topPatterns.slice(0, 4).map((pattern, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-md bg-white/[0.02] border border-[#1F2933]">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            i === 0 ? 'bg-amber-500/20 text-amber-400' :
                            i === 1 ? 'bg-zinc-600/40 text-zinc-300' :
                            'bg-zinc-700/40 text-zinc-400'
                          }`}>
                            {i + 1}
                          </div>
                          <p className="text-xs text-zinc-300 leading-snug">{pattern}</p>
                        </div>
                      ))}
                      {snapshot.summary && (
                        <p className="text-[11px] text-zinc-500 pt-1 italic">{snapshot.summary}</p>
                      )}
                      <p className="text-[10px] text-zinc-600">
                        Based on {snapshot.timeWindow || '30 days'} · Updated {formatDate(snapshot.createdAt)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <BarChart2 className="h-8 w-8 text-zinc-700" />
                      <p className="text-sm text-zinc-500 font-medium">No patterns detected yet</p>
                      <p className="text-xs text-zinc-600 max-w-[240px]">
                        Publish content and sync your YouTube analytics to surface what's resonating with your audience.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN — What's Happening (2/5 width) */}
            <div className="lg:col-span-2 space-y-4">

              {/* Card C: Trend Radar */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="trend-radar">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radar className="h-4 w-4 text-rose-400" />
                      <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Trend Radar
                      </CardTitle>
                    </div>
                    <Button
                      onClick={handleTrendScan}
                      disabled={scanning}
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2 text-zinc-400 hover:text-white gap-1"
                    >
                      {scanning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
                      {scanning ? 'Scanning…' : 'Scan Now'}
                    </Button>
                  </div>
                  {scanStatus?.status === 'complete' && scanStatus?.completedAt && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Last scan: {formatDate(scanStatus.completedAt)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {/* Trend recommendations */}
                  {recommendations?.recommendations?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Trending Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recommendations.recommendations.slice(0, 5).map((rec, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] px-2 py-0 h-5 bg-teal-500/10 text-teal-400 border-teal-500/20 cursor-default"
                          >
                            {rec.topic || rec.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Competitor videos */}
                  {competitors.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Top Competitor Shorts</p>
                      <div className="space-y-2">
                        {competitors.slice(0, 5).map((vid, i) => (
                          <div key={vid.videoId || i} className="flex items-center gap-2">
                            {vid.thumbnailUrl ? (
                              <img
                                src={vid.thumbnailUrl}
                                alt=""
                                className="h-8 w-14 object-cover rounded shrink-0 bg-zinc-800"
                              />
                            ) : (
                              <div className="h-8 w-14 bg-zinc-800 rounded shrink-0 flex items-center justify-center">
                                <Eye className="h-3 w-3 text-zinc-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-zinc-300 truncate">{vid.title}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600">{vid.competitorName}</span>
                                {vid.viewCount > 0 && (
                                  <span className="text-[10px] text-zinc-500 tabular-nums">
                                    {vid.viewCount >= 1000 ? `${(vid.viewCount / 1000).toFixed(1)}K` : vid.viewCount} views
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                      <Radar className="h-6 w-6 text-zinc-700" />
                      <p className="text-xs text-zinc-500">Click Scan Now to analyse competitor channels</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card D: Active Predictions */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="active-predictions">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-teal-400" />
                    <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Brain Predictions
                    </CardTitle>
                    {activeCount > 0 && (
                      <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-[10px] h-4 px-1.5">
                        {activeCount} active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {activeChallenges?.active_challenges?.length > 0 ? (
                    <div className="space-y-3">
                      {activeChallenges.active_challenges.slice(0, 4).map((ch) => {
                        const daysLeft = ch.days_remaining || 0;
                        const progress = Math.round(((30 - daysLeft) / 30) * 100);
                        return (
                          <div key={ch.id} className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] text-zinc-300 line-clamp-1 flex-1">{ch.predicted_title}</p>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 h-3.5 shrink-0 ${
                                  ch.predicted_tier === 'High'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                                }`}
                              >
                                {ch.predicted_tier}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-500/60 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-zinc-500 shrink-0 tabular-nums">{daysLeft}d left</span>
                            </div>
                          </div>
                        );
                      })}
                      {brainScores?.total_predictions >= 3 && (
                        <div className="pt-1 border-t border-[#1F2933]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500">Overall accuracy</span>
                            <span className={`text-[11px] font-semibold tabular-nums ${
                              brainScores.accuracy_percentage >= 80 ? 'text-amber-400' : 'text-zinc-400'
                            }`}>
                              {Math.round(brainScores.accuracy_percentage)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                      <Brain className="h-6 w-6 text-zinc-700" />
                      <p className="text-xs text-zinc-500">
                        Send an idea to Studio and publish it to start tracking prediction accuracy
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card E: Recent Activity */}
              <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="recent-activity">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Recent Activity
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {activities.length > 0 ? (
                    <div className="space-y-2">
                      {activities.slice(0, 5).map((act, i) => (
                        <div key={act.id || i} className="flex items-start gap-2.5">
                          <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center">
                            {activityIcon(act.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-zinc-300 leading-snug">{act.description}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(act.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 text-center py-4">No activity yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ── Idea Detail Side Panel ── */}
      {selectedIdea && (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent
            side="right"
            className="w-full max-w-[480px] bg-[#0B1120] border-l border-[#1F2933] p-0 overflow-hidden"
          >
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#1F2933]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <IdeaStatusBadge status={selectedIdea.status} />
                    <SourceBadge source={selectedIdea.source} />
                    {selectedIdea.format === 'short' && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-zinc-800/50 text-zinc-400 border-zinc-700">
                        Short
                      </Badge>
                    )}
                    <ConvictionDot score={selectedIdea.convictionScore} />
                  </div>
                  <SheetTitle className="text-base font-semibold text-white leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {selectedIdea.topic}
                  </SheetTitle>
                  {selectedIdea.hypothesis && (
                    <SheetDescription className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {selectedIdea.hypothesis}
                    </SheetDescription>
                  )}
                </div>
                <Button
                  onClick={handleClosePanel}
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 w-7 p-0 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="px-6 py-4 space-y-5">

                {/* Hooks */}
                {selectedIdea.hooks?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Hooks
                    </p>
                    <div className="space-y-1.5">
                      {selectedIdea.hooks.map((hook, i) => (
                        <div key={i} className="flex gap-2 text-xs text-zinc-300 bg-white/[0.03] rounded px-3 py-2 border border-[#1F2933]">
                          <span className="text-zinc-600 shrink-0">{i + 1}.</span>
                          {hook}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Script
                    </p>
                    {scriptData?.scriptText && (
                      <Button
                        onClick={handleCopyScript}
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-zinc-400 hover:text-white gap-1"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    )}
                  </div>
                  {loadingScript ? (
                    <div className="flex items-center gap-2 py-4 text-zinc-500 text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating script…
                    </div>
                  ) : scriptData?.scriptText ? (
                    <ScrollArea className="h-48">
                      <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] rounded p-3 border border-[#1F2933] whitespace-pre-wrap">
                        {scriptData.scriptText}
                      </p>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">Script not yet generated</p>
                  )}
                </div>

                {/* Caption & Hashtags */}
                {(scriptData?.caption || scriptData?.hashtags?.length > 0) && (
                  <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">Caption & Tags</p>
                    {scriptData.caption && (
                      <p className="text-xs text-zinc-400 bg-white/[0.02] rounded p-3 border border-[#1F2933] mb-2 leading-relaxed">
                        {scriptData.caption}
                      </p>
                    )}
                    {scriptData.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {scriptData.hashtags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800/50 text-zinc-400 border-zinc-700">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Panel Footer Actions */}
            <div className="px-6 py-4 border-t border-[#1F2933] space-y-2">
              <Button
                onClick={() => { handleClosePanel(); handleSendToStudio(selectedIdea); }}
                className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 h-9 text-sm gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Open in Content Studio
              </Button>
              {selectedIdea.status === 'proposed' && (
                <Button
                  onClick={handleCreateSubmissionFromIdea}
                  disabled={creatingSubmission}
                  variant="outline"
                  className="w-full border-[#1F2933] text-zinc-300 hover:text-white h-9 text-sm gap-2"
                >
                  {creatingSubmission ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Add to Pipeline
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
