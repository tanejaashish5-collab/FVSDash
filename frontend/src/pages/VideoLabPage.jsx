import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Video, Play, RefreshCw, Save, Loader2, Film, Wand2,
  FileVideo, FileAudio, Sparkles, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VIDEO_PROVIDERS = [
  { value: 'runway', label: 'Runway', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'veo', label: 'Veo', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'kling', label: 'Kling (Mock)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
];

const MODES = [
  { value: 'script', label: 'Script → Video', icon: FileVideo, description: 'Generate video from a script or text prompt' },
  { value: 'audio', label: 'Audio → Video', icon: FileAudio, description: 'Create visuals synced to audio' },
  { value: 'remix', label: 'Remix Clip', icon: Sparkles, description: 'Transform an existing video with new style' },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '1:1', label: '1:1 (Square)' },
];

const OUTPUT_PROFILES = [
  { value: 'youtube_long', label: 'YouTube Long' },
  { value: 'shorts', label: 'Shorts / TikTok' },
  { value: 'reel', label: 'Instagram Reel' },
];

const statusCfg = {
  PENDING: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', icon: Clock },
  PROCESSING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Loader2 },
  READY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  FAILED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: XCircle },
};

export default function VideoLabPage() {
  const { authHeaders } = useAuth();
  
  // Provider & capabilities
  const [provider, setProvider] = useState('kling');
  const [mode, setMode] = useState('script');
  const [capabilities, setCapabilities] = useState({ llmProviders: [], videoProviders: [] });
  
  // Form state
  const [prompt, setPrompt] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [outputProfile, setOutputProfile] = useState('youtube_long');
  const [selectedAudioAsset, setSelectedAudioAsset] = useState('');
  const [selectedVideoAsset, setSelectedVideoAsset] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState('');
  
  // Data
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshingTask, setRefreshingTask] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [capRes, tasksRes, assetsRes, subsRes] = await Promise.all([
          axios.get(`${API}/ai/capabilities`, { headers: authHeaders }),
          axios.get(`${API}/video-tasks`, { headers: authHeaders }),
          axios.get(`${API}/assets/library`, { headers: authHeaders }),
          axios.get(`${API}/submissions/list`, { headers: authHeaders }),
        ]);
        setCapabilities(capRes.data);
        setTasks(tasksRes.data || []);
        setAssets(assetsRes.data || []);
        setSubmissions(subsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authHeaders]);

  const handleCreateTask = async () => {
    if (!prompt) {
      toast.error('Please enter a prompt');
      return;
    }
    
    setCreating(true);
    try {
      const taskData = {
        provider,
        prompt,
        mode,
        scriptText: mode === 'script' ? scriptText : null,
        audioAssetId: mode === 'audio' ? selectedAudioAsset : null,
        sourceAssetId: mode === 'remix' ? selectedVideoAsset : null,
        aspectRatio,
        outputProfile,
        submissionId: selectedSubmission || null,
      };
      
      const res = await axios.post(`${API}/video-tasks`, taskData, { headers: authHeaders });
      setTasks(prev => [res.data, ...prev]);
      toast.success('Video task created');
      
      // Clear form
      setPrompt('');
      setScriptText('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshTask = async (taskId) => {
    setRefreshingTask(taskId);
    try {
      const res = await axios.get(`${API}/video-tasks/${taskId}`, { headers: authHeaders });
      setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
      
      if (res.data.status === 'READY') {
        toast.success('Video is ready!');
      } else if (res.data.status === 'FAILED') {
        toast.error('Video generation failed');
      }
    } catch (err) {
      toast.error('Failed to refresh status');
    } finally {
      setRefreshingTask(null);
    }
  };

  const handleSaveAsAsset = async (taskId) => {
    try {
      const res = await axios.post(`${API}/video-tasks/${taskId}/save-asset`, {}, { headers: authHeaders });
      toast.success('Video saved as asset');
      // Refresh assets
      const assetsRes = await axios.get(`${API}/assets/library`, { headers: authHeaders });
      setAssets(assetsRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save asset');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const providerConfig = VIDEO_PROVIDERS.find(p => p.value === provider);
  const modeConfig = MODES.find(m => m.value === mode);
  const audioAssets = assets.filter(a => a.type === 'Audio');
  const videoAssets = assets.filter(a => a.type === 'Video');

  return (
    <div data-testid="video-lab-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            AI Video Lab
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Generate videos from scripts, audio, or existing clips using your preferred model.</p>
        </div>
        <Badge variant="outline" className={`text-xs px-2 py-1 ${providerConfig?.color}`}>
          <Video className="h-3 w-3 mr-1" />
          {providerConfig?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Generation Form */}
        <div className="lg:col-span-5 space-y-4">
          {/* Provider & Mode Selection */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-zinc-400" />
                Video Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider */}
              <div className="space-y-2">
                <AuraTooltip content={tooltipContent.videoLab.videoProvider} position="top">
                  <Label className="text-xs font-medium text-zinc-400">Provider</Label>
                </AuraTooltip>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger data-testid="provider-select" className="h-9 bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    {VIDEO_PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-zinc-300">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mode Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map(m => {
                    const ModeIcon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMode(m.value)}
                        className={`p-3 rounded-md border text-center transition-colors ${
                          mode === m.value
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-zinc-950/50 border-[#1F2933] text-zinc-400 hover:border-zinc-600'
                        }`}
                        data-testid={`mode-${m.value}`}
                      >
                        <ModeIcon className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-[10px] font-medium">{m.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600">{modeConfig?.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Generation Form */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="generation-form">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Film className="h-4 w-4 text-zinc-400" />
                {modeConfig?.label || 'Generation'} Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt */}
              <div className="space-y-2">
                <AuraTooltip content={tooltipContent.videoLab.scriptInput} position="top">
                  <Label className="text-xs font-medium text-zinc-400">Prompt / Description</Label>
                </AuraTooltip>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to create..."
                  className="min-h-[80px] bg-zinc-950 border-zinc-800 text-white resize-none"
                  data-testid="input-prompt"
                />
              </div>

              {/* Mode-specific inputs */}
              {mode === 'script' && (
                <div className="space-y-2">
                  <AuraTooltip content={tooltipContent.videoLab.sceneBreakdown} position="top">
                    <Label className="text-xs font-medium text-zinc-400">Script Text (optional)</Label>
                  </AuraTooltip>
                  <Textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="Paste your script here for better context..."
                    className="min-h-[100px] bg-zinc-950 border-zinc-800 text-white resize-none"
                    data-testid="input-script"
                  />
                </div>
              )}

              {mode === 'audio' && (
                <div className="space-y-2">
                  <AuraTooltip content={tooltipContent.videoLab.generateVoiceover} position="top">
                    <Label className="text-xs font-medium text-zinc-400">Audio Asset</Label>
                  </AuraTooltip>
                  <Select value={selectedAudioAsset} onValueChange={setSelectedAudioAsset}>
                    <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white">
                      <SelectValue placeholder="Select audio file..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                      {audioAssets.length === 0 ? (
                        <SelectItem value="none" disabled className="text-zinc-500">No audio assets found</SelectItem>
                      ) : (
                        audioAssets.map(a => (
                          <SelectItem key={a.id} value={a.id} className="text-zinc-300">{a.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === 'remix' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Source Video</Label>
                  <Select value={selectedVideoAsset} onValueChange={setSelectedVideoAsset}>
                    <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white">
                      <SelectValue placeholder="Select video to remix..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                      {videoAssets.length === 0 ? (
                        <SelectItem value="none" disabled className="text-zinc-500">No video assets found</SelectItem>
                      ) : (
                        videoAssets.map(a => (
                          <SelectItem key={a.id} value={a.id} className="text-zinc-300">{a.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator className="bg-[#1F2933]" />

              {/* Output settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white" data-testid="aspect-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                      {ASPECT_RATIOS.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-zinc-300">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Output Profile</Label>
                  <Select value={outputProfile} onValueChange={setOutputProfile}>
                    <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white" data-testid="profile-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                      {OUTPUT_PROFILES.map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-zinc-300">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link to submission */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Link to Submission (optional)</Label>
                <Select value={selectedSubmission || "none"} onValueChange={(v) => setSelectedSubmission(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    <SelectItem value="none" className="text-zinc-500">None</SelectItem>
                    {submissions.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-zinc-300">{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreateTask}
                disabled={creating || !prompt}
                className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
                data-testid="create-task-btn"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Create Video Task
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Tasks List */}
        <div className="lg:col-span-7">
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="tasks-list">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Video className="h-4 w-4 text-zinc-400" />
                  Video Tasks
                </CardTitle>
                <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 rounded">
                  {tasks.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No video tasks yet.</p>
                  <p className="text-xs text-zinc-600 mt-1">Create your first video using the form.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1F2933] hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Provider</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Mode</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Profile</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Created</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map(task => {
                      const sc = statusCfg[task.status] || statusCfg.PENDING;
                      const StatusIcon = sc.icon;
                      const pc = VIDEO_PROVIDERS.find(p => p.value === task.provider);
                      
                      return (
                        <TableRow
                          key={task.id}
                          className="border-[#1F2933] hover:bg-white/[0.02]"
                          data-testid={`task-row-${task.id}`}
                        >
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pc?.color}`}>
                              {pc?.label || task.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-zinc-400 capitalize">{task.mode}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-zinc-500">{task.outputProfile?.replace('_', ' ')}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text}`}>
                              <StatusIcon className={`h-3 w-3 mr-1 ${task.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-zinc-500">{formatDate(task.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {task.status === 'PROCESSING' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRefreshTask(task.id)}
                                  disabled={refreshingTask === task.id}
                                  className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                                  data-testid={`refresh-${task.id}`}
                                >
                                  <RefreshCw className={`h-3 w-3 ${refreshingTask === task.id ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                              {task.status === 'READY' && task.videoUrl && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewVideo(task)}
                                    className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300"
                                    data-testid={`preview-${task.id}`}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveAsAsset(task.id)}
                                    className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                                    data-testid={`save-${task.id}`}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
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

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
        <DialogContent className="bg-[#0B1120] border-[#1F2933] sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="text-white">Video Preview</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={previewVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                  <p className="truncate max-w-md">{previewVideo.prompt}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewVideo.videoUrl, '_blank')}
                    className="border-zinc-800 text-zinc-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    onClick={() => {
                      handleSaveAsAsset(previewVideo.id);
                      setPreviewVideo(null);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save to Assets
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
