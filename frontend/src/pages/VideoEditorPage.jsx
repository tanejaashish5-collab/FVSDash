/**
 * Video Editor — upload, arrange, and stitch clips into a finished video.
 *
 * Architecture:
 *  - All uploads go to the backend → S3 (or local fallback) for persistent storage
 *  - Projects (clip sequences + audio + thumbnail) are saved in MongoDB
 *  - Stitch runs server-side via FFmpeg (BackgroundTask), polled until ready
 *  - DnD reordering via @dnd-kit/sortable (already installed)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Scissors, Upload, Play, Trash2, GripVertical, Loader2,
  Music, ImageIcon, Film, CheckCircle, AlertCircle, Plus,
  Download, RefreshCw, FolderOpen, X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

/** Resolve a storage URL — relative /api/files/ paths need the backend origin prepended. */
function resolveUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/files/')) return `${BACKEND}${url}`;
  return url;
}

// ---------------------------------------------------------------------------
// Sortable clip card (used inside DnD context)
// ---------------------------------------------------------------------------
function SortableClip({ clip, isSelected, onSelect, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clip.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex-shrink-0 w-36 rounded-lg border cursor-pointer select-none transition-colors ${
        isSelected
          ? 'border-violet-500/60 bg-violet-500/10'
          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
      }`}
      onClick={() => onSelect(clip.id)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(clip.id); }}
        className="absolute top-1.5 right-1.5 text-zinc-700 hover:text-red-400 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Clip icon + name */}
      <div className="pt-7 pb-2 px-2 flex flex-col items-center gap-1.5">
        <div className="h-16 w-full rounded bg-zinc-900 flex items-center justify-center">
          <Film className="h-6 w-6 text-zinc-700" />
        </div>
        <p className="text-[10px] text-zinc-400 text-center truncate w-full px-1">{clip.name}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function VideoEditorPage() {
  const { authHeaders } = useAuth();

  // Projects
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [saving, setSaving] = useState(false);

  // Clips
  const [clips, setClips] = useState([]);           // local ordered state (mirrors project.clips)
  const [selectedClipId, setSelectedClipId] = useState(null);

  // Audio + Thumbnail
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailName, setThumbnailName] = useState('');

  // Upload states
  const [uploadingClip, setUploadingClip] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Stitch
  const [stitching, setStitching] = useState(false);
  const [stitchedUrl, setStitchedUrl] = useState('');
  const [stitchError, setStitchError] = useState('');
  const pollRef = useRef(null);

  // File input refs
  const clipInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedClip = clips.find(c => c.id === selectedClipId) || null;

  // ---------------------------------------------------------------------------
  // Load project list
  // ---------------------------------------------------------------------------
  const fetchProjects = useCallback(async () => {
    if (!authHeaders) return;
    setLoadingProjects(true);
    try {
      const res = await axios.get(`${API}/video-editor/projects`, { headers: authHeaders });
      setProjects(res.data || []);
    } catch { /* silent */ } finally { setLoadingProjects(false); }
  }, [authHeaders]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ---------------------------------------------------------------------------
  // Sync stitch status via polling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeProjectId || !stitching) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/video-editor/projects/${activeProjectId}`, { headers: authHeaders });
        const p = res.data;
        if (p.stitchStatus === 'ready') {
          setStitchedUrl(p.stitchedVideoUrl || '');
          setStitching(false);
          clearInterval(pollRef.current);
          toast.success('Video stitched successfully!');
        } else if (p.stitchStatus === 'failed') {
          setStitchError(p.stitchError || 'Stitch failed');
          setStitching(false);
          clearInterval(pollRef.current);
          toast.error('Stitch failed: ' + (p.stitchError || 'unknown error'));
        }
      } catch { /* keep polling */ }
    }, 4000);

    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, stitching]);

  // ---------------------------------------------------------------------------
  // Open / create a project
  // ---------------------------------------------------------------------------
  const openProject = (p) => {
    clearInterval(pollRef.current);
    setProject(p);
    setActiveProjectId(p.id);
    setProjectTitle(p.title || 'Untitled Project');
    const sorted = [...(p.clips || [])].sort((a, b) => a.order - b.order);
    setClips(sorted);
    setAudioUrl(p.audioUrl || '');
    setAudioName(p.audioUrl ? 'Saved audio track' : '');
    setThumbnailUrl(p.thumbnailUrl || '');
    setThumbnailName(p.thumbnailUrl ? 'Saved thumbnail' : '');
    setStitchedUrl(p.stitchedVideoUrl || '');
    setStitchError(p.stitchError || '');
    setStitching(p.stitchStatus === 'stitching');
    setSelectedClipId(null);
  };

  const createNewProject = async () => {
    try {
      const res = await axios.post(`${API}/video-editor/projects`, { title: 'New Project' }, { headers: authHeaders });
      const p = res.data;
      setProjects(prev => [p, ...prev]);
      openProject(p);
      toast.success('New project created');
    } catch {
      toast.error('Failed to create project');
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-save project to backend whenever clips/audio/thumbnail changes
  // ---------------------------------------------------------------------------
  const persistProject = useCallback(async (updates) => {
    if (!activeProjectId) return;
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API}/video-editor/projects/${activeProjectId}`,
        updates,
        { headers: authHeaders }
      );
      setProject(res.data);
    } catch { /* silent */ } finally { setSaving(false); }
  }, [activeProjectId, authHeaders]);

  // Save title on blur
  const handleTitleBlur = () => {
    if (activeProjectId && projectTitle !== project?.title) {
      persistProject({ title: projectTitle });
    }
  };

  // ---------------------------------------------------------------------------
  // Upload handlers — files go to backend → S3
  // ---------------------------------------------------------------------------
  const handleClipUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!activeProjectId) {
      toast.error('Create or open a project first');
      return;
    }
    setUploadingClip(true);
    const newClips = [...clips];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const res = await axios.post(`${API}/video-editor/upload/clip`, form, {
          headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
        });
        newClips.push({
          id: res.data.id,
          name: res.data.name,
          url: res.data.url,
          order: newClips.length,
        });
        toast.success(`Uploaded: ${file.name}`);
      }
      setClips(newClips);
      await persistProject({ clips: newClips });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Clip upload failed');
    } finally {
      setUploadingClip(false);
      e.target.value = '';
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    setUploadingAudio(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/video-editor/upload/audio`, form, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });
      setAudioUrl(res.data.url);
      setAudioName(file.name);
      await persistProject({ audioUrl: res.data.url });
      toast.success(`Audio uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Audio upload failed');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleThumbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    setUploadingThumb(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/video-editor/upload/thumbnail`, form, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });
      setThumbnailUrl(res.data.url);
      setThumbnailName(file.name);
      await persistProject({ thumbnailUrl: res.data.url });
      toast.success(`Thumbnail uploaded: ${file.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Thumbnail upload failed');
    } finally {
      setUploadingThumb(false);
      e.target.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // DnD reorder
  // ---------------------------------------------------------------------------
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = clips.findIndex(c => c.id === active.id);
    const newIndex = clips.findIndex(c => c.id === over.id);
    const reordered = arrayMove(clips, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }));
    setClips(reordered);
    await persistProject({ clips: reordered });
  };

  // ---------------------------------------------------------------------------
  // Remove clip
  // ---------------------------------------------------------------------------
  const removeClip = async (clipId) => {
    const updated = clips
      .filter(c => c.id !== clipId)
      .map((c, i) => ({ ...c, order: i }));
    setClips(updated);
    if (selectedClipId === clipId) setSelectedClipId(null);
    await persistProject({ clips: updated });
  };

  // ---------------------------------------------------------------------------
  // Stitch
  // ---------------------------------------------------------------------------
  const handleStitch = async () => {
    if (!activeProjectId) return;
    if (clips.length === 0) { toast.error('Add at least one clip'); return; }
    setStitching(true);
    setStitchedUrl('');
    setStitchError('');
    try {
      await axios.post(
        `${API}/video-editor/projects/${activeProjectId}/stitch`,
        {},
        { headers: authHeaders }
      );
      toast.info('Stitching started — this takes 30 seconds to a few minutes depending on clip sizes.');
    } catch (err) {
      setStitching(false);
      toast.error(err.response?.data?.detail || 'Failed to start stitch');
    }
  };

  // ---------------------------------------------------------------------------
  // Delete project
  // ---------------------------------------------------------------------------
  const handleDeleteProject = async () => {
    if (!activeProjectId) return;
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/video-editor/projects/${activeProjectId}`, { headers: authHeaders });
      setProjects(prev => prev.filter(p => p.id !== activeProjectId));
      setProject(null);
      setActiveProjectId(null);
      setClips([]);
      clearInterval(pollRef.current);
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full" data-testid="video-editor-page">

      {/* ── Left: Project list ──────────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-[#1F2933] bg-[#070D15] flex flex-col">
        <div className="p-3 border-b border-[#1F2933] flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Scissors className="h-3.5 w-3.5 text-violet-400" /> Projects
          </span>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-zinc-600" />}
        </div>
        <div className="p-2">
          <Button onClick={createNewProject} size="sm"
            className="w-full h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-3 w-3 mr-1" /> New Project
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingProjects && <Loader2 className="h-4 w-4 animate-spin text-zinc-600 mx-auto mt-4" />}
          {!loadingProjects && projects.length === 0 && (
            <p className="text-xs text-zinc-600 text-center mt-4">No projects yet</p>
          )}
          {projects.map(p => (
            <div key={p.id} onClick={() => openProject(p)}
              className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                activeProjectId === p.id
                  ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white border border-transparent'
              }`}>
              <p className="font-medium truncate">{p.title || 'Untitled'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-zinc-600 text-[10px]">
                  {(p.clips?.length || 0)} clip{(p.clips?.length || 0) !== 1 ? 's' : ''}
                </p>
                {p.stitchStatus === 'ready' && <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />}
                {p.stitchStatus === 'stitching' && <Loader2 className="h-2.5 w-2.5 text-amber-400 animate-spin" />}
                {p.stitchStatus === 'failed' && <AlertCircle className="h-2.5 w-2.5 text-red-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main editor ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {!activeProjectId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Scissors className="h-12 w-12 text-zinc-800 mb-4" />
            <h2 className="text-white font-semibold text-lg mb-1">Video Editor</h2>
            <p className="text-zinc-500 text-sm mb-4 max-w-xs">
              Upload video clips, arrange them in order, add an audio track and thumbnail,
              then stitch everything into a finished video — all server-side with FFmpeg.
            </p>
            <Button onClick={createNewProject}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm">
              <Plus className="h-4 w-4 mr-2" /> Create First Project
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1F2933] bg-[#0B1120] shrink-0">
              <Input
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="h-8 w-56 bg-transparent border-zinc-800 text-white text-sm font-semibold focus:border-violet-500/50"
              />
              <div className="ml-auto flex items-center gap-2">
                {saving && (
                  <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </span>
                )}
                <Button onClick={handleStitch}
                  disabled={stitching || clips.length === 0}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4">
                  {stitching
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Stitching…</>
                    : <><Film className="h-3.5 w-3.5 mr-1.5" /> Stitch Video</>}
                </Button>
                <Button onClick={handleDeleteProject} variant="ghost" size="sm"
                  className="h-8 px-2 text-zinc-600 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Body: left=preview, right=assets */}
            <div className="flex-1 overflow-hidden flex gap-0">

              {/* Left: Preview + timeline */}
              <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">

                {/* Preview */}
                <Card className="bg-[#0B1120] border-[#1F2933] flex-shrink-0">
                  <CardContent className="p-3">
                    <div className="aspect-video bg-zinc-950 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800">
                      {selectedClip ? (
                        <video key={selectedClip.url} controls src={resolveUrl(selectedClip.url)}
                          className="w-full h-full rounded-lg" />
                      ) : (
                        <div className="text-center">
                          <Film className="h-10 w-10 text-zinc-800 mx-auto mb-2" />
                          <p className="text-xs text-zinc-600">Select a clip to preview</p>
                        </div>
                      )}
                    </div>
                    {selectedClip && (
                      <p className="text-[10px] text-zinc-500 mt-1.5 truncate text-center">{selectedClip.name}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Stitch result */}
                {stitchedUrl && (
                  <Card className="bg-[#0B1120] border-emerald-500/20 flex-shrink-0">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <CardTitle className="text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Stitched Video Ready
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      <video key={stitchedUrl} controls src={resolveUrl(stitchedUrl)}
                        className="w-full rounded-lg border border-emerald-500/20" style={{ maxHeight: 200 }} />
                      <a href={resolveUrl(stitchedUrl)} download target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:underline">
                        <Download className="h-3 w-3" /> Download stitched video
                      </a>
                    </CardContent>
                  </Card>
                )}

                {stitchError && !stitching && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400 flex-shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Stitch failed</p>
                      <p className="text-red-400/70 text-[10px] mt-0.5">{stitchError}</p>
                    </div>
                    <Button onClick={handleStitch} disabled={clips.length === 0} size="sm"
                      className="ml-auto h-6 text-[10px] px-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20">
                      <RefreshCw className="h-2.5 w-2.5 mr-1" /> Retry
                    </Button>
                  </div>
                )}

                {stitching && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex-shrink-0">
                    <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                    <div>
                      <p className="text-xs text-amber-400 font-medium">FFmpeg stitching…</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Running on server. Auto-checks every 4 seconds. Keep this page open.
                      </p>
                    </div>
                  </div>
                )}

                {/* Clip timeline — DnD sortable */}
                <div className="flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5" /> Clip Sequence
                      <span className="text-zinc-600">({clips.length} clip{clips.length !== 1 ? 's' : ''})</span>
                    </Label>
                    <Button onClick={() => clipInputRef.current?.click()}
                      disabled={uploadingClip} size="sm"
                      className="h-7 text-[10px] px-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-violet-500/30">
                      {uploadingClip
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Upload className="h-3 w-3 mr-1" />}
                      Add Clips
                    </Button>
                    <input ref={clipInputRef} type="file" accept="video/*" multiple hidden onChange={handleClipUpload} />
                  </div>

                  {clips.length === 0 ? (
                    <div
                      className="h-32 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/30 transition-colors"
                      onClick={() => clipInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-zinc-700 mb-1.5" />
                      <p className="text-xs text-zinc-600">Click to upload video clips</p>
                      <p className="text-[10px] text-zinc-700 mt-0.5">MP4, WebM, MOV — up to 500 MB each</p>
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={clips.map(c => c.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {clips.map(clip => (
                            <SortableClip
                              key={clip.id}
                              clip={clip}
                              isSelected={selectedClipId === clip.id}
                              onSelect={setSelectedClipId}
                              onRemove={removeClip}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>

                      {/* Add more clips */}
                      <div
                        className="flex-shrink-0 w-36 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/30 transition-colors"
                        onClick={() => clipInputRef.current?.click()}
                      >
                        {uploadingClip
                          ? <Loader2 className="h-4 w-4 text-zinc-600 animate-spin" />
                          : <Plus className="h-4 w-4 text-zinc-700" />}
                        <p className="text-[10px] text-zinc-600 mt-1">Add more</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Audio + Thumbnail panel */}
              <div className="w-64 shrink-0 border-l border-[#1F2933] flex flex-col overflow-y-auto">
                <div className="p-4 space-y-5">

                  {/* Audio track */}
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5 text-emerald-400" /> Audio Track
                    </Label>
                    {audioUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded bg-zinc-950 border border-zinc-800">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <p className="text-[10px] text-zinc-400 flex-1 truncate">{audioName || 'Audio track'}</p>
                          <button onClick={() => { setAudioUrl(''); setAudioName(''); persistProject({ audioUrl: '' }); }}
                            className="text-zinc-600 hover:text-red-400 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <audio key={audioUrl} controls src={resolveUrl(audioUrl)}
                          className="w-full" style={{ height: 32, colorScheme: 'dark' }} />
                      </div>
                    ) : (
                      <div
                        className="h-20 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/20 transition-colors"
                        onClick={() => audioInputRef.current?.click()}
                      >
                        {uploadingAudio
                          ? <Loader2 className="h-4 w-4 text-zinc-600 animate-spin" />
                          : <Music className="h-4 w-4 text-zinc-700 mb-1" />}
                        <p className="text-[10px] text-zinc-600">Upload audio track</p>
                        <p className="text-[10px] text-zinc-700">MP3, WAV, AAC</p>
                      </div>
                    )}
                    <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleAudioUpload} />
                    {!audioUrl && (
                      <Button onClick={() => audioInputRef.current?.click()} disabled={uploadingAudio} size="sm"
                        className="w-full h-7 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">
                        {uploadingAudio ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                        Upload Audio
                      </Button>
                    )}
                  </div>

                  <Separator className="bg-zinc-800/60" />

                  {/* Thumbnail */}
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-violet-400" /> Thumbnail
                    </Label>
                    {thumbnailUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-zinc-800">
                          <img src={resolveUrl(thumbnailUrl)} alt="Thumbnail"
                            className="w-full object-cover aspect-video" />
                          <button
                            onClick={() => { setThumbnailUrl(''); setThumbnailName(''); persistProject({ thumbnailUrl: '' }); }}
                            className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-0.5 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 truncate">{thumbnailName || 'Thumbnail'}</p>
                      </div>
                    ) : (
                      <div
                        className="h-20 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/20 transition-colors"
                        onClick={() => thumbInputRef.current?.click()}
                      >
                        {uploadingThumb
                          ? <Loader2 className="h-4 w-4 text-zinc-600 animate-spin" />
                          : <ImageIcon className="h-4 w-4 text-zinc-700 mb-1" />}
                        <p className="text-[10px] text-zinc-600">Upload thumbnail</p>
                        <p className="text-[10px] text-zinc-700">JPG, PNG, WebP</p>
                      </div>
                    )}
                    <input ref={thumbInputRef} type="file" accept="image/*" hidden onChange={handleThumbUpload} />
                    {!thumbnailUrl && (
                      <Button onClick={() => thumbInputRef.current?.click()} disabled={uploadingThumb} size="sm"
                        className="w-full h-7 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">
                        {uploadingThumb ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                        Upload Thumbnail
                      </Button>
                    )}
                  </div>

                  <Separator className="bg-zinc-800/60" />

                  {/* Project summary */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Project Summary</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">Clips</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-400 border-zinc-700">
                          {clips.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">Audio</span>
                        <span className={audioUrl ? 'text-emerald-400' : 'text-zinc-600'}>
                          {audioUrl ? '✓ Added' : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">Thumbnail</span>
                        <span className={thumbnailUrl ? 'text-emerald-400' : 'text-zinc-600'}>
                          {thumbnailUrl ? '✓ Added' : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">Stitch status</span>
                        <span className={
                          stitchedUrl ? 'text-emerald-400' :
                          stitching ? 'text-amber-400' :
                          stitchError ? 'text-red-400' : 'text-zinc-600'
                        }>
                          {stitchedUrl ? 'Ready' : stitching ? 'Running…' : stitchError ? 'Failed' : 'Not started'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {clips.length > 0 && (
                    <Button onClick={handleStitch} disabled={stitching} size="sm"
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      {stitching
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Stitching…</>
                        : <><Film className="h-3.5 w-3.5 mr-1.5" /> Stitch All Clips</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
