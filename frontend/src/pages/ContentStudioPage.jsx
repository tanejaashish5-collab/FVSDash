/**
 * Content Studio — unified 4-step content creation page.
 * Idea → Script (editable) → Assets (audio + thumbnail + video) → Publish
 * Sessions are auto-saved to the strategy sessions DB.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Lightbulb, FileText, Video, Send, Sparkles, Loader2,
  ChevronRight, CheckCircle, AlertCircle, Mic, History,
  Plus, X, ImageIcon, RefreshCw, ExternalLink, Youtube
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VIDEO_PROVIDERS = [
  { value: 'veo', label: 'Veo (Google)' },
  { value: 'kling', label: 'Kling' },
  { value: 'runway', label: 'Runway' },
];

function StepLabel({ num, color, label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${color}`}>
        {num}
      </div>
      <Icon className="h-4 w-4 text-zinc-400" />
      <span className="text-sm font-semibold text-white">{label}</span>
    </div>
  );
}

function StatusBadge({ status, labels = {} }) {
  const cfg = {
    idle:       { cls: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20', text: labels.idle || 'Not started' },
    generating: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', text: labels.generating || 'Generating…' },
    processing: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', text: labels.processing || 'Processing…' },
    ready:      { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: labels.ready || 'Ready' },
    error:      { cls: 'bg-red-500/10 text-red-400 border-red-500/20', text: labels.error || 'Failed' },
    failed:     { cls: 'bg-red-500/10 text-red-400 border-red-500/20', text: labels.failed || 'Failed' },
  }[status] || { cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', text: status };
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${cfg.cls}`}>
      {(status === 'generating' || status === 'processing') && (
        <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
      )}
      {status === 'ready' && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
      {(status === 'error' || status === 'failed') && <AlertCircle className="h-2.5 w-2.5 mr-1" />}
      {cfg.text}
    </Badge>
  );
}

export default function ContentStudioPage() {
  const { authHeaders } = useAuth();
  const location = useLocation();

  // Session persistence
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // AI provider
  const [aiProvider, setAiProvider] = useState('gemini');
  const [videoProvider, setVideoProvider] = useState('veo');
  const [capabilities, setCapabilities] = useState({ llmProviders: [], videoProviders: [] });

  // Step 1: Idea
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [proposedIdeas, setProposedIdeas] = useState([]);
  const [proposingIdeas, setProposingIdeas] = useState(false);

  // Step 2: Script
  const [script, setScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioStatus, setAudioStatus] = useState('idle');
  const [audioWarning, setAudioWarning] = useState('');

  // Step 3: Assets
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailStatus, setThumbnailStatus] = useState('idle');
  const [thumbnailWarning, setThumbnailWarning] = useState('');
  const [videoTaskId, setVideoTaskId] = useState(null);
  const [videoStatus, setVideoStatus] = useState('idle');
  const [videoUrl, setVideoUrl] = useState('');

  // Step 4: Publish
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [pipelineUrl, setPipelineUrl] = useState('');

  const pollRef = useRef(null);

  // Init: load capabilities + channel tone
  useEffect(() => {
    if (!authHeaders) return;
    // Pre-fill from FVS System "Send to Studio"
    const prefill = sessionStorage.getItem('studio_prefill_idea');
    if (prefill) {
      try {
        const idea = JSON.parse(prefill);
        if (idea.topic) { setTopic(idea.topic); setPublishTitle(idea.topic); }
        if (idea.script) setScript(idea.script);
        sessionStorage.removeItem('studio_prefill_idea');
      } catch {}
    }
    Promise.all([
      axios.get(`${API}/ai/capabilities`, { headers: authHeaders }).catch(() => ({ data: { llmProviders: [], videoProviders: [] } })),
      axios.get(`${API}/channel-profile`, { headers: authHeaders }).catch(() => ({ data: null })),
    ]).then(([capRes, profileRes]) => {
      setCapabilities(capRes.data || {});
      const providers = capRes.data?.llmProviders || [];
      if (providers.length) setAiProvider(providers[0]);
      const profile = profileRes.data;
      if (profile?.tone) setTone(profile.tone);
      else if (profile?.brandDescription) setTone(profile.brandDescription);
    });
    fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  // Pre-fill from router state (passed via navigate from SubmissionsPage)
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) {
      if (prefill.topic) { setTopic(prefill.topic); setPublishTitle(prefill.topic); }
      if (prefill.script) setScript(prefill.script);
      // Clear router state so back-navigation doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Video polling
  useEffect(() => {
    if (videoTaskId && videoStatus === 'processing') {
      pollRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/video-tasks/${videoTaskId}`, { headers: authHeaders });
          const s = res.data.status;
          if (s === 'READY') {
            setVideoStatus('ready');
            setVideoUrl(res.data.resultUrl || res.data.previewUrl || '');
            clearInterval(pollRef.current);
            toast.success('Video is ready!');
          } else if (s === 'FAILED') {
            setVideoStatus('failed');
            clearInterval(pollRef.current);
            toast.error('Video generation failed');
          }
        } catch { /* keep polling */ }
      }, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [videoTaskId, videoStatus, authHeaders]);

  const fetchSessions = useCallback(async () => {
    if (!authHeaders) return;
    setLoadingSessions(true);
    try {
      const res = await axios.get(`${API}/strategy/sessions`, { headers: authHeaders });
      setSessions(res.data || []);
    } catch { /* silent */ } finally { setLoadingSessions(false); }
  }, [authHeaders]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    try {
      const res = await axios.post(`${API}/strategy/sessions`, {
        topic: topic || 'Untitled', target_audience: audience, tone, goal: 'educate', ai_model: aiProvider,
      }, { headers: authHeaders });
      setSessionId(res.data.id);
      fetchSessions();
      return res.data.id;
    } catch { return null; }
  };

  const saveToSession = async (sid, updates) => {
    if (!sid) return;
    try { await axios.patch(`${API}/strategy/sessions/${sid}`, updates, { headers: authHeaders }); } catch { /* silent */ }
  };

  // ── Step 1: Propose Ideas ──────────────────────────────────────────────────
  const handleProposeIdeas = async () => {
    setProposingIdeas(true);
    setProposedIdeas([]);
    try {
      const res = await axios.post(`${API}/ai/generate`, {
        provider: aiProvider, task: 'propose_ideas',
        input: { topic, audience, tone, goal: 'educate' },
      }, { headers: authHeaders });
      const ideas = res.data.ideas || [];
      setProposedIdeas(ideas);
      if (!ideas.length) toast.info('No ideas returned — add a topic hint and try again');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to propose ideas');
    } finally { setProposingIdeas(false); }
  };

  // ── Step 2: Script ────────────────────────────────────────────────────────
  const handleGenerateScript = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setGeneratingScript(true);
    try {
      const sid = await ensureSession();
      const res = await axios.post(`${API}/ai/generate`, {
        provider: aiProvider, task: 'script',
        input: { topic, audience, tone, goal: 'educate' },
      }, { headers: authHeaders });
      const out = res.data.scriptText || '';
      setScript(out);
      if (!publishTitle) setPublishTitle(topic);
      if (sid) await saveToSession(sid, { script_output: out });
      toast.success('Script ready — review and edit before generating audio');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Script generation failed');
    } finally { setGeneratingScript(false); }
  };

  // ── Step 2: Audio ─────────────────────────────────────────────────────────
  const handleGenerateAudio = async () => {
    if (!script.trim()) { toast.error('Generate or write a script first'); return; }
    setAudioStatus('generating');
    setAudioWarning('');
    try {
      const res = await axios.post(`${API}/ai/generate-voice`, { text: script }, { headers: authHeaders });
      const url = res.data.url || res.data.audioUrl || '';
      setAudioUrl(url);
      setAudioStatus('ready');
      if (res.data.warning) setAudioWarning(res.data.warning);
      toast.success('Audio generated!');
    } catch (e) {
      setAudioStatus('error');
      toast.error(e.response?.data?.detail || 'Audio generation failed');
    }
  };

  // ── Step 3: Thumbnail ─────────────────────────────────────────────────────
  const handleGenerateThumbnail = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setThumbnailStatus('generating');
    setThumbnailWarning('');
    try {
      const res = await axios.post(`${API}/ai/generate-thumbnail`, {
        topic, tone, title: publishTitle || topic,
      }, { headers: authHeaders });
      setThumbnailUrl(res.data.url || '');
      setThumbnailStatus('ready');
      if (res.data.warning) setThumbnailWarning(res.data.warning);
      toast.success('Thumbnail generated!');
    } catch (e) {
      setThumbnailStatus('error');
      toast.error(e.response?.data?.detail || 'Thumbnail generation failed');
    }
  };

  // ── Step 3: Video ─────────────────────────────────────────────────────────
  const handleGenerateVideo = async () => {
    if (!topic.trim() && !script.trim()) { toast.error('Add a topic or script first'); return; }
    setVideoStatus('processing');
    try {
      const res = await axios.post(`${API}/video-tasks`, {
        provider: videoProvider, mode: 'script',
        prompt: topic, script_text: script.slice(0, 500),
        aspect_ratio: '9:16', output_profile: 'shorts',
      }, { headers: authHeaders });
      setVideoTaskId(res.data.id || res.data.task_id);
      toast.info('Video generating — takes 1–3 mins. You can keep editing here.');
    } catch (e) {
      setVideoStatus('failed');
      toast.error(e.response?.data?.detail || 'Video generation failed');
    }
  };

  // ── Step 4: Publish ───────────────────────────────────────────────────────
  const handleAddToPipeline = async () => {
    const title = publishTitle || topic;
    if (!title.trim()) { toast.error('Enter a title'); return; }
    setPublishing(true);
    try {
      await axios.post(`${API}/submissions`, {
        title, description: publishDesc || script.slice(0, 300),
        contentType: 'Short', priority: 'High',
      }, { headers: authHeaders });
      setPipelineUrl('/dashboard/submissions');
      toast.success(`"${title}" added to Pipeline`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed — try again');
    } finally { setPublishing(false); }
  };

  // ── Session load ──────────────────────────────────────────────────────────
  const loadSession = async (session) => {
    try {
      const res = await axios.get(`${API}/strategy/sessions/${session.id}`, { headers: authHeaders });
      const d = res.data;
      setTopic(d.topic || '');
      setAudience(d.target_audience || '');
      setTone(d.tone || '');
      setScript(d.script_output || '');
      setSessionId(d.id);
      setPublishTitle(d.topic || '');
      setPublishDesc('');
      setAudioUrl(''); setAudioStatus('idle');
      setThumbnailUrl(''); setThumbnailStatus('idle');
      setVideoTaskId(null); setVideoStatus('idle'); setVideoUrl('');
      setProposedIdeas([]);
      setPipelineUrl('');
      clearInterval(pollRef.current);
      setHistoryOpen(false);
      toast.success('Session loaded');
    } catch { toast.error('Failed to load session'); }
  };

  const startNew = () => {
    setSessionId(null); setTopic(''); setAudience(''); setScript('');
    setAudioUrl(''); setAudioStatus('idle'); setAudioWarning('');
    setThumbnailUrl(''); setThumbnailStatus('idle'); setThumbnailWarning('');
    setVideoTaskId(null); setVideoStatus('idle'); setVideoUrl('');
    setProposedIdeas([]); setPublishTitle(''); setPublishDesc(''); setPipelineUrl('');
    clearInterval(pollRef.current);
  };

  const hasIdea = topic.trim().length > 0;
  const hasScript = script.trim().length > 0;
  const llmProviders = capabilities.llmProviders?.length ? capabilities.llmProviders : ['gemini'];

  return (
    <div className="flex h-full" data-testid="content-studio-page">

      {/* ── History Sidebar ─────────────────────────────────────────────── */}
      {historyOpen && (
        <div className="w-60 shrink-0 border-r border-[#1F2933] bg-[#070D15] flex flex-col">
          <div className="p-3 border-b border-[#1F2933] flex items-center justify-between">
            <span className="text-sm font-medium text-white">Sessions</span>
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(false)}
              className="h-6 w-6 p-0 text-zinc-500 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="p-2">
            <Button onClick={startNew} size="sm"
              className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-3 w-3 mr-1" /> New Session
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingSessions && <Loader2 className="h-4 w-4 animate-spin text-zinc-500 mx-auto mt-4" />}
            {!loadingSessions && sessions.length === 0 && (
              <p className="text-xs text-zinc-600 text-center mt-4">No sessions yet</p>
            )}
            {sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s)}
                className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                  sessionId === s.id
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white border border-transparent'
                }`}>
                <p className="font-medium truncate">{s.title || s.topic || 'Untitled'}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5">
                  {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Content Studio
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">Idea → Script → Assets → Pipeline — all in one place</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm"
                onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) fetchSessions(); }}
                className="h-8 text-xs text-zinc-400 hover:text-white">
                <History className="h-4 w-4 mr-1.5" /> History
              </Button>
              <Button variant="ghost" size="sm" onClick={startNew}
                className="h-8 text-xs text-zinc-400 hover:text-white">
                <Plus className="h-4 w-4 mr-1.5" /> New
              </Button>
              <Select value={aiProvider} onValueChange={setAiProvider}>
                <SelectTrigger className="h-8 w-36 text-xs bg-zinc-900 border-zinc-700 text-zinc-300">
                  <SelectValue placeholder="AI Model" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {llmProviders.map(p => (
                    <SelectItem key={p} value={p} className="text-xs text-zinc-300">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            {/* ── Left column: Steps 1-4 ─────────────────────────────── */}
            <div className="xl:col-span-3 space-y-4">

              {/* STEP 1: IDEA */}
              <Card className="bg-[#0B1120] border-[#1F2933]">
                <CardHeader className="pb-2 pt-4 px-4">
                  <StepLabel num="1" color="bg-amber-500/20 text-amber-400" label="Idea" icon={Lightbulb} />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Topic / Concept</Label>
                    <Textarea
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="What is this Short about? Be specific."
                      className="min-h-[64px] bg-zinc-950 border-zinc-800 text-white text-sm resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Target Audience</Label>
                      <Input value={audience} onChange={e => setAudience(e.target.value)}
                        placeholder="e.g. Indian entrepreneurs" className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Tone / Voice</Label>
                      <Input value={tone} onChange={e => setTone(e.target.value)}
                        placeholder="Bold, strategic…" className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs" />
                    </div>
                  </div>
                  <Button onClick={handleProposeIdeas} disabled={proposingIdeas} size="sm"
                    className="w-full h-9 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-xs justify-start">
                    {proposingIdeas
                      ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                    Propose Ideas (AI generates 5 topics)
                    <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
                  </Button>
                  {proposedIdeas.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {proposedIdeas.map((idea, i) => (
                        <div key={i}
                          className="group p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/30 cursor-pointer transition-all"
                          onClick={() => { setTopic(idea.title); setPublishTitle(idea.title); setProposedIdeas([]); toast.success('Topic set'); }}>
                          <p className="text-xs text-white font-medium">{idea.title}</p>
                          {idea.hook && <p className="text-[10px] text-amber-400/70 italic mt-0.5">"{idea.hook}…"</p>}
                          {idea.angle && <p className="text-[10px] text-zinc-500 mt-1">{idea.angle}</p>}
                          <p className="text-[10px] text-indigo-400 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to use this idea →
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* STEP 2: SCRIPT */}
              <Card className="bg-[#0B1120] border-[#1F2933]">
                <CardHeader className="pb-2 pt-4 px-4">
                  <StepLabel num="2" color="bg-blue-500/20 text-blue-400" label="Script" icon={FileText} />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <Button onClick={handleGenerateScript} disabled={!hasIdea || generatingScript} size="sm"
                    className="w-full h-9 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 text-xs justify-start">
                    {generatingScript
                      ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                    {hasScript ? 'Regenerate Script' : 'Generate Script'}
                    <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
                  </Button>

                  {/* Editable script textarea — always shown once we have content */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400">
                        Script {hasScript ? '(edit freely before generating audio)' : '(will appear here after generation)'}
                      </Label>
                      {hasScript && (
                        <span className="text-[10px] text-zinc-600">
                          {script.split(' ').length} words · ~{Math.ceil(script.split(' ').length / 130)} min
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={script}
                      onChange={e => setScript(e.target.value)}
                      placeholder="Your script will appear here. You can also type or paste directly."
                      className="min-h-[180px] bg-zinc-950 border-zinc-800 text-white text-xs font-mono leading-relaxed resize-y"
                    />
                  </div>

                  <Separator className="bg-zinc-800/60" />

                  {/* Audio */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Mic className="h-3.5 w-3.5" /> Audio via ElevenLabs
                      </Label>
                      <StatusBadge status={audioStatus} labels={{ idle: 'Not generated', ready: 'Ready ✓' }} />
                    </div>
                    <Button onClick={handleGenerateAudio} disabled={audioStatus === 'generating' || !hasScript} size="sm"
                      className="w-full h-9 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 text-white text-xs justify-start">
                      {audioStatus === 'generating'
                        ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        : <Mic className="h-3.5 w-3.5 mr-2 text-emerald-400" />}
                      {audioStatus === 'ready' ? 'Regenerate Audio' : 'Generate Audio from Script'}
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
                    </Button>
                    {audioWarning && (
                      <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {audioWarning}
                      </p>
                    )}
                    {audioStatus === 'ready' && audioUrl && (
                      <audio controls className="w-full mt-1" style={{ height: 36, colorScheme: 'dark' }}>
                        <source src={audioUrl} />
                      </audio>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* STEP 3: ASSETS */}
              <Card className="bg-[#0B1120] border-[#1F2933]">
                <CardHeader className="pb-2 pt-4 px-4">
                  <StepLabel num="3" color="bg-violet-500/20 text-violet-400" label="Assets" icon={Video} />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">

                  {/* Thumbnail */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Thumbnail (DALL-E)
                      </Label>
                      <StatusBadge status={thumbnailStatus} labels={{ idle: 'Not generated', ready: 'Ready ✓' }} />
                    </div>
                    <Button onClick={handleGenerateThumbnail}
                      disabled={!hasIdea || thumbnailStatus === 'generating'} size="sm"
                      className="w-full h-9 bg-zinc-900 border border-zinc-800 hover:border-violet-500/30 text-white text-xs justify-start">
                      {thumbnailStatus === 'generating'
                        ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        : <ImageIcon className="h-3.5 w-3.5 mr-2 text-violet-400" />}
                      {thumbnailStatus === 'ready' ? 'Regenerate Thumbnail' : 'Generate Thumbnail'}
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
                    </Button>
                    {thumbnailWarning && (
                      <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {thumbnailWarning}
                      </p>
                    )}
                    {thumbnailUrl && (
                      <img src={thumbnailUrl} alt="Generated thumbnail"
                        className="w-full rounded-lg border border-zinc-800 object-cover aspect-video mt-1" />
                    )}
                  </div>

                  <Separator className="bg-zinc-800/60" />

                  {/* Video */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Video className="h-3.5 w-3.5" /> AI Video
                      </Label>
                      <StatusBadge status={videoStatus} labels={{ idle: 'Not started', processing: 'Generating…', ready: 'Ready ✓' }} />
                    </div>
                    <div className="flex gap-2">
                      <Select value={videoProvider} onValueChange={setVideoProvider}>
                        <SelectTrigger className="h-9 flex-1 bg-zinc-950 border-zinc-800 text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {VIDEO_PROVIDERS.map(p => (
                            <SelectItem key={p.value} value={p.value} className="text-xs text-zinc-300">{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleGenerateVideo}
                        disabled={(!hasIdea && !hasScript) || videoStatus === 'processing'} size="sm"
                        className="h-9 px-4 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-400 text-xs">
                        {videoStatus === 'processing'
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Sparkles className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {videoStatus === 'processing' && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-amber-400 font-medium">Video is generating</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Checking every 5s — takes 1–3 mins. Keep this page open.
                          </p>
                        </div>
                      </div>
                    )}
                    {videoStatus === 'ready' && videoUrl && (
                      <video controls className="w-full rounded-lg border border-zinc-800 mt-1" style={{ maxHeight: 300 }}>
                        <source src={videoUrl} />
                      </video>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* STEP 4: PUBLISH */}
              <Card className="bg-[#0B1120] border-[#1F2933]">
                <CardHeader className="pb-2 pt-4 px-4">
                  <StepLabel num="4" color="bg-emerald-500/20 text-emerald-400" label="Add to Pipeline" icon={Send} />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Title</Label>
                    <Input
                      value={publishTitle || topic}
                      onChange={e => setPublishTitle(e.target.value)}
                      placeholder="Short title for this piece of content"
                      className="h-9 bg-zinc-950 border-zinc-800 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Description (optional)</Label>
                    <Textarea
                      value={publishDesc}
                      onChange={e => setPublishDesc(e.target.value)}
                      placeholder="Brief description for the Pipeline card"
                      className="min-h-[60px] bg-zinc-950 border-zinc-800 text-white text-xs resize-none"
                    />
                  </div>
                  <Button onClick={handleAddToPipeline} disabled={publishing || !hasIdea} size="sm"
                    className="w-full h-9 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs">
                    {publishing
                      ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      : <Send className="h-3.5 w-3.5 mr-2" />}
                    Add to Pipeline
                  </Button>
                  {pipelineUrl && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3" />
                      Added to Pipeline — go to the Pipeline page to track production status
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Right column: Session preview ──────────────────────── */}
            <div className="xl:col-span-2 space-y-4">
              <Card className="bg-[#0B1120] border-[#1F2933] xl:sticky xl:top-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-white">Session Preview</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  {!hasIdea && !hasScript ? (
                    <div className="text-center py-12">
                      <Sparkles className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">Your generated content will preview here</p>
                      <p className="text-[10px] text-zinc-600 mt-1">Start by entering a topic or proposing ideas</p>
                    </div>
                  ) : (
                    <>
                      {topic && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Topic</p>
                          <p className="text-sm text-white font-medium leading-snug">{topic}</p>
                        </div>
                      )}

                      {hasScript && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Script Preview</p>
                          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-8 whitespace-pre-line">
                            {script}
                          </p>
                        </div>
                      )}

                      {audioStatus === 'ready' && audioUrl && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-400" /> Audio
                          </p>
                          <audio controls className="w-full" style={{ height: 36, colorScheme: 'dark' }}>
                            <source src={audioUrl} />
                          </audio>
                        </div>
                      )}

                      {thumbnailUrl && thumbnailStatus === 'ready' && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-400" /> Thumbnail
                          </p>
                          <img src={thumbnailUrl} alt="Thumbnail"
                            className="w-full rounded-lg border border-zinc-800 object-cover aspect-video" />
                        </div>
                      )}

                      {videoStatus === 'processing' && (
                        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                          <div>
                            <p className="text-xs text-amber-400 font-medium">Video generating…</p>
                            <p className="text-[10px] text-zinc-500">Auto-checks every 5s</p>
                          </div>
                        </div>
                      )}

                      {videoStatus === 'ready' && videoUrl && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-400" /> Video
                          </p>
                          <video controls className="w-full rounded-lg border border-zinc-800" style={{ maxHeight: 240 }}>
                            <source src={videoUrl} />
                          </video>
                        </div>
                      )}

                      {pipelineUrl && (
                        <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <p className="text-xs text-emerald-400">In Pipeline — tracking production status</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
