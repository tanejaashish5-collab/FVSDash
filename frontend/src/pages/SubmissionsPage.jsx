import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, CalendarIcon, FileText, ChevronDown, Link as LinkIcon, ExternalLink,
  FileImage, Check, Send, Youtube, Instagram, X, CalendarClock, Settings, Plus, Sparkles,
  Volume2, Video, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ['INTAKE', 'EDITING', 'DESIGN', 'SCHEDULED', 'PUBLISHED'];
const CONTENT_TYPES = ['Podcast', 'Short', 'Blog', 'Webinar'];
const PRIORITIES = ['Low', 'Medium', 'High'];

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const platformCfg = {
  youtube_shorts: { label: 'YouTube Shorts', icon: Youtube, color: 'text-red-400', bg: 'bg-red-500/10' },
  tiktok: { label: 'TikTok', icon: TikTokIcon, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  instagram_reels: { label: 'Instagram Reels', icon: Instagram, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

const publishStatusCfg = {
  draft: { label: 'Draft', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  posting: { label: 'Posting', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  posted: { label: 'Posted', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const statusCfg = {
  INTAKE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  EDITING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  DESIGN: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  SCHEDULED: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  PUBLISHED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};
const typeCfg = {
  Podcast: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Short: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Blog: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Webinar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const priorityCfg = {
  High: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  Medium: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  Low: { text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

function DetailRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">{label}</p>
      <div className="text-sm text-zinc-300">{children}</div>
    </div>
  );
}

export default function SubmissionsPage() {
  const { authHeaders, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [guest, setGuest] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [releaseDate, setReleaseDate] = useState(undefined);
  const [sourceFileUrl, setSourceFileUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // List state
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pipeline'); // 'pipeline' = all except PUBLISHED
  const [filterType, setFilterType] = useState('all');

  // Detail panel
  const [selected, setSelected] = useState(null);
  
  // Thumbnail + asset state
  const [thumbnails, setThumbnails] = useState([]);
  const [audioAssets, setAudioAssets] = useState([]);
  const [videoAssets, setVideoAssets] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [selectingThumbnail, setSelectingThumbnail] = useState(null);
  // Auto-open from Full Auto navigation
  const [autoOpenId, setAutoOpenId] = useState(null);
  const [clearingDemo, setClearingDemo] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Keyboard navigation state
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  // Publishing state
  const [platformConnections, setPlatformConnections] = useState([]);
  const [publishingTasks, setPublishingTasks] = useState([]);
  const [postingPlatform, setPostingPlatform] = useState(null);
  const [schedulingPlatform, setSchedulingPlatform] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('12:00');

  const fetchSubmissions = useCallback(() => {
    const params = new URLSearchParams();
    // 'pipeline' = fetch all, filter out PUBLISHED client-side
    if (filterStatus !== 'all' && filterStatus !== 'pipeline') params.append('status', filterStatus);
    if (filterType !== 'all') params.append('content_type', filterType);
    axios.get(`${API}/submissions?${params}`, { headers: authHeaders })
      .then(res => {
        let items = res.data || [];
        if (filterStatus === 'pipeline') items = items.filter(s => s.status !== 'PUBLISHED');
        setSubmissions(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders, filterStatus, filterType]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Clear bulk selection when submissions change (filter/refetch)
  useEffect(() => { setSelectedIds(new Set()); setFocusedIdx(-1); }, [submissions]);

  // Text-search filter (used by "/" keyboard shortcut)
  const visibleSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.guest?.toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  const toggleSelect = (id, e) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === visibleSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleSubmissions.map(s => s.id)));
    }
  };

  const handleBulkUpdate = async (updates) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await axios.patch(`${API}/submissions/bulk`, {
        ids: Array.from(selectedIds), updates,
      }, { headers: authHeaders });
      toast.success(`Updated ${selectedIds.size} submission${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      fetchSubmissions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Bulk update failed');
    } finally { setBulkUpdating(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} submission${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          axios.delete(`${API}/submissions/${id}`, { headers: authHeaders })
        )
      );
      toast.success(`Deleted ${selectedIds.size} submission${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      fetchSubmissions();
    } catch (e) {
      toast.error('Some deletions failed');
    } finally { setBulkUpdating(false); }
  };

  // Read router state from Full Auto navigation → mark which submission to auto-open
  useEffect(() => {
    if (location.state?.openSubmissionId) {
      setAutoOpenId(location.state.openSubmissionId);
    }
  }, [location.state]);

  // After submissions load, auto-open the targeted submission
  useEffect(() => {
    if (autoOpenId && submissions.length > 0) {
      const target = submissions.find(s => s.id === autoOpenId);
      if (target) { setSelected(target); setAutoOpenId(null); }
    }
  }, [autoOpenId, submissions]);

  // Fetch thumbnails and publishing data when submission is selected
  useEffect(() => {
    if (!selected || !authHeaders) return;
    
    const fetchDetailData = async () => {
      setLoadingThumbnails(true);
      try {
        const [assetsRes, connectionsRes, tasksRes] = await Promise.all([
          axios.get(`${API}/assets/library`, { headers: authHeaders }),
          axios.get(`${API}/platform-connections`, { headers: authHeaders }).catch(() => ({ data: [] })),
          axios.get(`${API}/publishing-tasks?submissionId=${selected.id}`, { headers: authHeaders }).catch(() => ({ data: [] }))
        ]);
        
        // Filter assets by type for this submission
        const allAssets = assetsRes.data.filter(a => a.submissionId === selected.id);
        setThumbnails(allAssets.filter(a => a.type === 'Thumbnail'));
        setAudioAssets(allAssets.filter(a => a.type === 'Audio'));
        setVideoAssets(allAssets.filter(a => a.type === 'Video'));
        
        // Ensure all platforms are represented with a connection status
        const platforms = ['youtube_shorts', 'tiktok', 'instagram_reels'];
        const existingConnections = connectionsRes.data || [];
        const fullConnections = platforms.map(platform => {
          const existing = existingConnections.find(c => c.platform === platform);
          return existing || {
            id: null,
            platform,
            connected: false,
            accountName: null,
            accountHandle: null
          };
        });
        setPlatformConnections(fullConnections);
        setPublishingTasks(tasksRes.data || []);
      } catch (err) {
        console.error('Failed to fetch detail data:', err);
        // Set default disconnected state for all platforms on error
        const platforms = ['youtube_shorts', 'tiktok', 'instagram_reels'];
        setPlatformConnections(platforms.map(platform => ({
          id: null,
          platform,
          connected: false,
          accountName: null,
          accountHandle: null
        })));
        setPublishingTasks([]);
      } finally {
        setLoadingThumbnails(false);
      }
    };
    
    fetchDetailData();
  }, [selected, authHeaders]);

  // Pipeline keyboard shortcuts — disabled while the new-submission form is open
  useKeyboardShortcuts({
    'n': () => setIsFormOpen(true),
    '/': () => setTimeout(() => searchRef.current?.focus(), 0),
    'j': () => setFocusedIdx(i => Math.min(i + 1, visibleSubmissions.length - 1)),
    'k': () => setFocusedIdx(i => Math.max(i - 1, 0)),
    'enter': () => {
      if (focusedIdx >= 0 && visibleSubmissions[focusedIdx]) {
        setSelected(visibleSubmissions[focusedIdx]);
      }
    },
    'escape': () => { setSelected(null); setFocusedIdx(-1); setSelectedIds(new Set()); },
    '1': () => { const s = selected || visibleSubmissions[focusedIdx]; if (s) handleStatusChange(s.id, 'INTAKE'); },
    '2': () => { const s = selected || visibleSubmissions[focusedIdx]; if (s) handleStatusChange(s.id, 'EDITING'); },
    '3': () => { const s = selected || visibleSubmissions[focusedIdx]; if (s) handleStatusChange(s.id, 'DESIGN'); },
    '4': () => { const s = selected || visibleSubmissions[focusedIdx]; if (s) handleStatusChange(s.id, 'SCHEDULED'); },
    '5': () => { const s = selected || visibleSubmissions[focusedIdx]; if (s) handleStatusChange(s.id, 'PUBLISHED'); },
  }, !isFormOpen);

  const resetForm = () => {
    setTitle(''); setGuest(''); setDescription('');
    setContentType(''); setPriority('Medium');
    setReleaseDate(undefined); setSourceFileUrl('');
    setConfirmed(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceFileUrl.trim() || !title.trim() || !guest.trim() || !description.trim() || !contentType || !releaseDate || !confirmed) {
      toast.error('Please fill in all required fields and confirm rights.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/submissions`, {
        title: title.trim(),
        guest: guest.trim(),
        description: description.trim(),
        contentType,
        priority,
        releaseDate: format(releaseDate, 'yyyy-MM-dd'),
        sourceFileUrl: sourceFileUrl.trim(),
      }, { headers: authHeaders });
      toast.success('Submission created');
      resetForm();
      setIsFormOpen(false);
      fetchSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormClose = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/submissions/${id}/status`, { status: newStatus }, { headers: authHeaders });
      toast.success(`Status updated to ${newStatus}`);
      fetchSubmissions();
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  // Clear seed/demo data
  const handleClearDemoData = async () => {
    if (!window.confirm('Remove all demo/seed submissions and their assets? Your real submissions will stay.')) return;
    setClearingDemo(true);
    try {
      await axios.delete(`${API}/admin/seed-data`, { headers: authHeaders });
      toast.success('Demo data cleared');
      fetchSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to clear demo data');
    } finally {
      setClearingDemo(false);
    }
  };

  // Select primary thumbnail
  const handleSelectThumbnail = async (assetId) => {
    if (selectingThumbnail || !selected) return;
    if (selected.primaryThumbnailAssetId === assetId) {
      toast.info('This is already the primary thumbnail');
      return;
    }
    
    setSelectingThumbnail(assetId);
    try {
      await axios.patch(`${API}/submissions/${selected.id}/primary-thumbnail`, { assetId }, { headers: authHeaders });
      setSelected(prev => ({ ...prev, primaryThumbnailAssetId: assetId }));
      setThumbnails(prev => prev.map(t => ({ ...t, isPrimaryThumbnail: t.id === assetId })));
      toast.success('Primary thumbnail updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update thumbnail');
    } finally {
      setSelectingThumbnail(null);
    }
  };

  // Delete submission (soft-delete)
  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/submissions/${submissionId}`, { headers: authHeaders });
      toast.success('Submission deleted');
      setSelected(null);
      fetchSubmissions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete submission');
    }
  };

  // Post Now
  const handlePostNow = async (platform) => {
    if (!selected) return;
    setPostingPlatform(platform);
    try {
      const res = await axios.post(`${API}/publishing-tasks/create-and-post`, {
        submissionId: selected.id,
        platform
      }, { headers: authHeaders });
      
      setPublishingTasks(prev => {
        const existing = prev.findIndex(t => t.platform === platform);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = res.data;
          return updated;
        }
        return [...prev, res.data];
      });
      
      toast.success(`Posted to ${platformCfg[platform]?.label}!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to post');
    } finally {
      setPostingPlatform(null);
    }
  };

  // Schedule
  const handleSchedule = async (platform) => {
    if (!selected || !scheduleDate) {
      toast.error('Please select a date');
      return;
    }
    
    setPostingPlatform(platform);
    try {
      const scheduledAt = new Date(scheduleDate);
      const [hours, minutes] = scheduleTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const res = await axios.post(`${API}/publishing-tasks`, {
        submissionId: selected.id,
        platform,
        scheduledAt: scheduledAt.toISOString()
      }, { headers: authHeaders });
      
      setPublishingTasks(prev => {
        const existing = prev.findIndex(t => t.platform === platform);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = res.data;
          return updated;
        }
        return [...prev, res.data];
      });
      
      setSchedulingPlatform(null);
      setScheduleDate(null);
      toast.success(`Scheduled for ${platformCfg[platform]?.label}!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule');
    } finally {
      setPostingPlatform(null);
    }
  };

  // Cancel task
  const handleCancelTask = async (taskId) => {
    try {
      await axios.delete(`${API}/publishing-tasks/${taskId}`, { headers: authHeaders });
      setPublishingTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Scheduled post cancelled');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    }
  };

  const formatScheduledDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const truncateTitle = (str, maxLen = 60) => {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  };

  const inputCls = "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 text-sm";

  return (
    <div data-testid="submissions-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Pipeline
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Submit new episodes and track their progress.</p>
        </div>
        <AuraTooltip content={tooltipContent.submissions.newSubmission} position="left">
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium h-9 text-sm gap-2"
            data-testid="new-submission-btn"
          >
            <Plus className="h-4 w-4" />
            New Submission
          </Button>
        </AuraTooltip>
      </div>

      {/* Full-Width Submissions Table */}
      <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="submissions-list-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                All Submissions
              </CardTitle>
              <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 rounded">{visibleSubmissions.length}</span>
            </div>
          </div>
          {/* Filters + Search */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Input
              ref={searchRef}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setFocusedIdx(-1); }}
              placeholder="Search titles… (press /)"
              className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 w-[190px]"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status" className="w-[140px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                <SelectItem value="pipeline" className="text-xs text-zinc-300">Active Pipeline</SelectItem>
                <SelectItem value="all" className="text-xs text-zinc-300">All Statuses</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs text-zinc-300">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-type" className="w-[130px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                <SelectItem value="all" className="text-xs text-zinc-300">All Types</SelectItem>
                {CONTENT_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-xs text-zinc-300">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {user?.role === 'admin' && (
              <button
                onClick={handleClearDemoData}
                disabled={clearingDemo}
                className="ml-auto text-[10px] text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Remove demo/seed submissions and assets"
              >
                {clearingDemo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Clear Demo Data
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No submissions found.</p>
              <p className="text-[10px] text-zinc-600 mt-1">Click "+ New Submission" to create your first piece of content.</p>
            </div>
          ) : (
            <>
              {/* ── Bulk Actions Toolbar ── */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-500/5 border-b border-indigo-500/20">
                  <span className="text-xs text-indigo-400 font-medium">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <Select value={bulkStatus} onValueChange={v => { setBulkStatus(v); handleBulkUpdate({ status: v }); }}>
                      <SelectTrigger className="h-6 w-[120px] text-[10px] bg-zinc-900 border-zinc-700 text-zinc-300">
                        <SelectValue placeholder="Move to…" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s} className="text-xs text-zinc-300">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={bulkPriority} onValueChange={v => { setBulkPriority(v); handleBulkUpdate({ priority: v }); }}>
                      <SelectTrigger className="h-6 w-[110px] text-[10px] bg-zinc-900 border-zinc-700 text-zinc-300">
                        <SelectValue placeholder="Priority…" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                        {PRIORITIES.map(p => (
                          <SelectItem key={p} value={p} className="text-xs text-zinc-300">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleBulkDelete} disabled={bulkUpdating}
                      className="h-6 text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-2">
                      {bulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                      Delete
                    </Button>
                    <button onClick={() => setSelectedIds(new Set())}
                      className="text-[10px] text-zinc-600 hover:text-zinc-400 ml-1">
                      Clear
                    </button>
                  </div>
                </div>
              )}
            <Table>
              <TableHeader>
                <TableRow className="border-[#1F2933] hover:bg-transparent">
                  <TableHead className="w-[36px] px-4">
                    <Checkbox
                      checked={visibleSubmissions.length > 0 && selectedIds.size === visibleSubmissions.length}
                      onCheckedChange={toggleSelectAll}
                      className="border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-[28%]">Title</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <AuraTooltip content={tooltipContent.submissions.statusFilter} position="top">
                      <span>Status</span>
                    </AuraTooltip>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Priority</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Release Date</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Created</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSubmissions.map((sub, idx) => {
                  const sc = statusCfg[sub.status] || statusCfg.INTAKE;
                  const tc = typeCfg[sub.contentType] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
                  const pc = priorityCfg[sub.priority] || priorityCfg.Medium;
                  const isSelected = selectedIds.has(sub.id);
                  const isFocused = idx === focusedIdx;
                  return (
                    <TableRow
                      key={sub.id}
                      className={`aura-table-row border-[#1F2933] cursor-pointer ${isSelected ? 'bg-indigo-500/5' : ''} ${isFocused ? 'ring-1 ring-inset ring-indigo-500/40 bg-indigo-500/5' : ''}`}
                      onClick={() => setSelected(sub)}
                      data-testid={`sub-row-${sub.id}`}
                    >
                      <TableCell className="px-4" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(sub.id)}
                          className="border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium" title={sub.title}>
                            {truncateTitle(sub.title)}
                          </p>
                          {sub.guest && <p className="text-[10px] text-zinc-500">w/ {sub.guest}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc}`}>{sub.contentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={e => e.stopPropagation()}
                              data-testid={`status-trigger-${sub.id}`}
                              className="flex items-center gap-1 group"
                            >
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                                {sub.status}
                              </Badge>
                              <ChevronDown className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-[#0B1120] border-[#1F2933] w-36" onClick={e => e.stopPropagation()}>
                            {STATUSES.map(s => {
                              const cfg = statusCfg[s];
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStatusChange(sub.id, s)}
                                  className={`text-xs cursor-pointer ${sub.status === s ? 'text-white font-medium' : 'text-zinc-400'}`}
                                  data-testid={`set-status-${s.toLowerCase()}-${sub.id}`}
                                >
                                  <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot} mr-2 shrink-0`} />
                                  {s}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pc.bg} ${pc.text} ${pc.border}`}>
                          {sub.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-400">{formatDate(sub.releaseDate)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-500">{formatDate(sub.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(sub);
                          }}
                          data-testid={`view-btn-${sub.id}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* New Submission Modal (Slide-over) */}
      <Sheet open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormClose(); }}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
              New Submission
            </SheetTitle>
            <SheetDescription className="text-zinc-500 text-xs">
              Fill in the details below to submit new content for production.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source File */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Source file (Google Drive or upload URL) *</Label>
              <div className="relative">
                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  data-testid="form-source-url"
                  placeholder="https://drive.google.com/..."
                  value={sourceFileUrl}
                  onChange={e => setSourceFileUrl(e.target.value)}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            {/* Episode Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Episode title *</Label>
              <Input
                data-testid="form-title"
                placeholder="e.g. How AI Transforms Finance"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Guest Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Guest name *</Label>
              <Input
                data-testid="form-guest"
                placeholder="e.g. Dr. Sarah Mitchell"
                value={guest}
                onChange={e => setGuest(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Short description *</Label>
              <Textarea
                data-testid="form-description"
                placeholder="Brief summary of the episode content..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Content Type + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Content type *</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger data-testid="form-content-type" className={`${inputCls} h-9`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    {CONTENT_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs text-zinc-300">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="form-priority" className={`${inputCls} h-9`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p} className="text-xs text-zinc-300">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Release Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Target release date *</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="form-release-date"
                    className={`w-full justify-start text-left font-normal h-9 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:text-white ${releaseDate ? 'text-white' : 'text-zinc-600'}`}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm">{releaseDate ? format(releaseDate, 'PPP') : 'Pick a date'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0B1120] border-[#1F2933]" align="start">
                  <Calendar
                    mode="single"
                    selected={releaseDate}
                    onSelect={(d) => { setReleaseDate(d); setDatePickerOpen(false); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Confirmation */}
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="confirm"
                data-testid="form-confirm"
                checked={confirmed}
                onCheckedChange={setConfirmed}
                className="mt-0.5 border-zinc-700 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <Label htmlFor="confirm" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                I confirm all assets and rights are cleared for production. *
              </Label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3">
              <Button
                type="submit"
                data-testid="form-submit-btn"
                disabled={submitting}
                className={`aura-btn-teal flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium h-9 text-sm ${submitting ? 'animate-aura-button-glow' : ''}`}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
              <Button
                type="button"
                data-testid="form-cancel-btn"
                variant="ghost"
                onClick={handleFormClose}
                className="text-zinc-400 hover:text-white hover:bg-white/5 h-9 text-sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet (unchanged) */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-[420px] sm:w-[480px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {selected.title}
                </SheetTitle>
                <SheetDescription className="text-zinc-500 text-xs">
                  Submission details
                </SheetDescription>
              </SheetHeader>

              <div className="flex items-center gap-2 mb-5">
                {(() => {
                  const sc = statusCfg[selected.status] || statusCfg.INTAKE;
                  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>{selected.status}</Badge>;
                })()}
                {(() => {
                  const tc = typeCfg[selected.contentType] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
                  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc}`}>{selected.contentType}</Badge>;
                })()}
                <span className={`text-xs font-medium ${selected.priority === 'High' ? 'text-red-400' : selected.priority === 'Medium' ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {selected.priority} priority
                </span>
              </div>

              <Separator className="bg-[#1F2933] mb-5" />

              <div className="space-y-5">
                {selected.guest && (
                  <DetailRow label="Guest">
                    <p>{selected.guest}</p>
                  </DetailRow>
                )}
                <DetailRow label="Description">
                  <p className="leading-relaxed">{selected.description}</p>
                </DetailRow>
                <DetailRow label="Release Date">
                  <p className="font-mono">{selected.releaseDate || 'Not set'}</p>
                </DetailRow>
                {selected.sourceFileUrl && (
                  <DetailRow label="Source File">
                    <a
                      href={selected.sourceFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {selected.sourceFileUrl}
                    </a>
                  </DetailRow>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Created">
                    <p className="text-xs font-mono">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </DetailRow>
                  <DetailRow label="Updated">
                    <p className="text-xs font-mono">
                      {selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </DetailRow>
                </div>
              </div>

              <Separator className="bg-[#1F2933] my-5" />

              {/* Status change from detail panel */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Change Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(s => {
                    const cfg = statusCfg[s];
                    const isActive = selected.status === s;
                    return (
                      <button
                        key={s}
                        data-testid={`detail-status-${s.toLowerCase()}`}
                        onClick={() => handleStatusChange(selected.id, s)}
                        className={`px-2.5 py-1 rounded-sm text-[10px] font-medium border transition-colors ${
                          isActive
                            ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                            : 'border-[#1F2933] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-[#1F2933] my-5" />

              {/* Open in Content Studio */}
              <div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const prefill = { topic: selected.title, script: selected.description || '' };
                    if (selected.fvsIdeaId) {
                      try {
                        const res = await axios.get(`${API}/fvs/scripts?submissionId=${selected.id}`, { headers: authHeaders });
                        if (res.data?.length > 0 && res.data[0].text) prefill.script = res.data[0].text;
                      } catch { /* fall back to description */ }
                    }
                    navigate('/dashboard/studio', { state: { prefill } });
                  }}
                  className="w-full h-9 text-xs border-zinc-800 text-zinc-300 hover:text-white hover:bg-white/5 justify-start"
                  data-testid="open-studio-btn"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                  Open in Content Studio
                </Button>
              </div>

              <Separator className="bg-[#1F2933] my-5" />

              {/* Thumbnails Section */}
              <div data-testid="thumbnails-section">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center gap-2">
                  <FileImage className="h-3.5 w-3.5" />
                  Thumbnails
                </p>
                {loadingThumbnails ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                  </div>
                ) : thumbnails.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                    <FileImage className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">No thumbnails yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {thumbnails.map((thumb, idx) => {
                      const isPrimary = thumb.id === selected.primaryThumbnailAssetId || thumb.isPrimaryThumbnail;
                      const isSelecting = selectingThumbnail === thumb.id;
                      
                      return (
                        <div
                          key={thumb.id}
                          onClick={() => handleSelectThumbnail(thumb.id)}
                          className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isPrimary
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-transparent hover:border-amber-500/50'
                          } ${isSelecting ? 'opacity-50' : ''}`}
                          data-testid={`thumbnail-${idx}`}
                        >
                          {thumb.url ? (
                            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <FileImage className="h-4 w-4 text-zinc-600" />
                            </div>
                          )}
                          {isPrimary && (
                            <div className="absolute top-1 right-1">
                              <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                          {isSelecting && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Audio Assets Section */}
              {audioAssets.length > 0 && (
                <>
                  <Separator className="bg-[#1F2933] my-5" />
                  <div data-testid="audio-section">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5" />
                      Audio
                    </p>
                    <div className="space-y-2">
                      {audioAssets.map((asset) => (
                        <div key={asset.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-2.5">
                          <p className="text-[10px] text-zinc-500 mb-1.5 truncate">{asset.name}</p>
                          {asset.url ? (
                            <audio controls className="w-full h-8" style={{ colorScheme: 'dark' }}>
                              <source src={asset.url} />
                            </audio>
                          ) : (
                            <p className="text-[10px] text-zinc-600 italic">No audio URL yet</p>
                          )}
                          {asset.isMocked && (
                            <span className="text-[9px] text-amber-500/70 mt-1 block">Placeholder audio</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Video Assets Section */}
              {videoAssets.length > 0 && (
                <>
                  <Separator className="bg-[#1F2933] my-5" />
                  <div data-testid="video-section">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center gap-2">
                      <Video className="h-3.5 w-3.5" />
                      Video
                    </p>
                    <div className="space-y-2">
                      {videoAssets.map((asset) => (
                        <div key={asset.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-2.5">
                          <p className="text-[10px] text-zinc-500 mb-1.5 truncate">{asset.name}</p>
                          {asset.url ? (
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open Video
                            </a>
                          ) : (
                            <p className="text-[10px] text-zinc-600 italic">Processing…</p>
                          )}
                          {asset.isMocked && (
                            <span className="text-[9px] text-amber-500/70 mt-1 block">Sample video (Veo key not set)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="bg-[#1F2933] my-5" />

              {/* Publishing Section */}
              <div data-testid="publishing-section">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Publishing
                </p>
                <div className="space-y-2">
                  {Object.keys(platformCfg).map((platform) => {
                    const cfg = platformCfg[platform];
                    const PlatformIcon = cfg.icon;
                    const connection = platformConnections.find(c => c.platform === platform);
                    const isConnected = connection?.connected;
                    const task = publishingTasks.find(t => t.platform === platform);
                    const taskStatus = task?.status;
                    const statusCfgItem = publishStatusCfg[taskStatus] || {};
                    const isPosting = postingPlatform === platform;
                    const isScheduling = schedulingPlatform === platform;
                    
                    return (
                      <div
                        key={platform}
                        className={`p-2.5 rounded-lg border ${isConnected ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-800/50 bg-zinc-900/10 opacity-60'}`}
                        data-testid={`publish-${platform}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded ${cfg.bg} flex items-center justify-center`}>
                              <PlatformIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            </div>
                            <div>
                              <span className="text-xs text-white font-medium">{cfg.label}</span>
                              {taskStatus && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge className={`text-[9px] px-1 py-0 ${statusCfgItem.bg} ${statusCfgItem.color} border ${statusCfgItem.border}`}>
                                    {statusCfgItem.label}
                                  </Badge>
                                  {taskStatus === 'scheduled' && task?.scheduledAt && (
                                    <span className="text-[9px] text-zinc-500">{formatScheduledDate(task.scheduledAt)}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {!isConnected ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] text-zinc-500"
                              onClick={() => navigate('/dashboard/settings')}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Connect
                            </Button>
                          ) : taskStatus === 'posted' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              Live
                            </Badge>
                          ) : taskStatus === 'scheduled' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] text-red-400 hover:text-red-300"
                              onClick={() => handleCancelTask(task.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          ) : isScheduling ? (
                            <div className="flex items-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-2">
                                    {scheduleDate ? format(scheduleDate, 'MMM d') : 'Date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="end">
                                  <CalendarComponent
                                    mode="single"
                                    selected={scheduleDate}
                                    onSelect={setScheduleDate}
                                    disabled={(date) => date < new Date()}
                                  />
                                </PopoverContent>
                              </Popover>
                              <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="h-7 px-1.5 text-[10px] bg-zinc-900 border border-zinc-700 rounded text-white w-16"
                              />
                              <Button size="sm" className="h-7 text-[10px] px-2 bg-blue-600" onClick={() => handleSchedule(platform)} disabled={isPosting || !scheduleDate}>
                                {isPosting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Set'}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setSchedulingPlatform(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 px-2"
                                      onClick={() => handlePostNow(platform)}
                                      disabled={isPosting}
                                    >
                                      {isPosting ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" />Post</>}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 text-white border-zinc-700">
                                    Simulate posting to this platform. Connect real OAuth in Settings → Publishing to go live.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] px-2"
                                      onClick={() => setSchedulingPlatform(platform)}
                                      disabled={isPosting}
                                    >
                                      <CalendarClock className="h-3 w-3 mr-1" />
                                      Schedule
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 text-white border-zinc-700">
                                    Set a future date and time to auto-publish. Requires platform connection.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-[#1F2933] my-5" />

              {/* Delete Submission */}
              <div>
                <button
                  onClick={() => handleDeleteSubmission(selected.id)}
                  className="w-full h-9 flex items-center justify-center gap-2 text-xs text-red-500/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-md transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Submission
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
