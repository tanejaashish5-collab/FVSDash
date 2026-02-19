import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, FileText, Video, Loader2, RefreshCw, ArrowLeft,
  Sparkles, Copy, Check, TrendingUp, Send, Film, ExternalLink,
  Zap, Music, Image
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const sourceCfg = {
  youtube_analytics: { label: 'YouTube Analytics', color: 'text-red-400', bg: 'bg-red-500/10' },
  reddit: { label: 'Reddit', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  search_trends: { label: 'Search Trends', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  competitor_analysis: { label: 'Competitor Analysis', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  audience_feedback: { label: 'Audience Feedback', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  original: { label: 'Original Idea', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
};

export default function StrategyIdeaDetailPage() {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  
  // State
  const [idea, setIdea] = useState(null);
  const [scriptData, setScriptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  const [creatingVideoTask, setCreatingVideoTask] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdSubmissionId, setCreatedSubmissionId] = useState(null);
  const [createdVideoTaskId, setCreatedVideoTaskId] = useState(null);
  
  // Quick Produce state
  const [quickProducing, setQuickProducing] = useState(false);
  const [produceProgress, setProduceProgress] = useState('');
  const [produceResult, setProduceResult] = useState(null);

  // Fetch idea details
  const fetchIdea = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fvs/ideas/${ideaId}`, { headers: authHeaders });
      setIdea(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load idea');
      navigate('/dashboard/system');
    }
  }, [ideaId, authHeaders, navigate]);

  // Generate script
  const generateScript = useCallback(async () => {
    setGeneratingScript(true);
    try {
      const res = await axios.post(`${API}/fvs/ideas/${ideaId}/generate-script`, {}, { headers: authHeaders });
      setScriptData(res.data);
      toast.success('Script generated successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate script');
    } finally {
      setGeneratingScript(false);
    }
  }, [ideaId, authHeaders]);

  // Initial load - fetch idea and auto-generate script
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchIdea();
      setLoading(false);
    };
    init();
  }, [fetchIdea]);

  // Auto-generate script when idea is loaded
  useEffect(() => {
    if (idea && !scriptData && !generatingScript) {
      generateScript();
    }
  }, [idea, scriptData, generatingScript, generateScript]);

  // Create Submission
  const handleCreateSubmission = async () => {
    if (!scriptData) {
      toast.error('Please generate a script first');
      return;
    }
    
    setCreatingSubmission(true);
    try {
      const res = await axios.post(`${API}/submissions`, {
        title: scriptData.title || idea.topic,
        description: scriptData.scriptText?.slice(0, 500) || idea.hypothesis,
        contentType: idea.format === 'short' ? 'Short' : 'Podcast',
        releaseDate: null,
        guest: '',
        priority: 'High'
      }, { headers: authHeaders });
      
      setCreatedSubmissionId(res.data.id);
      toast.success('Submission created!', {
        description: 'Your idea is now in the production pipeline.'
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setCreatingSubmission(false);
    }
  };

  // Create AI Video Task
  const handleCreateVideoTask = async () => {
    if (!scriptData) {
      toast.error('Please generate a script first');
      return;
    }
    
    setCreatingVideoTask(true);
    try {
      const res = await axios.post(`${API}/video-tasks`, {
        provider: 'veo',
        prompt: `Create a ${idea.format === 'short' ? '60-90 second vertical' : '15-30 minute'} video for: ${idea.topic}`,
        mode: 'script',
        scriptText: scriptData.scriptText,
        audioAssetId: null,
        sourceAssetId: null,
        aspectRatio: idea.format === 'short' ? '9:16' : '16:9',
        outputProfile: idea.format === 'short' ? 'shorts' : 'youtube_long',
        submissionId: createdSubmissionId || null
      }, { headers: authHeaders });
      
      setCreatedVideoTaskId(res.data.id);
      toast.success('AI Video Task created!', {
        description: 'Video generation has been queued.'
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create video task');
    } finally {
      setCreatingVideoTask(false);
    }
  };

  // Quick Produce - Full FVS Pipeline
  const handleQuickProduce = async () => {
    setQuickProducing(true);
    setProduceProgress('Initializing production pipeline...');
    setProduceResult(null);
    
    try {
      // Show progress updates
      const progressSteps = [
        'Generating script with Channel Profile...',
        'Creating audio with ElevenLabs...',
        'Generating thumbnails (3 options)...',
        'Creating video task...',
        'Finalizing submission...'
      ];
      
      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          setProduceProgress(progressSteps[stepIndex]);
          stepIndex++;
        }
      }, 3000);
      
      // Call the produce-episode endpoint
      const res = await axios.post(`${API}/fvs/produce-episode`, {
        ideaId: ideaId,
        mode: 'full_auto_short'
      }, { headers: authHeaders });
      
      clearInterval(progressInterval);
      setProduceProgress('');
      setProduceResult(res.data);
      
      // Update idea status
      setIdea(prev => ({ ...prev, status: 'completed', submissionId: res.data.submission.id }));
      
      const thumbnailCount = res.data.thumbnailAssets?.length || 1;
      toast.success(`Episode "${res.data.submission.title}" produced!`, {
        description: `Script, audio, video, and ${thumbnailCount} thumbnail(s) generated.`
      });
    } catch (err) {
      setProduceProgress('');
      toast.error(err.response?.data?.detail || 'Failed to produce episode');
    } finally {
      setQuickProducing(false);
    }
  };

  // Copy script
  const handleCopyScript = () => {
    if (scriptData?.scriptText) {
      navigator.clipboard.writeText(scriptData.scriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Script copied to clipboard');
    }
  };

  // Format conviction score
  const formatConviction = (score) => {
    const pct = Math.round((score || 0) * 100);
    if (pct >= 80) return { text: `${pct}%`, color: 'text-emerald-400' };
    if (pct >= 60) return { text: `${pct}%`, color: 'text-amber-400' };
    return { text: `${pct}%`, color: 'text-zinc-400' };
  };

  if (loading) {
    return (
      <div data-testid="strategy-idea-detail-loading" className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Idea not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/system')} className="mt-4">
          Back to FVS System
        </Button>
      </div>
    );
  }

  const source = sourceCfg[idea.source] || sourceCfg.original;
  const conviction = formatConviction(idea.convictionScore);

  return (
    <div data-testid="strategy-idea-detail-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/system')}
            className="h-9 px-3 text-zinc-400 hover:text-white"
            data-testid="back-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Strategy Idea
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Review the generated script and take action.</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-xs px-2 py-1 ${source.bg} ${source.color} border-transparent`}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {source.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Idea Overview */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="idea-overview-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                Idea Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Topic */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Topic</p>
                <p className="text-sm text-white font-medium leading-relaxed">{idea.topic}</p>
              </div>

              {/* Hypothesis */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Hypothesis</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{idea.hypothesis}</p>
              </div>

              <Separator className="bg-[#1F2933]" />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Format</p>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-zinc-950 border-zinc-800 text-zinc-300">
                    {idea.format === 'short' ? 'Short (60-90s)' : 'Long (15-30m)'}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Conviction</p>
                  <span className={`text-sm font-mono font-bold ${conviction.color}`}>
                    {conviction.text}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                  idea.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  idea.status === 'proposed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}>
                  {idea.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions Panel */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="actions-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Actions
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Take your idea to production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Create Submission */}
              <div className="space-y-2">
                <Button
                  onClick={handleCreateSubmission}
                  disabled={creatingSubmission || !scriptData || createdSubmissionId}
                  className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
                  data-testid="create-submission-btn"
                >
                  {creatingSubmission ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {createdSubmissionId ? 'Submission Created' : 'Create Submission'}
                </Button>
                {createdSubmissionId && (
                  <Link
                    to={`/dashboard/submissions/${createdSubmissionId}`}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    data-testid="view-submission-link"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View in Submissions
                  </Link>
                )}
              </div>

              <Separator className="bg-[#1F2933]" />

              {/* Create AI Video Task */}
              <div className="space-y-2">
                <Button
                  onClick={handleCreateVideoTask}
                  disabled={creatingVideoTask || !scriptData || createdVideoTaskId}
                  variant="outline"
                  className="w-full h-10 border-[#1F2933] bg-zinc-950/50 hover:bg-zinc-900 text-white disabled:opacity-50"
                  data-testid="create-video-task-btn"
                >
                  {creatingVideoTask ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Film className="h-4 w-4 mr-2" />
                  )}
                  {createdVideoTaskId ? 'Video Task Created' : 'Create AI Video Task'}
                </Button>
                {createdVideoTaskId && (
                  <Link
                    to="/dashboard/video-lab"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    data-testid="view-video-task-link"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View in AI Video Lab
                  </Link>
                )}
              </div>

              {!scriptData && (
                <p className="text-[10px] text-zinc-600 text-center">
                  Generating script... Actions will be available shortly.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Generated Script */}
        <div className="lg:col-span-8">
          <Card className="bg-[#0B1120] border-[#1F2933] h-full" data-testid="script-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-400" />
                  Generated Script
                </CardTitle>
                <div className="flex items-center gap-2">
                  {scriptData?.languageStyle && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                      {scriptData.languageStyle}
                    </Badge>
                  )}
                  {scriptData?.provider && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-500">
                      {scriptData.provider}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatingScript ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm text-zinc-400">Generating script using your Channel Profile...</p>
                  <p className="text-xs text-zinc-600 mt-1">This may take a few seconds.</p>
                </div>
              ) : scriptData ? (
                <>
                  {/* Hooks Preview */}
                  {scriptData.hooks && scriptData.hooks.length > 0 && (
                    <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-2">
                        Opening Hooks
                      </p>
                      <div className="space-y-1">
                        {scriptData.hooks.map((hook, i) => (
                          <p key={i} className="text-xs text-zinc-300 leading-relaxed">
                            {hook}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Script Actions */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateScript}
                      disabled={generatingScript}
                      className="h-8 px-3 text-xs text-zinc-400 hover:text-white"
                      data-testid="regenerate-script-btn"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generatingScript ? 'animate-spin' : ''}`} />
                      Regenerate Script
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyScript}
                      className="h-8 px-3 text-xs text-zinc-400 hover:text-white"
                      data-testid="copy-script-btn"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>

                  {/* Script Text */}
                  <ScrollArea className="h-[450px] rounded-lg">
                    <div className="p-4 rounded-lg bg-zinc-950/50 border border-[#1F2933]">
                      <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                        {scriptData.scriptText}
                      </pre>
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-10 w-10 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">No script generated yet.</p>
                  <Button
                    onClick={generateScript}
                    className="mt-4 bg-indigo-500 hover:bg-indigo-600"
                    data-testid="generate-script-btn"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Script
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
