/**
 * Video Editor — CapCut-like editing interface.
 *
 * Features:
 *  - Project management (create / load / list in left sidebar)
 *  - Main clip timeline (drag-to-reorder via @dnd-kit/sortable)
 *  - B-roll track (picture-in-picture overlays with position + scale controls)
 *  - Per-clip preview with interactive scrubber + "Set In / Set Out" trim
 *  - Per-clip mute toggle (strips audio at stitch time)
 *  - Audio track with waveform visualization (wavesurfer.js)
 *  - Server-side FFmpeg stitch (Phase 1 trim/mute, Phase 2 concat, Phase 2B broll, Phase 3 audio)
 *  - AI metadata generation (title, description, hashtags, tags)
 *  - Export to Pipeline with optional schedule date
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Scissors, Upload, Play, Pause, Trash2, GripVertical, Loader2,
  Music, ImageIcon, Film, CheckCircle, AlertCircle, Plus, Download,
  RefreshCw, FolderOpen, X, Send, Copy, ChevronDown, ChevronUp,
  Volume2, VolumeX, SkipBack, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

function resolveUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/files/')) return `${BACKEND}${url}`;
  return url;
}

function fmtTime(s) {
  if (!s && s !== 0) return '--';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}

// ---------------------------------------------------------------------------
// Sortable clip card (main timeline)
// ---------------------------------------------------------------------------
function SortableClip({ clip, isSelected, onSelect, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const trimmed = clip.trimEnd != null;
  const dur = trimmed ? (clip.trimEnd - (clip.trimStart || 0)) : (clip.duration || null);

  return (
    <div ref={setNodeRef} style={style}
      className={`relative flex-shrink-0 w-36 rounded-lg border cursor-pointer select-none transition-colors ${
        isSelected ? 'border-violet-500/60 bg-violet-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
      }`}
      onClick={() => onSelect(clip.id)}>
      <div {...attributes} {...listeners}
        className="flex items-center justify-center h-6 text-zinc-700 hover:text-zinc-400 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="px-2 pb-2">
        <Film className="h-5 w-5 text-violet-400/60 mx-auto mb-1" />
        <p className="text-[10px] text-zinc-400 truncate text-center">{clip.name}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {clip.muted && <VolumeX className="h-2.5 w-2.5 text-red-400" title="Muted" />}
          {dur != null && (
            <span className={`text-[9px] ${trimmed ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {dur.toFixed(1)}s{trimmed ? ' (trimmed)' : ''}
            </span>
          )}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove(clip.id); }}
        className="absolute top-1 right-1 text-zinc-700 hover:text-red-400 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// B-roll clip card
// ---------------------------------------------------------------------------
function BrollCard({ clip, onUpdate, onRemove }) {
  return (
    <div className="flex-shrink-0 w-40 rounded-lg border border-pink-500/20 bg-pink-500/5 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-pink-300 truncate flex-1">{clip.name}</p>
        <button onClick={() => onRemove(clip.id)} className="text-zinc-700 hover:text-red-400 ml-1">
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-zinc-600 w-9">Offset</span>
        <Input type="number" min={0} step={0.5} value={clip.offsetSeconds ?? 0}
          onChange={e => onUpdate(clip.id, { offsetSeconds: parseFloat(e.target.value) || 0 })}
          className="h-5 flex-1 text-[9px] px-1 bg-zinc-950 border-zinc-800" />
        <span className="text-[9px] text-zinc-600">s</span>
      </div>
      <select value={clip.position || 'top-right'}
        onChange={e => onUpdate(clip.id, { position: e.target.value })}
        className="w-full text-[9px] bg-zinc-950 border border-zinc-800 rounded p-0.5 text-zinc-400">
        <option value="top-right">Top Right</option>
        <option value="top-left">Top Left</option>
        <option value="bottom-right">Bottom Right</option>
        <option value="bottom-left">Bottom Left</option>
        <option value="center">Center</option>
      </select>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-zinc-600 w-9">Scale</span>
        <input type="range" min={0.15} max={0.6} step={0.05} value={clip.scale ?? 0.35}
          onChange={e => onUpdate(clip.id, { scale: parseFloat(e.target.value) })}
          className="flex-1 accent-pink-500" />
        <span className="text-[9px] text-zinc-600">{Math.round((clip.scale ?? 0.35) * 100)}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function VideoEditorPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();

  // Projects
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectSidebarOpen, setProjectSidebarOpen] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  // Clips
  const [clips, setClips] = useState([]);
  const [brollClips, setBrollClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // Asset URLs
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailName, setThumbnailName] = useState('');

  // Video preview + scrubber
  const previewVideoRef = useRef(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Waveform (wavesurfer.js)
  const waveformRef = useRef(null);
  const wsRef = useRef(null);
  const [wsReady, setWsReady] = useState(false);
  const [wsPlaying, setWsPlaying] = useState(false);

  // Stitch
  const [stitching, setStitching] = useState(false);
  const [stitchedUrl, setStitchedUrl] = useState('');
  const [stitchError, setStitchError] = useState('');
  const stitchPollRef = useRef(null);

  // Metadata
  const [metadata, setMetadata] = useState(null);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  // Export
  const [exportTitle, setExportTitle] = useState('');
  const [exportDate, setExportDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportedId, setExportedId] = useState('');

  // Upload refs
  const clipInputRef = useRef(null);
  const brollInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const [uploading, setUploading] = useState({ clip: false, broll: false, audio: false, thumb: false });

  const selectedClip = clips.find(c => c.id === selectedClipId) || null;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---------------------------------------------------------------------------
  // Load projects
  // ---------------------------------------------------------------------------
  const loadProjects = useCallback(async () => {
    if (!authHeaders) return;
    try {
      const res = await axios.get(`${API}/video-editor/projects`, { headers: authHeaders });
      setProjects(res.data || []);
    } catch { /* silent */ }
  }, [authHeaders]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // ---------------------------------------------------------------------------
  // Persist project to MongoDB
  // ---------------------------------------------------------------------------
  const persistProject = useCallback(async (updates) => {
    if (!activeProjectId || !authHeaders) return;
    try {
      await axios.patch(`${API}/video-editor/projects/${activeProjectId}`, updates, { headers: authHeaders });
    } catch (e) {
      console.warn('Project persist failed:', e);
    }
  }, [activeProjectId, authHeaders]);

  // ---------------------------------------------------------------------------
  // Load a specific project into editor state
  // ---------------------------------------------------------------------------
  const openProject = useCallback(async (project) => {
    clearInterval(stitchPollRef.current);
    setActiveProjectId(project.id);
    setProjectTitle(project.title || '');
    setClips(project.clips || []);
    setBrollClips(project.brollClips || []);
    setAudioUrl(project.audioUrl || '');
    setAudioName(project.audioUrl ? 'audio track' : '');
    setThumbnailUrl(project.thumbnailUrl || '');
    setThumbnailName(project.thumbnailUrl ? 'thumbnail' : '');
    setSelectedClipId(null);
    setStitchedUrl(project.stitchedVideoUrl || '');
    setStitchError(project.stitchError || '');
    setStitching(project.stitchStatus === 'stitching');
    setMetadata(null);
    setMetaOpen(false);
    setExportedId('');
    setExportTitle(project.title || '');

    if (project.stitchStatus === 'stitching') {
      startStitchPoll(project.id);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Create new project
  // ---------------------------------------------------------------------------
  const handleCreateProject = async () => {
    const title = newProjectTitle.trim() || 'Untitled Project';
    setCreatingProject(true);
    try {
      const res = await axios.post(`${API}/video-editor/projects`, { title }, { headers: authHeaders });
      await loadProjects();
      openProject(res.data);
      setNewProjectTitle('');
    } catch { toast.error('Failed to create project'); }
    finally { setCreatingProject(false); }
  };

  // ---------------------------------------------------------------------------
  // Waveform — init / destroy when audioUrl changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!waveformRef.current) return;
    wsRef.current?.destroy();
    wsRef.current = null;
    setWsReady(false);
    setWsPlaying(false);
    if (!audioUrl) return;

    let ws;
    import('wavesurfer.js').then(mod => {
      const WaveSurfer = mod.default;
      ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#6366f1',
        progressColor: '#8b5cf6',
        cursorColor: '#a78bfa',
        barWidth: 2,
        barRadius: 2,
        height: 48,
        normalize: true,
      });
      ws.load(resolveUrl(audioUrl));
      ws.on('ready', () => setWsReady(true));
      ws.on('play', () => setWsPlaying(true));
      ws.on('pause', () => setWsPlaying(false));
      ws.on('finish', () => setWsPlaying(false));
      wsRef.current = ws;
    }).catch(e => console.warn('WaveSurfer load failed:', e));

    return () => { ws?.destroy(); };
  }, [audioUrl]);

  // ---------------------------------------------------------------------------
  // Preview scrubber — sync to selected clip
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setPreviewTime(0);
    setPreviewDuration(0);
    setPreviewPlaying(false);
  }, [selectedClipId]);

  const handleVideoLoaded = (e) => {
    setPreviewDuration(e.target.duration);
    const start = selectedClip?.trimStart || 0;
    if (start > 0) e.target.currentTime = start;
  };

  const handleTimeUpdate = (e) => {
    const t = e.target.currentTime;
    setPreviewTime(t);
    const trimEnd = selectedClip?.trimEnd;
    if (trimEnd != null && t >= trimEnd) {
      e.target.pause();
      e.target.currentTime = selectedClip?.trimStart || 0;
      setPreviewPlaying(false);
    }
  };

  const togglePreviewPlay = () => {
    const v = previewVideoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPreviewPlaying(true); }
    else { v.pause(); setPreviewPlaying(false); }
  };

  const seekTo = (seconds) => {
    if (previewVideoRef.current) previewVideoRef.current.currentTime = seconds;
  };

  // ---------------------------------------------------------------------------
  // Clip CRUD + DnD
  // ---------------------------------------------------------------------------
  const updateClip = async (clipId, updates) => {
    const updated = clips.map(c => c.id === clipId ? { ...c, ...updates } : c);
    setClips(updated);
    await persistProject({ clips: updated });
  };

  const removeClip = async (clipId) => {
    const updated = clips.filter(c => c.id !== clipId);
    setClips(updated);
    if (selectedClipId === clipId) setSelectedClipId(null);
    await persistProject({ clips: updated });
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = clips.findIndex(c => c.id === active.id);
    const newIdx = clips.findIndex(c => c.id === over.id);
    const reordered = arrayMove(clips, oldIdx, newIdx).map((c, i) => ({ ...c, order: i }));
    setClips(reordered);
    await persistProject({ clips: reordered });
  };

  // B-roll CRUD
  const updateBroll = async (brId, updates) => {
    const updated = brollClips.map(c => c.id === brId ? { ...c, ...updates } : c);
    setBrollClips(updated);
    await persistProject({ brollClips: updated });
  };

  const removeBroll = async (brId) => {
    const updated = brollClips.filter(c => c.id !== brId);
    setBrollClips(updated);
    await persistProject({ brollClips: updated });
  };

  // ---------------------------------------------------------------------------
  // Upload handlers
  // ---------------------------------------------------------------------------
  const handleClipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(u => ({ ...u, clip: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/video-editor/upload/clip`, form,
        { headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } });
      const newClip = {
        id: res.data.id,
        name: res.data.name,
        url: res.data.url,
        order: clips.length,
        duration: res.data.duration || null,
        trimStart: null,
        trimEnd: null,
        muted: false,
      };
      const updated = [...clips, newClip];
      setClips(updated);
      setSelectedClipId(newClip.id);
      await persistProject({ clips: updated });
      toast.success(`Clip uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Clip upload failed');
    } finally { setUploading(u => ({ ...u, clip: false })); }
  };

  const handleBrollUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(u => ({ ...u, broll: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/video-editor/upload/broll`, form,
        { headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } });
      const newBroll = {
        id: res.data.id,
        name: res.data.name,
        url: res.data.url,
        order: brollClips.length,
        duration: res.data.duration || null,
        offsetSeconds: 0,
        position: 'top-right',
        scale: 0.35,
      };
      const updated = [...brollClips, newBroll];
      setBrollClips(updated);
      await persistProject({ brollClips: updated });
      toast.success(`B-roll uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'B-roll upload failed');
    } finally { setUploading(u => ({ ...u, broll: false })); }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(u => ({ ...u, audio: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/video-editor/upload/audio`, form,
        { headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } });
      setAudioUrl(res.data.url);
      setAudioName(file.name);
      await persistProject({ audioUrl: res.data.url });
      toast.success(`Audio uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Audio upload failed');
    } finally { setUploading(u => ({ ...u, audio: false })); }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(u => ({ ...u, thumb: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/video-editor/upload/thumbnail`, form,
        { headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } });
      setThumbnailUrl(res.data.url);
      setThumbnailName(file.name);
      await persistProject({ thumbnailUrl: res.data.url });
      toast.success(`Thumbnail uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Thumbnail upload failed');
    } finally { setUploading(u => ({ ...u, thumb: false })); }
  };

  // ---------------------------------------------------------------------------
  // Stitch
  // ---------------------------------------------------------------------------
  const startStitchPoll = (projectId) => {
    clearInterval(stitchPollRef.current);
    stitchPollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/video-editor/projects/${projectId}`, { headers: authHeaders });
        const p = res.data;
        if (p.stitchStatus === 'ready') {
          clearInterval(stitchPollRef.current);
          setStitching(false);
          setStitchedUrl(p.stitchedVideoUrl || '');
          setStitchError('');
          toast.success('Stitch complete! Your video is ready.');
        } else if (p.stitchStatus === 'failed') {
          clearInterval(stitchPollRef.current);
          setStitching(false);
          setStitchError(p.stitchError || 'Stitch failed');
          toast.error(`Stitch failed: ${p.stitchError || 'Unknown error'}`);
        }
      } catch { /* silent poll */ }
    }, 4000);
  };

  const handleStitch = async () => {
    if (!activeProjectId || clips.length === 0) return;
    setStitching(true);
    setStitchedUrl('');
    setStitchError('');
    setMetadata(null);
    setExportedId('');
    try {
      await axios.post(`${API}/video-editor/projects/${activeProjectId}/stitch`, {}, { headers: authHeaders });
      startStitchPoll(activeProjectId);
      toast.info('Stitching started — FFmpeg processing your clips…');
    } catch (err) {
      setStitching(false);
      toast.error(err.response?.data?.detail || 'Stitch failed to start');
    }
  };

  // ---------------------------------------------------------------------------
  // Metadata generation
  // ---------------------------------------------------------------------------
  const handleGenerateMetadata = async () => {
    if (!activeProjectId) return;
    setGeneratingMeta(true);
    try {
      const res = await axios.post(
        `${API}/video-editor/projects/${activeProjectId}/generate-metadata`,
        {}, { headers: authHeaders }
      );
      setMetadata(res.data);
      setMetaOpen(true);
      if (res.data.title && !exportTitle) setExportTitle(res.data.title);
      toast.success('Metadata generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Metadata generation failed');
    } finally { setGeneratingMeta(false); }
  };

  // ---------------------------------------------------------------------------
  // Pipeline export
  // ---------------------------------------------------------------------------
  const handleExport = async () => {
    if (!activeProjectId || !stitchedUrl) return;
    setExporting(true);
    try {
      const res = await axios.post(
        `${API}/video-editor/projects/${activeProjectId}/export-to-pipeline`,
        {
          title: exportTitle || projectTitle,
          description: metadata?.description || '',
          releaseDate: exportDate || undefined,
        },
        { headers: authHeaders }
      );
      setExportedId(res.data.id);
      toast.success('Sent to Pipeline!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Export failed');
    } finally { setExporting(false); }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  // Cleanup on unmount
  useEffect(() => () => { clearInterval(stitchPollRef.current); wsRef.current?.destroy(); }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full bg-[#070D15] text-white overflow-hidden" data-testid="video-editor-page">

      {/* ── Projects Sidebar ──────────────────────────────────────────────── */}
      {projectSidebarOpen && (
        <div className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-violet-400" /> Projects
            </span>
            <button onClick={() => setProjectSidebarOpen(false)} className="text-zinc-600 hover:text-zinc-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* New project */}
          <div className="p-2 border-b border-zinc-800/50 space-y-1.5">
            <Input
              placeholder="Project name…"
              value={newProjectTitle}
              onChange={e => setNewProjectTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
              className="h-7 text-xs bg-zinc-950 border-zinc-800"
            />
            <Button onClick={handleCreateProject} disabled={creatingProject} size="sm"
              className="w-full h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white">
              {creatingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
              New Project
            </Button>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto py-1">
            {projects.map(p => (
              <button key={p.id} onClick={() => openProject(p)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  p.id === activeProjectId ? 'bg-violet-500/10 text-violet-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}>
                <p className="truncate font-medium">{p.title || 'Untitled'}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {(p.clips?.length || 0)} clip{(p.clips?.length || 0) !== 1 ? 's' : ''}
                  {p.stitchStatus === 'ready' ? ' · Ready' : p.stitchStatus === 'stitching' ? ' · Stitching…' : ''}
                </p>
              </button>
            ))}
            {projects.length === 0 && (
              <p className="text-[10px] text-zinc-700 px-3 py-4">No projects yet. Create one above.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Main Editor Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="h-12 border-b border-zinc-800 flex items-center gap-3 px-4 shrink-0">
          {!projectSidebarOpen && (
            <button onClick={() => setProjectSidebarOpen(true)} className="text-zinc-600 hover:text-zinc-300 mr-1">
              <FolderOpen className="h-4 w-4" />
            </button>
          )}
          {activeProjectId ? (
            <Input
              value={projectTitle}
              onChange={async e => {
                setProjectTitle(e.target.value);
                await persistProject({ title: e.target.value });
              }}
              className="h-7 max-w-[180px] text-sm font-medium bg-transparent border-transparent hover:border-zinc-700 focus:border-violet-500"
            />
          ) : (
            <span className="text-sm text-zinc-500">Select or create a project</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {activeProjectId && (
              <>
                <Button onClick={handleStitch} disabled={stitching || clips.length === 0}
                  className="h-8 px-4 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                  {stitching ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Stitching…</> : <><Scissors className="h-3 w-3 mr-1.5" /> Stitch Video</>}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        {!activeProjectId ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-3">
              <Scissors className="h-12 w-12 text-zinc-800 mx-auto" />
              <p className="text-zinc-500 text-sm">Select a project from the sidebar, or create a new one to start editing.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">

            {/* ── Preview + Controls (center) ───────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800">

              {/* Video preview */}
              <div className="flex-1 bg-black relative flex items-center justify-center min-h-0 overflow-hidden">
                {selectedClip ? (
                  <video
                    ref={previewVideoRef}
                    key={selectedClip.url}
                    src={resolveUrl(selectedClip.url)}
                    onLoadedMetadata={handleVideoLoaded}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setPreviewPlaying(true)}
                    onPause={() => setPreviewPlaying(false)}
                    className="max-h-full max-w-full rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-700">
                    <Film className="h-14 w-14" />
                    <p className="text-xs">Select a clip to preview</p>
                  </div>
                )}
              </div>

              {/* Scrubber + trim controls */}
              {selectedClip && (
                <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 p-3 space-y-2">
                  {/* Playback controls */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => seekTo(selectedClip.trimStart || 0)}
                      className="text-zinc-500 hover:text-zinc-300" title="Go to trim start">
                      <SkipBack className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={togglePreviewPlay}
                      className="h-7 w-7 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center">
                      {previewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {fmtTime(previewTime)} / {fmtTime(previewDuration)}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-[9px] text-zinc-600">Trim:</span>
                      <span className="text-[9px] text-emerald-400">
                        {fmtTime(selectedClip.trimStart || 0)} → {fmtTime(selectedClip.trimEnd ?? previewDuration)}
                      </span>
                    </div>
                  </div>

                  {/* Timeline scrubber */}
                  <div className="relative">
                    <input
                      type="range" min={0} max={previewDuration || 100} step={0.05}
                      value={previewTime}
                      onChange={e => seekTo(parseFloat(e.target.value))}
                      className="w-full accent-violet-500 h-1.5"
                    />
                    {/* Trim region highlight */}
                    {previewDuration > 0 && (
                      <div className="absolute top-0 h-1.5 bg-emerald-500/30 rounded pointer-events-none"
                        style={{
                          left: `${((selectedClip.trimStart || 0) / previewDuration) * 100}%`,
                          right: `${(1 - ((selectedClip.trimEnd ?? previewDuration) / previewDuration)) * 100}%`,
                        }} />
                    )}
                  </div>

                  {/* Set In / Set Out */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => updateClip(selectedClip.id, { trimStart: parseFloat(previewTime.toFixed(2)) })}
                      className="h-6 text-[10px] px-2.5 bg-zinc-900 border border-zinc-800 text-emerald-400 hover:border-emerald-500/40">
                      Set In [{fmtTime(selectedClip.trimStart || 0)}]
                    </Button>
                    <Button size="sm" onClick={() => updateClip(selectedClip.id, { trimEnd: parseFloat(previewTime.toFixed(2)) })}
                      className="h-6 text-[10px] px-2.5 bg-zinc-900 border border-zinc-800 text-red-400 hover:border-red-500/40">
                      Set Out [{fmtTime(selectedClip.trimEnd ?? previewDuration)}]
                    </Button>
                    <Button size="sm" onClick={() => updateClip(selectedClip.id, { trimStart: 0, trimEnd: null })}
                      className="h-6 text-[10px] px-2 bg-zinc-900 border border-zinc-800 text-zinc-500">
                      Reset
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <Label className="text-[10px] text-zinc-500">Mute clip audio</Label>
                      <button
                        onClick={() => updateClip(selectedClip.id, { muted: !selectedClip.muted })}
                        className={`relative h-5 w-9 rounded-full transition-colors ${selectedClip.muted ? 'bg-red-500' : 'bg-zinc-700'}`}
                        title={selectedClip.muted ? 'Unmute' : 'Mute this clip\'s audio'}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${selectedClip.muted ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      {selectedClip.muted && <VolumeX className="h-3.5 w-3.5 text-red-400" />}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Timeline tracks ──────────────────────────────────────── */}
              <div className="shrink-0 border-t border-zinc-800 p-3 space-y-3 bg-[#0A1219]">

                {/* Main clips track */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <Film className="h-3 w-3 text-violet-400" /> Main Clips
                    </Label>
                    <Button size="sm" onClick={() => clipInputRef.current?.click()} disabled={uploading.clip}
                      className="h-5 text-[10px] px-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">
                      {uploading.clip ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5 mr-1" />}
                      Add Clip
                    </Button>
                    <input ref={clipInputRef} type="file" accept="video/*" hidden onChange={handleClipUpload} />
                  </div>

                  {clips.length === 0 ? (
                    <p className="text-[10px] text-zinc-700 py-2">Upload clips to start editing</p>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={clips.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {clips.map(clip => (
                            <SortableClip key={clip.id} clip={clip}
                              isSelected={clip.id === selectedClipId}
                              onSelect={setSelectedClipId}
                              onRemove={removeClip} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {/* B-roll track */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <Film className="h-3 w-3 text-pink-400" /> B-Roll (PiP Overlay)
                    </Label>
                    <Button size="sm" onClick={() => brollInputRef.current?.click()} disabled={uploading.broll}
                      className="h-5 text-[10px] px-2 bg-zinc-900 border border-pink-800/30 text-pink-400/70 hover:text-pink-300">
                      {uploading.broll ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5 mr-1" />}
                      Add B-Roll
                    </Button>
                    <input ref={brollInputRef} type="file" accept="video/*" hidden onChange={handleBrollUpload} />
                  </div>

                  {brollClips.length === 0 ? (
                    <p className="text-[10px] text-zinc-700">Upload a b-roll clip to overlay on the main video (picture-in-picture)</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {brollClips.map(br => (
                        <BrollCard key={br.id} clip={br} onUpdate={updateBroll} onRemove={removeBroll} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Panel ──────────────────────────────────────────────── */}
            <div className="w-64 shrink-0 flex flex-col overflow-y-auto">

              {/* Audio track */}
              <div className="p-3 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Music className="h-3 w-3 text-violet-400" /> Audio Track
                  </Label>
                  <Button size="sm" onClick={() => audioInputRef.current?.click()} disabled={uploading.audio}
                    className="h-5 text-[10px] px-2 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white">
                    {uploading.audio ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />}
                  </Button>
                  <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleAudioUpload} />
                </div>

                {audioUrl ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-400 truncate">{audioName}</p>
                    {/* Waveform container */}
                    <div ref={waveformRef} className="rounded overflow-hidden bg-zinc-950 border border-zinc-800" />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => wsRef.current?.playPause()} disabled={!wsReady}
                        className="flex-1 h-6 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">
                        {wsPlaying ? '⏸ Pause' : '▶ Play'}
                      </Button>
                      <Button size="sm" onClick={async () => { setAudioUrl(''); setAudioName(''); wsRef.current?.destroy(); await persistProject({ audioUrl: '' }); }}
                        className="h-6 px-2 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-zinc-700">Audio track replaces all clip audio in the stitched output.</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-700">Upload an audio track (MP3/WAV). It will replace clip audio in the final video.</p>
                )}
              </div>

              {/* Thumbnail */}
              <div className="p-3 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-violet-400" /> Thumbnail
                  </Label>
                  <Button size="sm" onClick={() => thumbnailInputRef.current?.click()} disabled={uploading.thumb}
                    className="h-5 text-[10px] px-2 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white">
                    {uploading.thumb ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />}
                  </Button>
                  <input ref={thumbnailInputRef} type="file" accept="image/*" hidden onChange={handleThumbnailUpload} />
                </div>
                {thumbnailUrl ? (
                  <div className="space-y-1.5">
                    <img src={resolveUrl(thumbnailUrl)} alt="Thumbnail"
                      className="w-full rounded border border-zinc-800 object-cover aspect-video" />
                    <Button size="sm" onClick={async () => { setThumbnailUrl(''); setThumbnailName(''); await persistProject({ thumbnailUrl: '' }); }}
                      className="w-full h-6 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-700">Upload a thumbnail image for your video.</p>
                )}
              </div>

              {/* Stitch result */}
              {stitchedUrl && (
                <div className="p-3 border-b border-zinc-800 space-y-2">
                  <Label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-400" /> Stitched Video
                  </Label>
                  <video src={resolveUrl(stitchedUrl)} controls className="w-full rounded border border-zinc-800" />
                  <a href={resolveUrl(stitchedUrl)} download
                    className="flex items-center justify-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 bg-zinc-950 border border-zinc-800 rounded h-7">
                    <Download className="h-3 w-3" /> Download MP4
                  </a>
                </div>
              )}

              {stitchError && (
                <div className="p-3 border-b border-zinc-800">
                  <p className="text-[10px] text-red-400 flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /> Stitch failed: {stitchError}
                  </p>
                </div>
              )}

              {/* Metadata generation */}
              {stitchedUrl && (
                <div className="p-3 border-b border-zinc-800 space-y-2">
                  <button onClick={() => setMetaOpen(v => !v)}
                    className="flex items-center justify-between w-full text-[10px] text-zinc-500 uppercase tracking-wider hover:text-zinc-300">
                    <span className="flex items-center gap-1"><Settings2 className="h-3 w-3" /> Metadata</span>
                    {metaOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  <Button onClick={handleGenerateMetadata} disabled={generatingMeta}
                    className="w-full h-7 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-violet-500/40">
                    {generatingMeta ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating…</> : '✦ Generate Metadata (AI)'}
                  </Button>

                  {metaOpen && metadata && (
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-zinc-600 uppercase">Title</Label>
                        <div className="flex gap-1">
                          <Input value={metadata.title} onChange={e => setMetadata(m => ({ ...m, title: e.target.value }))}
                            className="h-6 text-[10px] flex-1 bg-zinc-950 border-zinc-800" />
                          <button onClick={() => copyToClipboard(metadata.title, 'Title')} className="text-zinc-600 hover:text-violet-400">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-[9px] text-zinc-600 uppercase">Description</Label>
                          <button onClick={() => copyToClipboard(metadata.description, 'Description')} className="text-zinc-600 hover:text-violet-400">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <Textarea value={metadata.description} onChange={e => setMetadata(m => ({ ...m, description: e.target.value }))}
                          rows={4} className="text-[10px] bg-zinc-950 border-zinc-800 resize-none" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-[9px] text-zinc-600 uppercase">Hashtags</Label>
                          <button onClick={() => copyToClipboard(metadata.hashtags.map(h => `#${h}`).join(' '), 'Hashtags')} className="text-zinc-600 hover:text-violet-400">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {metadata.hashtags.map((h, i) => (
                            <span key={i} className="text-[9px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded">#{h}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-[9px] text-zinc-600 uppercase">Tags</Label>
                          <button onClick={() => copyToClipboard(metadata.tags.join(', '), 'Tags')} className="text-zinc-600 hover:text-violet-400">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[9px] text-zinc-500 break-words">{metadata.tags.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Export to Pipeline */}
              {stitchedUrl && (
                <div className="p-3 space-y-2">
                  <Label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Send className="h-3 w-3 text-violet-400" /> Publish / Schedule
                  </Label>
                  <Input placeholder="Title"
                    value={exportTitle}
                    onChange={e => setExportTitle(e.target.value)}
                    className="h-7 text-xs bg-zinc-950 border-zinc-800" />
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-zinc-600">Schedule Date (optional)</Label>
                    <Input type="date" value={exportDate} onChange={e => setExportDate(e.target.value)}
                      className="h-7 text-xs bg-zinc-950 border-zinc-800" />
                  </div>
                  <Button onClick={handleExport} disabled={exporting || !!exportedId}
                    className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                    {exporting ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Exporting…</>
                      : exportedId ? <><CheckCircle className="h-3 w-3 mr-1.5 text-emerald-400" /> Sent to Pipeline!</>
                        : <><Send className="h-3 w-3 mr-1.5" /> Send to Pipeline</>}
                  </Button>
                  {exportedId && (
                    <button onClick={() => navigate('/dashboard/submissions')}
                      className="text-[10px] text-violet-400 hover:underline w-full text-center">
                      View in Pipeline →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
