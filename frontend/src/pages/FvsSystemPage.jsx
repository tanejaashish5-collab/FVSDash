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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, Sparkles, Zap, Play, X, Check, Loader2, RefreshCw,
  Lightbulb, TrendingUp, Clock, Activity, Settings, Radio,
  FileText, Video, Image, Music, ChevronRight, AlertCircle, Eye,
  Copy, Send, Hash, Target, Users, ExternalLink, Radar, Swords
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AUTOMATION_LEVELS = [
  { value: 'manual', label: 'Manual Only', description: 'No auto runs. You control everything.', tooltip: 'You control every step. No automatic runs. Best for full creative control.' },
  { value: 'semi_auto', label: 'Semi-Auto', description: 'Brain proposes ideas, you click to produce.', tooltip: 'FVS proposes ideas automatically. You review and click to produce each one.' },
  { value: 'full_auto_short', label: 'Full Auto (Shorts)', description: 'Brain auto-produces short episodes overnight.', tooltip: 'FVS generates and produces short episodes overnight without any input from you.' },
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
  
  // Trend Intelligence State
  const [recommendations, setRecommendations] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  
  // Brain Scores State
  const [brainScores, setBrainScores] = useState(null);
  const [brainScoresExpanded, setBrainScoresExpanded] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState(null);
  
  // Prediction Feedback State
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [predictionNotes, setPredictionNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Side panel state
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptData, setScriptData] = useState(null);
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  const [creatingVideoTask, setCreatingVideoTask] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, snapshotRes, ideasRes, activityRes, recsRes, compRes, statusRes, brainRes, challengesRes] = await Promise.all([
        axios.get(`${API}/fvs/config`, { headers: authHeaders }),
        axios.get(`${API}/fvs/brain-snapshot`, { headers: authHeaders }),
        axios.get(`${API}/fvs/ideas`, { headers: authHeaders }),
        axios.get(`${API}/fvs/activity`, { headers: authHeaders }),
        axios.get(`${API}/trends/recommendations`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/trends/competitors?limit=10`, { headers: authHeaders }).catch(() => ({ data: { videos: [] } })),
        axios.get(`${API}/trends/scan/status`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/brain/scores`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/brain/active-challenges`, { headers: authHeaders }).catch(() => ({ data: null })),
      ]);
      setConfig(configRes.data || { automationLevel: 'manual' });
      setSnapshot(snapshotRes.data);
      setIdeas(ideasRes.data || []);
      setActivities(activityRes.data || []);
      setRecommendations(recsRes.data);
      setCompetitors(compRes.data?.videos || []);
      setScanStatus(statusRes.data);
      setBrainScores(brainRes.data);
      setActiveChallenges(challengesRes.data);
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
      toast.success('Trend scan started', { description: 'This may take a few minutes.' });
      
      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API}/trends/scan/status`, { headers: authHeaders });
          setScanStatus(statusRes.data);
          
          if (statusRes.data.status === 'complete' || statusRes.data.status === 'error') {
            clearInterval(pollInterval);
            setScanning(false);
            
            if (statusRes.data.status === 'complete') {
              toast.success('Trend scan complete!', {
                description: `${statusRes.data.results?.recommendationsGenerated || 0} new recommendations generated.`
              });
              fetchData(); // Refresh all data
            } else {
              toast.error('Scan failed', { description: statusRes.data.error });
            }
          }
        } catch {
          clearInterval(pollInterval);
          setScanning(false);
        }
      }, 3000);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setScanning(false);
      }, 120000);
      
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start trend scan');
      setScanning(false);
    }
  };

  // Save automation config
  const handleAutomationChange = async (level) => {
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

  // Handle prediction feedback (Confirm/Reject)
  const handlePredictionFeedback = async (verdict) => {
    if (!selectedPrediction) return;
    
    setSubmittingFeedback(true);
    try {
      await axios.post(`${API}/brain/challenge-feedback`, {
        challenge_id: selectedPrediction.id,
        verdict: verdict, // 'confirm' or 'reject'
        notes: predictionNotes
      }, { headers: authHeaders });
      
      // Update local state to mark as responded
      setActiveChallenges(prev => ({
        ...prev,
        active_challenges: prev.active_challenges.map(c => 
          c.id === selectedPrediction.id 
            ? { ...c, user_verdict: verdict, user_notes: predictionNotes }
            : c
        )
      }));
      
      toast.success('Feedback recorded — the Brain will learn from this');
      setSelectedPrediction(null);
      setPredictionNotes('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Open idea detail panel
  const handleOpenIdeaPanel = async (idea) => {
    setSelectedIdea(idea);
    setPanelOpen(true);
    setScriptData(null);
    
    // Auto-generate script if not already generated
    if (!idea.script) {
      setLoadingScript(true);
      try {
        const res = await axios.post(`${API}/fvs/ideas/${idea.id}/generate-script`, {}, { headers: authHeaders });
        setScriptData(res.data);
        // Update the idea in the list with generated script
        setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, script: res.data.scriptText } : i));
      } catch (err) {
        toast.error('Failed to generate script');
      } finally {
        setLoadingScript(false);
      }
    } else {
      // Use existing script
      setScriptData({
        scriptText: idea.script,
        hooks: idea.generatedHooks || idea.hooks,
        caption: idea.caption,
        hashtags: idea.hashtags
      });
    }
  };

  // Close panel
  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedIdea(null);
    setScriptData(null);
  };

  // Create submission from idea
  const handleCreateSubmissionFromIdea = async () => {
    if (!selectedIdea) return;
    setCreatingSubmission(true);
    try {
      // Determine if this is from an AI recommendation (for Brain tracking)
      const isFromRecommendation = selectedIdea.source === 'ai_recommendation' || selectedIdea.id?.startsWith('rec-');
      
      const res = await axios.post(`${API}/submissions`, {
        title: selectedIdea.topic,
        description: selectedIdea.hypothesis || scriptData?.scriptText?.slice(0, 500) || '',
        contentType: selectedIdea.format === 'short' ? 'Short' : 'Podcast',
        priority: 'High',
        strategyIdeaId: selectedIdea.id,
        recommendation_id: isFromRecommendation ? selectedIdea.id : null
      }, { headers: authHeaders });
      
      if (isFromRecommendation && res.data.brain_score_id) {
        toast.success('Submission created + Brain tracking enabled 🧠', {
          description: `"${res.data.title}" added to pipeline.`
        });
      } else {
        toast.success('Submission created!', {
          description: `"${res.data.title}" added to pipeline.`
        });
      }
      handleClosePanel();
      navigate('/dashboard/submissions');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setCreatingSubmission(false);
    }
  };

  // Create video task from idea
  const handleCreateVideoTaskFromIdea = async () => {
    if (!selectedIdea || !scriptData?.scriptText) {
      toast.error('Please wait for script to generate');
      return;
    }
    setCreatingVideoTask(true);
    try {
      const res = await axios.post(`${API}/video-tasks`, {
        provider: 'veo',
        prompt: `Create a ${selectedIdea.format === 'short' ? '60-90 second vertical' : '15-30 minute'} video for: ${selectedIdea.topic}`,
        mode: 'script',
        scriptText: scriptData.scriptText,
        aspectRatio: selectedIdea.format === 'short' ? '9:16' : '16:9',
        outputProfile: selectedIdea.format === 'short' ? 'shorts' : 'youtube_long'
      }, { headers: authHeaders });
      
      toast.success('Video task created!', {
        description: 'Check the AI Video Lab for progress.'
      });
      handleClosePanel();
      navigate('/dashboard/video-lab');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create video task');
    } finally {
      setCreatingVideoTask(false);
    }
  };

  // Copy script to clipboard
  const handleCopyScript = () => {
    if (scriptData?.scriptText) {
      navigator.clipboard.writeText(scriptData.scriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Script copied to clipboard');
    }
  };

  // Navigate to Strategy Lab with idea pre-populated
  const handleDevelopInStrategyLab = () => {
    if (!selectedIdea) return;
    
    // Build query params to pass idea data to Strategy Lab
    const params = new URLSearchParams({
      topic: selectedIdea.topic || '',
      format: selectedIdea.format || 'short',
      source: 'fvs',
      ideaId: selectedIdea.id || ''
    });
    
    toast.success('Opening Strategy Lab', {
      description: 'Develop your idea into a complete script'
    });
    handleClosePanel();
    navigate(`/dashboard/strategy?${params.toString()}`);
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
          {/* Brain Performance Panel - Sprint 12 */}
          <Card 
            className={`bg-[#0B1120]/80 backdrop-blur-xl border-[#1F2933] ${
              brainScores?.accuracy_percentage >= 80 
                ? 'ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/10' 
                : ''
            }`}
            data-testid="brain-accuracy-card"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  brainScores?.accuracy_percentage >= 80 
                    ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/20' 
                    : brainScores?.accuracy_percentage >= 60 
                    ? 'bg-teal-500/20' 
                    : 'bg-zinc-700/50'
                }`}>
                  <Brain className={`h-6 w-6 ${
                    brainScores?.accuracy_percentage >= 80 
                      ? 'text-amber-400' 
                      : brainScores?.accuracy_percentage >= 60 
                      ? 'text-teal-400' 
                      : 'text-zinc-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    FVS Brain Accuracy
                  </h3>
                  <p className={`text-xs ${
                    brainScores?.accuracy_percentage >= 80 
                      ? 'text-amber-400' 
                      : brainScores?.accuracy_percentage >= 60 
                      ? 'text-teal-400' 
                      : 'text-zinc-500'
                  }`}>
                    {brainScores?.accuracy_percentage >= 80 
                      ? 'Excellent — the Brain is highly calibrated' 
                      : brainScores?.accuracy_percentage >= 60 
                      ? 'Good — improving with more data' 
                      : 'Learning — needs more published data to calibrate'}
                  </p>
                </div>
              </div>
              
              {brainScores?.total_predictions > 0 ? (
                <>
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                      <p className={`text-3xl font-bold ${
                        brainScores.accuracy_percentage >= 80 
                          ? 'text-amber-400' 
                          : brainScores.accuracy_percentage >= 60 
                          ? 'text-teal-400' 
                          : 'text-zinc-300'
                      }`}>
                        {brainScores.accuracy_percentage}%
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Accuracy</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                      <p className="text-3xl font-bold text-white">{brainScores.total_predictions}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Made</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                      <p className="text-3xl font-bold text-zinc-400">{brainScores.pending}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Awaiting Data</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                      <p className="text-3xl font-bold text-emerald-400">+5%</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">This Week</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          brainScores.accuracy_percentage >= 80 
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                            : brainScores.accuracy_percentage >= 60 
                            ? 'bg-teal-500' 
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${brainScores.accuracy_percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      The Brain predicted {brainScores.correct} of your last {brainScores.scored} video performances correctly.
                    </p>
                  </div>
                  
                  {/* Collapsible Scorecard */}
                  <button
                    onClick={() => setBrainScoresExpanded(!brainScoresExpanded)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-400">Brain Scorecard</span>
                    <ChevronRight className={`h-4 w-4 text-zinc-500 transition-transform ${brainScoresExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {brainScoresExpanded && brainScores.scores?.length > 0 && (
                    <div className="mt-2 border-t border-[#1F2933] pt-3">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#1F2933] hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Video Title</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Predicted</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Actual Views</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Verdict</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {brainScores.scores.slice(0, 10).map((score, i) => (
                            <TableRow key={score.id || i} className="border-[#1F2933] hover:bg-white/[0.02]">
                              <TableCell className="max-w-[200px]">
                                <p className="text-xs text-white truncate">{score.predicted_title}</p>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                                  score.predicted_tier === 'High' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {score.predicted_tier}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-zinc-300">
                                  {score.actual_views !== null ? score.actual_views.toLocaleString() : '—'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {score.performance_verdict === 'correct' && (
                                  <span className="text-emerald-400">✅</span>
                                )}
                                {score.performance_verdict === 'incorrect' && (
                                  <span className="text-red-400">❌</span>
                                )}
                                {score.performance_verdict === 'pending' && (
                                  <span className="text-zinc-500">⏳</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Sparkles className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">Start making AI-recommended Shorts to train the Brain</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Click "Create Submission" on any recommendation below to begin tracking accuracy
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Challenges Panel - Sprint 13 */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="active-challenges-card" id="active-challenges">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Swords className="h-4 w-4 text-amber-400" />
                Active Predictions
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Brain predictions awaiting verdict. Click to provide feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeChallenges?.active_challenges?.length > 0 ? (
                <>
                  {activeChallenges.active_challenges.slice(0, 4).map((challenge) => {
                    const isUrgent = challenge.days_remaining <= 3;
                    const isHighPotential = challenge.predicted_tier === 'High';
                    const progressPercent = ((30 - challenge.days_remaining) / 30) * 100;
                    const hasResponded = challenge.user_verdict;
                    
                    return (
                      <button 
                        key={challenge.id}
                        onClick={() => !hasResponded && setSelectedPrediction(challenge)}
                        disabled={hasResponded}
                        data-testid={`prediction-card-${challenge.id}`}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          isHighPotential 
                            ? 'bg-gradient-to-br from-amber-500/5 to-amber-600/10 border-amber-500/30' 
                            : 'bg-gradient-to-br from-teal-500/5 to-teal-600/10 border-teal-500/30'
                        } ${isUrgent && !hasResponded ? 'animate-pulse' : ''} ${
                          hasResponded 
                            ? 'opacity-60 cursor-default' 
                            : 'hover:border-white/30 hover:bg-white/5 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-white truncate max-w-[200px]">
                            {challenge.predicted_title}
                          </h4>
                          <div className="flex items-center gap-2">
                            {hasResponded && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                challenge.user_verdict === 'confirm' 
                                  ? 'border-emerald-500/40 text-emerald-400' 
                                  : 'border-red-500/40 text-red-400'
                              }`}>
                                {challenge.user_verdict === 'confirm' ? 'Agreed' : 'Disagreed'}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                              isHighPotential ? 'border-amber-500/40 text-amber-400' : 'border-teal-500/40 text-teal-400'
                            }`}>
                              {challenge.predicted_tier}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                          <Clock className="h-3 w-3" />
                          <span>Verdict in {challenge.days_remaining} days</span>
                          {!hasResponded && <ChevronRight className="h-3 w-3 ml-auto" />}
                        </div>
                        
                        {/* Progress bar showing time elapsed */}
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isHighPotential ? 'bg-amber-500' : 'bg-teal-500'
                            }`}
                            style={{ width: `${Math.max(5, progressPercent)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1 text-right">
                          {challenge.days_remaining} days remaining
                        </p>
                      </button>
                    );
                  })}
                  
                  <p className="text-xs text-zinc-500 text-center pt-2 border-t border-zinc-800">
                    The Brain has {activeChallenges.total_active} active prediction{activeChallenges.total_active !== 1 ? 's' : ''}. Check back as your videos collect views.
                  </p>
                </>
              ) : (
                <div className="text-center py-6">
                  <Swords className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">No active predictions yet</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Create a submission from an AI recommendation to start a challenge
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation Controls */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="automation-card">
            <CardHeader className="pb-3">
              <AuraTooltip content={tooltipContent.fvsSystem.automationLevel} position="right">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  Automation Level
                </CardTitle>
              </AuraTooltip>
              <CardDescription className="text-xs text-zinc-500">
                Control how autonomously FVS operates for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.automationLevel}
                onValueChange={handleAutomationChange}
                disabled={savingConfig}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                {AUTOMATION_LEVELS.map(level => (
                  <AuraTooltip key={level.value} content={level.tooltip} position="top">
                    <Label
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
                  </AuraTooltip>
                ))}
              </RadioGroup>
              
              {/* Mode-specific info banner */}
              {config.automationLevel === 'semi_auto' && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-400">Semi-Auto Mode Active</p>
                      <p className="text-[10px] text-blue-300/70 mt-0.5">
                        FVS will propose ideas based on your analytics. Review and click "Produce" on any idea to create a full episode.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {config.automationLevel === 'full_auto_short' && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-emerald-400">Full Auto Mode Active</p>
                      <p className="text-[10px] text-emerald-300/70 mt-0.5">
                        FVS will automatically produce short-form episodes overnight. Check back daily to review completed content in the Submissions page.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend Intelligence Engine - Sprint 9B */}
          <Card className="bg-gradient-to-r from-[#0B1120] to-[#0d1425] border-[#1F2933]" data-testid="trend-intelligence-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Radar className="h-4 w-4 text-teal-400" />
                    Trend Intelligence Engine
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 mt-1">
                    AI-powered competitor analysis and content recommendations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {scanStatus?.status === 'scanning' && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                      {scanStatus.progress || 'Scanning...'}
                    </Badge>
                  )}
                  <Button
                    onClick={handleTrendScan}
                    disabled={scanning}
                    size="sm"
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white h-8 shadow-lg shadow-teal-500/20"
                    data-testid="trend-scan-btn"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Radar className="h-3.5 w-3.5 mr-1.5" />
                        Scan for New Ideas
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AI Recommendations - Interactive Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                      AI Content Ideas
                    </h4>
                    {recommendations?.generatedAt && (
                      <span className="text-[9px] text-zinc-600">
                        {formatDate(recommendations.generatedAt)}
                      </span>
                    )}
                  </div>
                  
                  {recommendations?.recommendations?.length > 0 ? (
                    <div className="space-y-2">
                      {recommendations.recommendations.slice(0, 3).map((rec, i) => {
                        // Determine performance tier color
                        const tierColor = rec.performanceTier === 'High' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : rec.performanceTier === 'Medium'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
                        
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              // Convert recommendation to an idea-like object for the panel
                              const ideaFromRec = {
                                id: `rec-${i}-${Date.now()}`,
                                topic: rec.title || rec.topic,
                                hypothesis: rec.hook || rec.angle || rec.hypothesis,
                                format: rec.format || 'short',
                                convictionScore: rec.confidence || 0.75,
                                status: 'proposed',
                                source: 'ai_recommendation',
                                hooks: rec.hooks || [rec.hook].filter(Boolean),
                                script: null,
                                caption: rec.caption,
                                hashtags: rec.hashtags || []
                              };
                              handleOpenIdeaPanel(ideaFromRec);
                            }}
                            className="p-4 rounded-lg bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-violet-500/20 hover:border-violet-500/40 hover:from-violet-500/10 hover:to-indigo-500/10 transition-all cursor-pointer group"
                            data-testid={`recommendation-${i}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-500/30 flex items-center justify-center shrink-0">
                                <Lightbulb className="h-4 w-4 text-violet-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white leading-tight group-hover:text-violet-300 transition-colors">
                                  {rec.title || rec.topic}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                                  {rec.hook || rec.angle || rec.hypothesis}
                                </p>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  {rec.performanceTier && (
                                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0.5 ${tierColor}`}>
                                      <TrendingUp className="h-2.5 w-2.5 mr-1" />
                                      {rec.performanceTier} Potential
                                    </Badge>
                                  )}
                                  {rec.format && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-zinc-900 border-zinc-700 text-zinc-400">
                                      {rec.format}
                                    </Badge>
                                  )}
                                  {rec.confidence && (
                                    <span className={`text-[10px] font-mono ${
                                      rec.confidence >= 0.8 ? 'text-emerald-400' : 
                                      rec.confidence >= 0.6 ? 'text-amber-400' : 'text-zinc-500'
                                    }`}>
                                      {Math.round(rec.confidence * 100)}% match
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-lg bg-zinc-950/50 border border-dashed border-[#1F2933] text-center">
                      <Sparkles className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No recommendations yet</p>
                      <p className="text-[10px] text-zinc-600 mt-1">Click "Scan Trends" to generate AI ideas</p>
                    </div>
                  )}
                </div>

                {/* Top Competitor Videos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-red-400" />
                      Top Competitor Shorts
                    </h4>
                    <span className="text-[9px] text-zinc-600">{competitors.length} videos</span>
                  </div>
                  
                  {competitors.length > 0 ? (
                    <div className="space-y-2">
                      {competitors.slice(0, 4).map((video, i) => (
                        <div
                          key={video.videoId || i}
                          className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950/50 border border-[#1F2933] hover:border-zinc-700 transition-colors"
                          data-testid={`competitor-video-${i}`}
                        >
                          {video.thumbnailUrl ? (
                            <img 
                              src={video.thumbnailUrl} 
                              alt={video.title}
                              className="w-16 h-10 object-cover rounded shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-10 bg-zinc-800 rounded shrink-0 flex items-center justify-center">
                              <Video className="h-4 w-4 text-zinc-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{video.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-red-400">{video.competitorName}</span>
                              <span className="text-[10px] text-zinc-600">•</span>
                              <span className="text-[10px] text-emerald-400">{(video.viewCount || 0).toLocaleString()} views</span>
                            </div>
                          </div>
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-zinc-500 hover:text-white" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-lg bg-zinc-950/50 border border-dashed border-[#1F2933] text-center">
                      <Users className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No competitor data yet</p>
                      <p className="text-[10px] text-zinc-600 mt-1">Run a trend scan to analyze competitors</p>
                    </div>
                  )}
                </div>
              </div>
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
                  
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleProposeIdeas}
                          disabled={proposing}
                          className={`aura-btn-primary w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white ${proposing ? 'animate-aura-button-glow' : ''}`}
                          data-testid="run-brain-btn"
                        >
                          {proposing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Run Brain Now (Propose Ideas)
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 text-white border-zinc-700">
                        Analyzes your last 30 days of data to generate fresh episode ideas based on what's performing.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                          <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-20">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help border-b border-dashed border-zinc-600">Score</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 text-white border-zinc-700">
                                  Relevance score (0–100) based on audience trends, engagement patterns, and topic fit.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
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
                              className="aura-table-row border-[#1F2933] cursor-pointer"
                              onClick={() => handleOpenIdeaPanel(idea)}
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
                                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/strategy/idea/${idea.id}`); }}
                                      className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                      data-testid={`view-idea-btn-${idea.id}`}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleProduceEpisode(idea.id); }}
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
                                      onClick={(e) => { e.stopPropagation(); handleRejectIdea(idea.id); }}
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
                                    onClick={(e) => { e.stopPropagation(); idea.submissionId && navigate(`/dashboard/submissions/${idea.submissionId}`); }}
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

      {/* Idea Detail Side Panel */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-[480px] bg-[#0B1120] border-l border-[#1F2933] overflow-y-auto" data-testid="idea-detail-panel">
          {selectedIdea && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <SheetTitle className="text-xl font-semibold text-white leading-tight">
                      {selectedIdea.topic}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${statusCfg[selectedIdea.status]?.bg} ${statusCfg[selectedIdea.status]?.text} ${statusCfg[selectedIdea.status]?.border}`}>
                        {selectedIdea.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-zinc-950 border-zinc-800 text-zinc-400">
                        {selectedIdea.format}
                      </Badge>
                      <span className={`text-xs font-mono font-medium ${formatConviction(selectedIdea.convictionScore).color}`}>
                        {formatConviction(selectedIdea.convictionScore).text}
                      </span>
                    </div>
                  </div>
                </div>
                <SheetDescription className="text-sm text-zinc-400 mt-2">
                  {selectedIdea.hypothesis}
                </SheetDescription>
              </SheetHeader>

              <Separator className="bg-[#1F2933] my-4" />

              {/* Hooks Section */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Hooks
                </h4>
                <div className="space-y-2">
                  {(scriptData?.hooks || selectedIdea.hooks || []).map((hook, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-medium text-amber-400 shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-zinc-300 leading-relaxed">{hook}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Script Section */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-400" />
                    Hinglish Script
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyScript}
                    disabled={!scriptData?.scriptText}
                    className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                    data-testid="copy-script-btn"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 mr-1 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                {loadingScript ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    <span className="ml-2 text-sm text-zinc-400">Generating script...</span>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-lg border border-zinc-800 bg-zinc-950/50">
                    <pre className="p-4 text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {scriptData?.scriptText || selectedIdea.script || 'Script not generated yet.'}
                    </pre>
                  </ScrollArea>
                )}
              </div>

              {/* Caption & Hashtags Section */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Hash className="h-4 w-4 text-pink-400" />
                  Caption & Hashtags
                </h4>
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <p className="text-sm text-zinc-300">
                    {scriptData?.caption || selectedIdea.caption || 'Caption will be generated with script.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(scriptData?.hashtags || selectedIdea.hashtags || []).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/20">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-[#1F2933] my-4" />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleDevelopInStrategyLab}
                  disabled={creatingSubmission}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-testid="develop-in-strategy-lab-btn"
                >
                  {creatingSubmission ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FlaskConical className="h-4 w-4 mr-2" />
                  )}
                  Develop in Strategy Lab
                </Button>
                
                <Button
                  onClick={handleCreateVideoTaskFromIdea}
                  disabled={creatingVideoTask || loadingScript || !scriptData?.scriptText}
                  variant="outline"
                  className="w-full h-10 border-zinc-700 text-white hover:bg-zinc-800"
                  data-testid="create-video-task-from-idea-btn"
                >
                  {creatingVideoTask ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4 mr-2" />
                  )}
                  Produce in Video Lab
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Prediction Feedback Modal */}
      <Dialog open={!!selectedPrediction} onOpenChange={(open) => !open && setSelectedPrediction(null)}>
        <DialogContent className="bg-[#0B1120] border-[#1F2933] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-amber-400" />
              Brain Prediction Feedback
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Do you agree with this Brain prediction?
            </DialogDescription>
          </DialogHeader>
          
          {selectedPrediction && (
            <div className="space-y-4 py-4">
              {/* Prediction Details */}
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <h4 className="text-sm font-medium text-white mb-2">
                  {selectedPrediction.predicted_title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Badge variant="outline" className={`text-[10px] ${
                    selectedPrediction.predicted_tier === 'High' 
                      ? 'border-amber-500/40 text-amber-400' 
                      : 'border-teal-500/40 text-teal-400'
                  }`}>
                    {selectedPrediction.predicted_tier} Potential
                  </Badge>
                  <span>•</span>
                  <span>{selectedPrediction.days_remaining} days remaining</span>
                </div>
                {selectedPrediction.prediction_reason && (
                  <p className="text-xs text-zinc-500 mt-2 italic">
                    "{selectedPrediction.prediction_reason}"
                  </p>
                )}
              </div>
              
              {/* Notes Field */}
              <div className="space-y-2">
                <Label className="text-sm text-zinc-400">Add context (optional)</Label>
                <Textarea
                  value={predictionNotes}
                  onChange={(e) => setPredictionNotes(e.target.value)}
                  placeholder="Why do you agree or disagree with this prediction?"
                  className="h-24 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
                  data-testid="prediction-notes-input"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handlePredictionFeedback('reject')}
              disabled={submittingFeedback}
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              data-testid="prediction-reject-btn"
            >
              {submittingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
              I Disagree
            </Button>
            <Button
              onClick={() => handlePredictionFeedback('confirm')}
              disabled={submittingFeedback}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="prediction-confirm-btn"
            >
              {submittingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              I Agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
