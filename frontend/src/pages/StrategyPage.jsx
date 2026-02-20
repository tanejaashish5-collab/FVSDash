import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, Brain, FileText, ListOrdered, Youtube, Loader2, 
  Copy, Check, ChevronRight, Plus, Lightbulb, Clock, History, 
  PanelLeftClose, PanelLeftOpen, Trash2, X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PROVIDERS = [
  { value: 'gemini', label: 'Gemini', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'openai', label: 'OpenAI', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'anthropic', label: 'Anthropic', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
];

const GOALS = [
  { value: 'educate', label: 'Educate' },
  { value: 'sell', label: 'Sell' },
  { value: 'entertain', label: 'Entertain' },
  { value: 'authority', label: 'Build Authority' },
];

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function StrategyPage() {
  const { authHeaders } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Provider & capabilities
  const [provider, setProvider] = useState('gemini');
  const [capabilities, setCapabilities] = useState({ llmProviders: [], videoProviders: [] });
  
  // Input state
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [goal, setGoal] = useState('educate');
  
  // Output state
  const [research, setResearch] = useState('');
  const [outline, setOutline] = useState([]);
  const [script, setScript] = useState('');
  const [titles, setTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [chapters, setChapters] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('research');
  const [loading, setLoading] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionData, setSubmissionData] = useState({ title: '', contentType: 'Podcast', releaseDate: '' });
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  
  // Session history state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [linkedSubmissionId, setLinkedSubmissionId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  // Fetch capabilities, settings, and channel profile for tone pre-population
  useEffect(() => {
    if (!authHeaders) return;
    
    axios.get(`${API}/ai/capabilities`, { headers: authHeaders })
      .then(res => setCapabilities(res.data))
      .catch(console.error);
    
    // First try to get tone from channel profile (Brand Brain)
    axios.get(`${API}/channel-profile`, { headers: authHeaders })
      .then(res => {
        if (res.data?.tone) {
          setTone(res.data.tone);
        } else if (res.data?.brandDescription) {
          // Fallback to brand description if tone is not set
          setTone(res.data.brandDescription);
        } else {
          // If channel profile has no tone, try settings
          axios.get(`${API}/settings`, { headers: authHeaders })
            .then(settingsRes => {
              if (settingsRes.data.brandVoiceDescription) {
                setTone(settingsRes.data.brandVoiceDescription);
              }
            })
            .catch(console.error);
        }
      })
      .catch(() => {
        // If channel profile fails, try settings as fallback
        axios.get(`${API}/settings`, { headers: authHeaders })
          .then(res => {
            if (res.data.brandVoiceDescription) {
              setTone(res.data.brandVoiceDescription);
            }
          })
          .catch(console.error);
      });
  }, [authHeaders]);

  // Handle submissionId query param
  useEffect(() => {
    const submissionId = searchParams.get('submissionId');
    if (submissionId && authHeaders) {
      setLinkedSubmissionId(submissionId);
      // Fetch submission title to pre-fill topic
      axios.get(`${API}/submissions/${submissionId}`, { headers: authHeaders })
        .then(res => {
          if (res.data?.title) {
            setTopic(res.data.title);
          }
        })
        .catch(console.error);
    }
  }, [searchParams, authHeaders]);

  // Fetch session history
  const fetchSessions = useCallback(async () => {
    if (!authHeaders) return;
    setLoadingSessions(true);
    try {
      const res = await axios.get(`${API}/strategy/sessions`, { headers: authHeaders });
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create or ensure session exists
  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId;
    
    try {
      const res = await axios.post(`${API}/strategy/sessions`, {
        topic,
        target_audience: audience,
        tone,
        goal,
        ai_model: provider,
        submission_id: linkedSubmissionId
      }, { headers: authHeaders });
      
      setActiveSessionId(res.data.id);
      fetchSessions(); // Refresh list
      return res.data.id;
    } catch (err) {
      console.error('Failed to create session:', err);
      return null;
    }
  };

  // Save output to session
  const saveOutputToSession = async (sessionId, outputType, outputValue) => {
    if (!sessionId) return;
    
    try {
      await axios.patch(`${API}/strategy/sessions/${sessionId}`, {
        [outputType]: outputValue
      }, { headers: authHeaders });
      fetchSessions(); // Refresh to update timestamp
    } catch (err) {
      console.error('Failed to save output:', err);
    }
  };

  const callAI = async (task, existingContent = '') => {
    setLoading(prev => ({ ...prev, [task]: true }));
    try {
      // Ensure we have a session before generating
      const sessionId = await ensureSession();
      
      const res = await axios.post(`${API}/ai/generate`, {
        provider,
        task,
        input: {
          topic,
          audience,
          tone,
          goal,
          existingContent
        }
      }, { headers: authHeaders });
      
      // Handle response based on task
      if (task === 'research') {
        const output = res.data.researchSummary || '';
        setResearch(output);
        setActiveTab('research');
        toast.success('Research generated');
        // Save to session
        if (sessionId) await saveOutputToSession(sessionId, 'research_output', output);
      } else if (task === 'outline') {
        const output = res.data.outlineSections || [];
        setOutline(output);
        setActiveTab('outline');
        toast.success('Outline generated');
        if (sessionId) await saveOutputToSession(sessionId, 'outline_output', JSON.stringify(output));
      } else if (task === 'script') {
        const output = res.data.scriptText || '';
        setScript(output);
        setActiveTab('script');
        toast.success('Script generated');
        if (sessionId) await saveOutputToSession(sessionId, 'script_output', output);
      } else if (task === 'youtube_package') {
        const metadata = {
          titles: res.data.titleIdeas || [],
          description: res.data.descriptionText || '',
          tags: res.data.tags || [],
          chapters: res.data.chapters || []
        };
        setTitles(metadata.titles);
        setDescription(metadata.description);
        setTags(metadata.tags);
        setChapters(metadata.chapters);
        setActiveTab('metadata');
        toast.success('YouTube package generated');
        if (sessionId) await saveOutputToSession(sessionId, 'metadata_output', JSON.stringify(metadata));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to generate ${task}`);
    } finally {
      setLoading(prev => ({ ...prev, [task]: false }));
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleCreateSubmission = async () => {
    if (!submissionData.title) {
      toast.error('Please enter a title');
      return;
    }
    
    setCreatingSubmission(true);
    try {
      await axios.post(`${API}/submissions`, {
        title: submissionData.title,
        description: description || script.slice(0, 500),
        contentType: submissionData.contentType,
        releaseDate: submissionData.releaseDate || null,
        guest: '',
        priority: 'Medium'
      }, { headers: authHeaders });
      
      toast.success('Submission created from strategy');
      setShowSubmissionModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setCreatingSubmission(false);
    }
  };

  // Load a session from history
  const loadSession = async (session) => {
    try {
      const res = await axios.get(`${API}/strategy/sessions/${session.id}`, { headers: authHeaders });
      const data = res.data;
      
      // Load form fields
      setTopic(data.topic || '');
      setAudience(data.target_audience || '');
      setTone(data.tone || '');
      setGoal(data.goal || 'educate');
      setProvider(data.ai_model || 'gemini');
      setLinkedSubmissionId(data.submission_id);
      setActiveSessionId(data.id);
      
      // Load outputs
      setResearch(data.research_output || '');
      
      // Parse outline (stored as JSON)
      try {
        const parsedOutline = data.outline_output ? JSON.parse(data.outline_output) : [];
        setOutline(Array.isArray(parsedOutline) ? parsedOutline : []);
      } catch {
        setOutline([]);
      }
      
      setScript(data.script_output || '');
      
      // Parse metadata (stored as JSON)
      try {
        const metadata = data.metadata_output ? JSON.parse(data.metadata_output) : {};
        setTitles(metadata.titles || []);
        setDescription(metadata.description || '');
        setTags(metadata.tags || []);
        setChapters(metadata.chapters || []);
        setSelectedTitle('');
      } catch {
        setTitles([]);
        setDescription('');
        setTags([]);
        setChapters([]);
      }
      
      // Switch to tab with content
      if (data.research_output) setActiveTab('research');
      
      toast.success('Session loaded');
    } catch (err) {
      toast.error('Failed to load session');
    }
  };

  // Start new session
  const startNewSession = () => {
    setActiveSessionId(null);
    setLinkedSubmissionId(null);
    setTopic('');
    setAudience('');
    setTone('');
    setGoal('educate');
    setResearch('');
    setOutline([]);
    setScript('');
    setTitles([]);
    setSelectedTitle('');
    setDescription('');
    setTags([]);
    setChapters([]);
    setActiveTab('research');
    toast.info('Starting new session');
  };

  // Delete session
  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    setDeletingSessionId(sessionId);
    try {
      await axios.delete(`${API}/strategy/sessions/${sessionId}`, { headers: authHeaders });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        startNewSession();
      }
      toast.success('Session deleted');
    } catch (err) {
      toast.error('Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const isAnyLoading = Object.values(loading).some(v => v);
  const providerConfig = PROVIDERS.find(p => p.value === provider);
  const currentSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div data-testid="strategy-page" className="flex">
      {/* History Sidebar */}
      <div 
        className={`shrink-0 transition-all duration-300 ease-in-out ${historyOpen ? 'w-60' : 'w-0'}`}
        data-testid="history-sidebar"
      >
        {historyOpen && (
          <div className="h-full w-60 border-r border-[#1F2933] bg-[#070D15] flex flex-col">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-[#1F2933] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-white">Session History</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(false)}
                className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* New Session Button */}
            <div className="p-3">
              <Button
                onClick={startNewSession}
                className="w-full h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs"
                data-testid="new-session-btn"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Session
              </Button>
            </div>
            
            {/* Sessions List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-3">
                    <History className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">No sessions yet.</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Generate content to save your first session.</p>
                  </div>
                ) : (
                  sessions.map(session => {
                    const isActive = session.id === activeSessionId;
                    const modelConfig = PROVIDERS.find(p => p.value === session.ai_model);
                    
                    return (
                      <div
                        key={session.id}
                        onClick={() => loadSession(session)}
                        data-testid={`session-${session.id}`}
                        className={`group p-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
                          isActive 
                            ? 'bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                            : 'hover:bg-white/[0.04] hover:translate-x-1 border border-transparent hover:border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate ${isActive ? 'text-indigo-400' : 'text-white'}`}>
                              {session.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${modelConfig?.color || 'bg-zinc-500/10 text-zinc-400'}`}>
                                {modelConfig?.label || session.ai_model}
                              </Badge>
                              <span className="text-[10px] text-zinc-600">{formatRelativeTime(session.updated_at)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteSession(session.id, e)}
                            disabled={deletingSessionId === session.id}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 shrink-0"
                            data-testid={`delete-session-${session.id}`}
                          >
                            {deletingSessionId === session.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Toggle Button (when sidebar is closed) */}
      {!historyOpen && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-20 w-6 rounded-none rounded-r-md bg-[#0B1120] border border-l-0 border-[#1F2933] text-zinc-500 hover:text-white hover:bg-[#1F2933]"
            data-testid="toggle-history-btn"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6 pl-2">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Strategy Lab
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Research, outline, and script episodes with your choice of AI model.</p>
            {currentSession && (
              <p className="text-xs text-indigo-400/70 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Session: {currentSession.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="h-8 text-xs text-zinc-400 hover:text-white"
              data-testid="history-toggle"
            >
              <History className="h-4 w-4 mr-1.5" />
              History
            </Button>
            <Badge variant="outline" className={`text-xs px-2 py-1 ${providerConfig?.color}`}>
              <Sparkles className="h-3 w-3 mr-1" />
              {providerConfig?.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Inputs & Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Model Selection */}
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Brain className="h-4 w-4 text-zinc-400" />
                  AI Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger data-testid="model-select" className="h-9 bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    {capabilities.llmProviders.length > 0 ? (
                      PROVIDERS.filter(p => capabilities.llmProviders.includes(p.value)).map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-zinc-300">
                          {p.label}
                        </SelectItem>
                      ))
                    ) : (
                      PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-zinc-300">
                          {p.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Episode Concept */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="concept-card">
              <CardHeader className="pb-3">
                <AuraTooltip content={tooltipContent.strategyLab.contentAngle} position="right">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-zinc-400" />
                    Episode Concept
                  </CardTitle>
                </AuraTooltip>
                <CardDescription className="text-xs text-zinc-500">
                  Define your episode idea and parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Topic or Idea</Label>
                  <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What's your episode about? Be specific..."
                    className="min-h-[80px] bg-zinc-950 border-zinc-800 text-white resize-none"
                    data-testid="input-topic"
                  />
                </div>

                <div className="space-y-2">
                  <AuraTooltip content={tooltipContent.strategyLab.targetAudience} position="right">
                    <Label className="text-xs font-medium text-zinc-400">Target Audience</Label>
                  </AuraTooltip>
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Who is this for? e.g., Marketing professionals, beginners..."
                    className="h-9 bg-zinc-950 border-zinc-800 text-white"
                    data-testid="input-audience"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Tone / Brand Voice</Label>
                  <Textarea
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="Professional, casual, humorous, authoritative..."
                    className="min-h-[60px] bg-zinc-950 border-zinc-800 text-white resize-none"
                    data-testid="input-tone"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Goal</Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger data-testid="goal-select" className="h-9 bg-zinc-950 border-zinc-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                      {GOALS.map(g => (
                        <SelectItem key={g.value} value={g.value} className="text-zinc-300">
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  Generate Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => callAI('research')}
                  disabled={!topic || isAnyLoading}
                  className="w-full h-9 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-indigo-500/30 text-white justify-start"
                  data-testid="btn-research"
                >
                  {loading.research ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2 text-blue-400" />
                  )}
                  Generate Research
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>

                <Button
                  onClick={() => callAI('outline', research)}
                  disabled={!topic || isAnyLoading}
                  className="w-full h-9 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-indigo-500/30 text-white justify-start"
                  data-testid="btn-outline"
                >
                  {loading.outline ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ListOrdered className="h-4 w-4 mr-2 text-emerald-400" />
                  )}
                  Generate Outline
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>

                <Button
                  onClick={() => callAI('script', outline.join('\n'))}
                  disabled={!topic || isAnyLoading}
                  className="w-full h-9 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-indigo-500/30 text-white justify-start"
                  data-testid="btn-script"
                >
                  {loading.script ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2 text-violet-400" />
                  )}
                  Generate Script
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>

                <Separator className="bg-[#1F2933]" />

                <Button
                  onClick={() => callAI('youtube_package', script || outline.join('\n'))}
                  disabled={!topic || isAnyLoading}
                  className="w-full h-9 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 justify-start"
                  data-testid="btn-youtube"
                >
                  {loading.youtube_package ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Youtube className="h-4 w-4 mr-2" />
                  )}
                  Generate YouTube Package
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </Button>
              </CardContent>
            </Card>

            {/* Create Submission Button */}
            {(script || description) && (
              <Button
                onClick={() => {
                  setSubmissionData({
                    title: selectedTitle || titles[0] || topic,
                    contentType: 'Podcast',
                    releaseDate: ''
                  });
                  setShowSubmissionModal(true);
                }}
                className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
                data-testid="btn-create-submission"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Submission from Script
              </Button>
            )}
          </div>

          {/* Right Panel: Outputs */}
          <div className="lg:col-span-7">
            <Card className="bg-[#0B1120] border-[#1F2933] h-full" data-testid="outputs-card">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <CardHeader className="pb-0">
                  <TabsList className="bg-zinc-950/50 p-1">
                    <TabsTrigger value="research" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                      Research
                    </TabsTrigger>
                    <TabsTrigger value="outline" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                      Outline
                    </TabsTrigger>
                    <TabsTrigger value="script" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                      Script
                    </TabsTrigger>
                    <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                      Metadata
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="flex-1 pt-4 overflow-auto">
                  <TabsContent value="research" className="mt-0 h-full">
                    {research ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Research Summary</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(research, 'research')}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            {copiedField === 'research' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            Copy
                          </Button>
                        </div>
                        <div className="p-4 rounded-md bg-zinc-950/50 border border-[#1F2933] text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                          {research}
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon={Brain} text="Click 'Generate Research' to start" />
                    )}
                  </TabsContent>

                  <TabsContent value="outline" className="mt-0 h-full">
                    {outline.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Episode Outline</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(outline.join('\n'), 'outline')}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            {copiedField === 'outline' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            Copy
                          </Button>
                        </div>
                        <div className="p-4 rounded-md bg-zinc-950/50 border border-[#1F2933] max-h-[500px] overflow-y-auto">
                          <ul className="space-y-2">
                            {outline.map((item, i) => (
                              <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                <span className="text-indigo-400 shrink-0">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon={ListOrdered} text="Click 'Generate Outline' to create structure" />
                    )}
                  </TabsContent>

                  <TabsContent value="script" className="mt-0 h-full">
                    {script ? (
                      <div className="space-y-3 h-full flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Episode Script</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(script, 'script')}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            {copiedField === 'script' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            Copy
                          </Button>
                        </div>
                        <Textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          className="flex-1 min-h-[400px] bg-zinc-950/50 border-[#1F2933] text-sm text-zinc-300 resize-none"
                          data-testid="script-textarea"
                        />
                      </div>
                    ) : (
                      <EmptyState icon={FileText} text="Click 'Generate Script' to write content" />
                    )}
                  </TabsContent>

                  <TabsContent value="metadata" className="mt-0 h-full overflow-auto">
                    {(titles.length > 0 || description || tags.length > 0) ? (
                      <div className="space-y-6">
                        {/* Titles */}
                        {titles.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Title Ideas</span>
                            <div className="space-y-2">
                              {titles.map((title, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedTitle(title)}
                                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                                    selectedTitle === title
                                      ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                                      : 'bg-zinc-950/50 border-[#1F2933] text-zinc-300 hover:border-zinc-600'
                                  }`}
                                >
                                  <span className="text-sm">{title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {description && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Description</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(description, 'description')}
                                className="h-6 text-[10px] text-zinc-400 hover:text-white"
                              >
                                {copiedField === 'description' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              className="min-h-[120px] bg-zinc-950/50 border-[#1F2933] text-sm text-zinc-300 resize-none"
                            />
                          </div>
                        )}

                        {/* Tags */}
                        {tags.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Tags</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(tags.join(', '), 'tags')}
                                className="h-6 text-[10px] text-zinc-400 hover:text-white"
                              >
                                {copiedField === 'tags' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 bg-zinc-950/50 border-[#1F2933] text-zinc-400">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Chapters */}
                        {chapters.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Chapters</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n'), 'chapters')}
                                className="h-6 text-[10px] text-zinc-400 hover:text-white"
                              >
                                {copiedField === 'chapters' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {chapters.map((ch, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-950/50 border border-[#1F2933]">
                                  <span className="text-xs font-mono text-indigo-400 w-12">{ch.timestamp}</span>
                                  <span className="text-sm text-zinc-300">{ch.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <EmptyState icon={Youtube} text="Click 'Generate YouTube Package' for metadata" />
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* Create Submission Modal */}
        <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
          <DialogContent className="bg-[#0B1120] border-[#1F2933] sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-white">Create Submission</DialogTitle>
              <DialogDescription className="text-zinc-500">
                Create a new submission from your strategy content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Title</Label>
                <Input
                  value={submissionData.title}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Content Type</Label>
                <Select value={submissionData.contentType} onValueChange={(v) => setSubmissionData(prev => ({ ...prev, contentType: v }))}>
                  <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    <SelectItem value="Podcast" className="text-zinc-300">Podcast</SelectItem>
                    <SelectItem value="Short" className="text-zinc-300">Short</SelectItem>
                    <SelectItem value="Blog" className="text-zinc-300">Blog</SelectItem>
                    <SelectItem value="Webinar" className="text-zinc-300">Webinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Release Date (optional)</Label>
                <Input
                  type="date"
                  value={submissionData.releaseDate}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, releaseDate: e.target.value }))}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmissionModal(false)} className="border-zinc-800 text-zinc-300">
                Cancel
              </Button>
              <Button onClick={handleCreateSubmission} disabled={creatingSubmission} className="bg-indigo-500 hover:bg-indigo-600">
                {creatingSubmission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-12">
      <Icon className="h-10 w-10 text-zinc-700 mb-3" />
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}
