/**
 * Podcast Studio — End-to-end raw podcast → polished episode → viral clips → publish.
 *
 * 5-step wizard:
 *  Step 1: Upload raw podcast file
 *  Step 2: Processing (transcribe → enhance → silence detect → smart cuts)
 *  Step 3: Polish (review cuts, render polished episode)
 *  Step 4: Clip (AI highlight detection → generated clips grid)
 *  Step 5: Publish (batch publish approved clips)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mic, Upload, Play, Pause, Trash2, Loader2, CheckCircle, AlertCircle,
  Scissors, Wand2, Send, ThumbsUp, ThumbsDown, RotateCcw, Download,
  Clock, Zap, Eye, ChevronRight, ChevronLeft, Volume2, FileVideo,
  X, Check, RefreshCw, Sparkles, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function fmtDuration(s) {
  if (!s || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDurationLong(s) {
  if (!s || s <= 0) return '0m 0s';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

// ─────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────

const STEPS = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'process', label: 'Process', icon: Wand2 },
  { key: 'polish', label: 'Polish', icon: Scissors },
  { key: 'clip', label: 'Clips', icon: Zap },
  { key: 'publish', label: 'Publish', icon: Send },
];

function StepIndicator({ currentStep }) {
  const idx = STEPS.findIndex(s => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === idx;
        const isDone = i < idx;
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' :
              isDone ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-zinc-800/50 text-zinc-500'
            }`}>
              {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className={`h-3.5 w-3.5 mx-1 ${isDone ? 'text-emerald-500/50' : 'text-zinc-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// STEP 1: UPLOAD
// ─────────────────────────────────────────

function UploadStep({ onUploadComplete, authHeaders }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/podcast-studio/upload`, form, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success('Podcast uploaded successfully');
      onUploadComplete(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [authHeaders, onUploadComplete]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5 text-indigo-400" />
          Upload Raw Podcast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragOver ? 'border-indigo-400 bg-indigo-500/5' :
            uploading ? 'border-zinc-700 bg-zinc-800/50' :
            'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
          }`}
        >
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mx-auto" />
              <p className="text-sm text-zinc-400">Uploading... {progress}%</p>
              <Progress value={progress} className="max-w-xs mx-auto" />
            </div>
          ) : (
            <div className="space-y-3">
              <FileVideo className="h-12 w-12 text-zinc-500 mx-auto" />
              <p className="text-zinc-300 font-medium">Drop your raw podcast here</p>
              <p className="text-xs text-zinc-500">MP4, MOV, WebM, MP3, WAV — up to 2GB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// STEP 2: PROCESSING
// ─────────────────────────────────────────

const PROCESS_STEPS = [
  { key: 'analyzing', label: 'Analyzing source', icon: Eye },
  { key: 'transcribing', label: 'Transcribing with Whisper', icon: Mic },
  { key: 'enhancing', label: 'Enhancing audio & video', icon: Wand2 },
  { key: 'detecting_silences', label: 'Detecting silences', icon: Volume2 },
  { key: 'smart_cuts', label: 'AI analyzing cuts', icon: Scissors },
  { key: 'cuts_ready', label: 'Ready for review', icon: CheckCircle },
];

function ProcessingStep({ job, onComplete }) {
  const stepIdx = PROCESS_STEPS.findIndex(s => s.key === job?.step);
  const progressPct = job?.step === 'cuts_ready' ? 100 : Math.max(10, ((stepIdx + 1) / PROCESS_STEPS.length) * 100);

  useEffect(() => {
    if (job?.status === 'cuts_ready') onComplete?.();
  }, [job?.status, onComplete]);

  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-indigo-400" />
          Processing Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progressPct} className="h-2" />

        <div className="space-y-3">
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = i < stepIdx || job?.step === 'cuts_ready';
            const isActive = i === stepIdx && job?.step !== 'cuts_ready';
            const isPending = i > stepIdx && job?.step !== 'cuts_ready';

            return (
              <div key={step.key} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                isActive ? 'bg-indigo-500/10 ring-1 ring-indigo-500/20' :
                isDone ? 'bg-emerald-500/5' : 'opacity-40'
              }`}>
                {isDone ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
                )}
                <span className={`text-sm ${isDone ? 'text-emerald-300' : isActive ? 'text-indigo-300' : 'text-zinc-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {job?.status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-300">{job.error || 'Processing failed'}</span>
          </div>
        )}

        {job?.sourceDuration > 0 && (
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>Duration: {fmtDurationLong(job.sourceDuration)}</span>
            {job.sourceWidth > 0 && <span>Resolution: {job.sourceWidth}x{job.sourceHeight}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// STEP 3: POLISH (Review cuts)
// ─────────────────────────────────────────

function PolishStep({ job, authHeaders, onRenderComplete, onRefresh }) {
  const [rendering, setRendering] = useState(false);
  const cuts = job?.cuts || [];
  const cutCount = cuts.filter(c => c.action === 'cut').length;
  const keepCount = cuts.filter(c => c.action === 'keep').length;
  const timeSaved = cuts.filter(c => c.action === 'cut').reduce((s, c) => s + (c.duration || 0), 0);

  const toggleCut = async (index) => {
    const updated = [...cuts];
    updated[index] = {
      ...updated[index],
      action: updated[index].action === 'cut' ? 'keep' : 'cut',
    };
    try {
      await axios.patch(`${API}/podcast-studio/jobs/${job.id}/cuts`,
        { cuts: updated },
        { headers: authHeaders }
      );
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to update cuts');
    }
  };

  const handleRender = async () => {
    setRendering(true);
    try {
      await axios.post(`${API}/podcast-studio/jobs/${job.id}/render`, {}, { headers: authHeaders });
      toast.success('Rendering started');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Render failed');
      setRendering(false);
    }
  };

  useEffect(() => {
    if (job?.status === 'polished') {
      setRendering(false);
      onRenderComplete?.();
    }
  }, [job?.status, onRenderComplete]);

  const isRendering = job?.status === 'rendering' || rendering;

  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scissors className="h-5 w-5 text-indigo-400" />
            Polish — Review Smart Cuts
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="text-red-400">{cutCount} cuts</span>
            <span className="text-emerald-400">{keepCount} kept</span>
            <span className="text-amber-400">{fmtDurationLong(timeSaved)} saved</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transcript summary */}
        {job?.transcript && (
          <div className="p-3 bg-zinc-800/50 rounded-lg max-h-32 overflow-y-auto">
            <p className="text-xs text-zinc-400 mb-1 font-medium">Transcript Preview</p>
            <p className="text-xs text-zinc-500 leading-relaxed">{job.transcript.slice(0, 500)}...</p>
          </div>
        )}

        {/* Cuts list */}
        <ScrollArea className="max-h-80">
          <div className="space-y-2">
            {cuts.map((cut, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  cut.action === 'cut'
                    ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15'
                    : 'bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10'
                }`}
                onClick={() => toggleCut(i)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  cut.action === 'cut' ? 'bg-red-500/20' : 'bg-emerald-500/20'
                }`}>
                  {cut.action === 'cut' ? (
                    <X className="h-3 w-3 text-red-400" />
                  ) : (
                    <Check className="h-3 w-3 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 font-mono">
                      {fmtDuration(cut.start)} — {fmtDuration(cut.end)}
                    </span>
                    <span className="text-zinc-600">({cut.duration?.toFixed(1)}s)</span>
                  </div>
                  {cut.reason && (
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{cut.reason}</p>
                  )}
                </div>
                <Badge variant="outline" className={`text-[9px] ${
                  cut.action === 'cut' ? 'text-red-400 border-red-500/30' : 'text-emerald-400 border-emerald-500/30'
                }`}>
                  {cut.action}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        {cuts.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">No cuts detected — podcast is clean!</p>
        )}

        {/* Render button */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleRender}
            disabled={isRendering}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500"
          >
            {isRendering ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Render Polished Episode
              </>
            )}
          </Button>
        </div>

        {job?.polishedUrl && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              Polished episode ready ({fmtDurationLong(job.polishedDuration)})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// STEP 4: CLIPS
// ─────────────────────────────────────────

function ClipCard({ clip, authHeaders, onUpdate }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const toggleApproval = async () => {
    try {
      await axios.patch(`${API}/podcast-studio/clips/${clip.id}`,
        { approved: !clip.approved },
        { headers: authHeaders }
      );
      onUpdate?.();
    } catch {
      toast.error('Failed to update clip');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/podcast-studio/clips/${clip.id}`, { headers: authHeaders });
      toast.success('Clip deleted');
      onUpdate?.();
    } catch {
      toast.error('Failed to delete clip');
    }
  };

  const handleRegenerate = async () => {
    try {
      await axios.post(`${API}/podcast-studio/clips/${clip.id}/regenerate`, {}, { headers: authHeaders });
      toast.success('Regenerating clip...');
      onUpdate?.();
    } catch {
      toast.error('Failed to regenerate');
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      clip.approved
        ? 'border-indigo-500/30 bg-zinc-900/80'
        : 'border-zinc-800 bg-zinc-900/40 opacity-60'
    }`}>
      {/* Video preview */}
      <div className="relative aspect-[9/16] max-h-64 bg-black cursor-pointer" onClick={togglePlay}>
        {clip.url ? (
          <video
            ref={videoRef}
            src={clip.url}
            className="w-full h-full object-contain"
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileVideo className="h-8 w-8 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          {playing ? (
            <Pause className="h-8 w-8 text-white" />
          ) : (
            <Play className="h-8 w-8 text-white" />
          )}
        </div>
        {/* Virality badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`text-[10px] ${
            clip.viralityScore >= 8 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
            clip.viralityScore >= 6 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
            'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'
          }`}>
            <Star className="h-2.5 w-2.5 mr-0.5" />
            {clip.viralityScore}/10
          </Badge>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="text-[10px] bg-black/60 text-white border-transparent">
            {fmtDuration(clip.duration)}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h4 className="text-sm font-medium text-zinc-200 line-clamp-2">{clip.title}</h4>
        {clip.hook && (
          <p className="text-xs text-zinc-500 line-clamp-2 italic">"{clip.hook}"</p>
        )}

        {/* Tags */}
        {clip.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clip.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] text-zinc-500 border-zinc-700">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={toggleApproval}>
            {clip.approved ? (
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <ThumbsDown className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRegenerate}>
            <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
          {clip.url && (
            <a href={clip.url} download className="ml-auto">
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Download className="h-3.5 w-3.5 text-zinc-400" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ClipsStep({ job, authHeaders, onClipsReady, onRefreshClips }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const fetchClips = useCallback(async () => {
    if (!job?.id) return;
    try {
      const res = await axios.get(`${API}/podcast-studio/jobs/${job.id}/clips`, { headers: authHeaders });
      setClips(res.data.clips || []);
    } catch { /* ignore */ }
  }, [job?.id, authHeaders]);

  useEffect(() => { fetchClips(); }, [fetchClips]);

  useEffect(() => {
    if (job?.status === 'clips_ready' && job?.clipCount > 0) {
      fetchClips();
      setExtracting(false);
      onClipsReady?.();
    }
  }, [job?.status, job?.clipCount, fetchClips, onClipsReady]);

  const startExtraction = async () => {
    setExtracting(true);
    try {
      await axios.post(`${API}/podcast-studio/jobs/${job.id}/extract-clips`, {}, { headers: authHeaders });
      toast.success('Clip extraction started');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Extraction failed');
      setExtracting(false);
    }
  };

  const isExtracting = extracting || ['extracting_clips', 'detecting_highlights', 'generating_clips'].includes(job?.status);
  const approvedCount = clips.filter(c => c.approved).length;

  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            AI Clip Extraction
          </CardTitle>
          {clips.length > 0 && (
            <span className="text-xs text-zinc-400">
              {approvedCount}/{clips.length} approved
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!clips.length && !isExtracting && (
          <div className="text-center py-8 space-y-4">
            <Sparkles className="h-10 w-10 text-amber-400/50 mx-auto" />
            <p className="text-sm text-zinc-400">
              AI will analyze your polished episode and extract the most viral moments as clips.
            </p>
            <Button onClick={startExtraction} className="bg-amber-600 hover:bg-amber-500">
              <Zap className="h-4 w-4 mr-2" />
              Extract Viral Clips
            </Button>
          </div>
        )}

        {isExtracting && !clips.length && (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
            <p className="text-sm text-zinc-400">
              {job?.step === 'detecting_highlights' ? 'AI scanning for viral moments...' :
               job?.step === 'generating_clips' ? 'Generating clips with captions...' :
               'Processing...'}
            </p>
          </div>
        )}

        {clips.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {clips.map(clip => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  authHeaders={authHeaders}
                  onUpdate={fetchClips}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchClips} className="w-full">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh Clips
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// STEP 5: PUBLISH
// ─────────────────────────────────────────

function PublishStep({ job, clips, authHeaders }) {
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [scheduleDays, setScheduleDays] = useState(7);

  const approvedClips = clips.filter(c => c.approved);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await axios.post(`${API}/podcast-studio/jobs/${job.id}/publish`,
        { platforms: ['youtube'], scheduleDays },
        { headers: authHeaders }
      );
      setResult(res.data);
      toast.success(`${res.data.published} clips queued for publishing!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-emerald-400" />
          Batch Publish
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-zinc-800/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Approved clips</span>
            <span className="text-sm text-indigo-400 font-medium">{approvedClips.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Platform</span>
            <Badge variant="outline" className="text-xs">YouTube Shorts</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Schedule across</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={30}
                value={scheduleDays}
                onChange={e => setScheduleDays(parseInt(e.target.value) || 7)}
                className="w-16 h-7 text-xs bg-zinc-900 border-zinc-700"
              />
              <span className="text-xs text-zinc-500">days</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePublish}
          disabled={publishing || approvedClips.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500"
        >
          {publishing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Publish {approvedClips.length} Clips to YouTube
            </>
          )}
        </Button>

        {result && (
          <div className="p-4 bg-emerald-500/10 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">
                {result.published} clips queued!
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Clips will be published over {result.scheduleDays} days. Check the Publishing Dashboard for status.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// JOB HISTORY SIDEBAR
// ─────────────────────────────────────────

function JobHistory({ jobs, activeJobId, onSelect, authHeaders, onRefresh }) {
  const handleDelete = async (e, jobId) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/podcast-studio/jobs/${jobId}`, { headers: authHeaders });
      toast.success('Job deleted');
      onRefresh?.();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const statusColors = {
    uploaded: 'text-zinc-400',
    processing: 'text-blue-400',
    transcribing: 'text-blue-400',
    enhancing: 'text-blue-400',
    cuts_ready: 'text-amber-400',
    rendering: 'text-indigo-400',
    polished: 'text-indigo-400',
    clips_ready: 'text-emerald-400',
    error: 'text-red-400',
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-1">History</h3>
      {jobs.map(job => (
        <div
          key={job.id}
          onClick={() => onSelect(job.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${
            job.id === activeJobId
              ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20'
              : 'text-zinc-400 hover:bg-zinc-800/50'
          }`}
        >
          <FileVideo className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">{job.sourceFilename || 'Untitled'}</span>
          <span className={`text-[10px] ${statusColors[job.status] || 'text-zinc-500'}`}>
            {job.status?.replace(/_/g, ' ')}
          </span>
          <button onClick={(e) => handleDelete(e, job.id)} className="opacity-0 group-hover:opacity-100">
            <Trash2 className="h-3 w-3 text-zinc-600 hover:text-red-400" />
          </button>
        </div>
      ))}
      {!jobs.length && (
        <p className="text-xs text-zinc-600 px-1">No podcasts yet</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function PodcastStudioPage() {
  const { authHeaders } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [clips, setClips] = useState([]);
  const pollRef = useRef(null);

  // Determine current step based on job status
  const getCurrentStep = () => {
    if (!job) return 'upload';
    const s = job.status;
    if (s === 'uploaded') return 'upload';
    if (['processing', 'analyzing', 'transcribing', 'enhancing', 'detecting_silences', 'smart_cuts'].includes(s)) return 'process';
    if (['cuts_ready', 'rendering'].includes(s)) return 'polish';
    if (['polished', 'extracting_clips', 'detecting_highlights', 'generating_clips', 'clips_ready'].includes(s)) return 'clip';
    if (job.publishStatus === 'queued') return 'publish';
    if (s === 'clips_ready' && clips.length > 0) return 'clip';
    return 'upload';
  };

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/podcast-studio/jobs`, { headers: authHeaders });
      setJobs(res.data.jobs || []);
    } catch { /* ignore */ }
  }, [authHeaders]);

  // Fetch active job details
  const fetchJob = useCallback(async () => {
    if (!activeJobId) return;
    try {
      const res = await axios.get(`${API}/podcast-studio/jobs/${activeJobId}`, { headers: authHeaders });
      setJob(res.data);
    } catch { /* ignore */ }
  }, [activeJobId, authHeaders]);

  // Fetch clips for active job
  const fetchClips = useCallback(async () => {
    if (!activeJobId) return;
    try {
      const res = await axios.get(`${API}/podcast-studio/jobs/${activeJobId}/clips`, { headers: authHeaders });
      setClips(res.data.clips || []);
    } catch { /* ignore */ }
  }, [activeJobId, authHeaders]);

  // Initial load
  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Poll job status when processing
  useEffect(() => {
    if (!activeJobId) return;
    fetchJob();
    fetchClips();

    const pollStatuses = [
      'processing', 'analyzing', 'transcribing', 'enhancing',
      'detecting_silences', 'smart_cuts', 'rendering',
      'extracting_clips', 'detecting_highlights', 'generating_clips',
    ];

    pollRef.current = setInterval(() => {
      fetchJob();
      if (job && ['clips_ready', 'polished'].includes(job.status)) {
        fetchClips();
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [activeJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle upload complete
  const handleUploadComplete = useCallback((data) => {
    setActiveJobId(data.jobId);
    fetchJobs();
    // Auto-start processing
    setTimeout(async () => {
      try {
        await axios.post(`${API}/podcast-studio/jobs/${data.jobId}/process`, {}, { headers: authHeaders });
      } catch (err) {
        toast.error('Failed to start processing');
      }
    }, 500);
  }, [authHeaders, fetchJobs]);

  const currentStep = getCurrentStep();

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar — Job History */}
      <div className="w-64 shrink-0">
        <Card className="bg-zinc-900/80 border-zinc-800 h-full">
          <CardContent className="p-4 space-y-4">
            <Button
              onClick={() => { setActiveJobId(null); setJob(null); setClips([]); }}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
              size="sm"
            >
              <Mic className="h-3.5 w-3.5 mr-2" />
              New Podcast
            </Button>
            <Separator className="bg-zinc-800" />
            <JobHistory
              jobs={jobs}
              activeJobId={activeJobId}
              onSelect={(id) => { setActiveJobId(id); setClips([]); }}
              authHeaders={authHeaders}
              onRefresh={fetchJobs}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        <StepIndicator currentStep={currentStep} />

        {/* Step 1: Upload */}
        {currentStep === 'upload' && !activeJobId && (
          <UploadStep onUploadComplete={handleUploadComplete} authHeaders={authHeaders} />
        )}

        {/* After upload, show "start processing" if needed */}
        {currentStep === 'upload' && activeJobId && job?.status === 'uploaded' && (
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-6 text-center space-y-3">
              <FileVideo className="h-10 w-10 text-zinc-500 mx-auto" />
              <p className="text-sm text-zinc-300">Podcast uploaded. Starting processing...</p>
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mx-auto" />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Processing */}
        {currentStep === 'process' && (
          <ProcessingStep job={job} onComplete={() => fetchJob()} />
        )}

        {/* Step 3: Polish */}
        {(currentStep === 'polish' || (job?.status === 'cuts_ready')) && (
          <PolishStep
            job={job}
            authHeaders={authHeaders}
            onRenderComplete={() => fetchJob()}
            onRefresh={fetchJob}
          />
        )}

        {/* Step 4: Clips */}
        {(currentStep === 'clip' || job?.status === 'polished' || job?.status === 'clips_ready') && job?.status !== 'cuts_ready' && (
          <ClipsStep
            job={job}
            authHeaders={authHeaders}
            onClipsReady={() => fetchClips()}
            onRefreshClips={fetchClips}
          />
        )}

        {/* Step 5: Publish */}
        {(currentStep === 'publish' || (clips.length > 0 && job?.status === 'clips_ready')) && clips.length > 0 && (
          <PublishStep
            job={job}
            clips={clips}
            authHeaders={authHeaders}
          />
        )}

        {/* Error state */}
        {job?.status === 'error' && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm text-red-300 font-medium">Pipeline Error</p>
                <p className="text-xs text-red-400/80">{job.error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto border-red-500/30 text-red-400"
                onClick={async () => {
                  try {
                    await axios.post(`${API}/podcast-studio/jobs/${job.id}/process`, {}, { headers: authHeaders });
                    toast.success('Retrying...');
                  } catch { toast.error('Retry failed'); }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
