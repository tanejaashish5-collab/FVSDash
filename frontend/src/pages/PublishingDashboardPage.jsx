import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import {
  Send, Youtube, Instagram, CheckCircle2, XCircle, Clock, Play, 
  Upload, Video, Image, ExternalLink, RefreshCw, Loader2, AlertTriangle,
  Calendar as CalendarIcon, Eye, Lock, Globe, RotateCcw, X, Sparkles,
  TrendingUp, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { AuraSpinner } from '@/components/animations/AuraSpinner';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// TikTok icon
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Platform config
const platformCfg = {
  youtube: { 
    label: 'YouTube', 
    icon: Youtube, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  },
  tiktok: { 
    label: 'TikTok', 
    icon: TikTokIcon, 
    color: 'text-pink-400', 
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    comingSoon: true
  },
  instagram: { 
    label: 'Instagram', 
    icon: Instagram, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    comingSoon: true
  },
};

// Privacy options
const privacyOptions = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can watch' },
  { value: 'unlisted', label: 'Unlisted', icon: Eye, description: 'Only people with link' },
  { value: 'private', label: 'Private', icon: Lock, description: 'Only you can watch' },
];

// Job status config
const jobStatusCfg = {
  pending: { label: 'Pending', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  uploading: { label: 'Uploading', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  processing: { label: 'Processing', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  live: { label: 'Live', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

// Quota indicator component
function QuotaIndicator({ quota }) {
  if (!quota) return null;
  
  const { used, max, percentUsed, level } = quota;
  const colorClass = level === 'critical' ? 'text-red-400' : level === 'warning' ? 'text-amber-400' : 'text-zinc-400';
  const barClass = level === 'critical' ? 'bg-red-500' : level === 'warning' ? 'bg-amber-500' : 'bg-indigo-500';
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 max-w-[150px]">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className={colorClass}>Quota: {used.toLocaleString()} / {max.toLocaleString()}</span>
          {level !== 'normal' && (
            <AlertTriangle className={`h-3 w-3 ${colorClass}`} />
          )}
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${barClass} transition-all duration-500`} 
            style={{ width: `${Math.min(percentUsed, 100)}%` }} 
          />
        </div>
      </div>
    </div>
  );
}

// Platform Selector
function PlatformSelector({ selected, onChange, oauthStatus }) {
  return (
    <div className="flex items-center gap-2">
      {Object.entries(platformCfg).map(([key, cfg]) => {
        const Icon = cfg.icon;
        const isConnected = oauthStatus[key]?.connected;
        const isSelected = selected === key;
        const isDisabled = cfg.comingSoon || !isConnected;
        
        return (
          <button
            key={key}
            onClick={() => !isDisabled && onChange(key)}
            disabled={isDisabled}
            className={`relative p-3 rounded-lg border transition-all ${
              isSelected 
                ? `${cfg.bg} ${cfg.border}` 
                : isDisabled
                  ? 'border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed'
                  : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-600'
            }`}
            data-testid={`platform-select-${key}`}
          >
            <Icon className={`h-5 w-5 ${isSelected ? cfg.color : 'text-zinc-500'}`} />
            {isConnected && !cfg.comingSoon && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0B1120]" />
            )}
            {cfg.comingSoon && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <span className="text-[7px] bg-zinc-800 text-zinc-400 px-1 rounded">Soon</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Content Queue Item
function QueueItem({ item, onPublish }) {
  const hasVideo = item.hasVideoAsset;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-[#1F2933] bg-[#060c17] hover:border-indigo-500/20 transition-colors"
      data-testid={`queue-item-${item.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              {item.contentType}
            </Badge>
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
              {item.status}
            </Badge>
            {item.existingJob?.status === 'live' && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                Published
              </Badge>
            )}
          </div>
          <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
          {item.guest && <p className="text-xs text-zinc-500 mt-0.5">w/ {item.guest}</p>}
          {item.releaseDate && (
            <p className="text-xs text-zinc-500 mt-1">
              <CalendarIcon className="h-3 w-3 inline mr-1" />
              {format(new Date(item.releaseDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {hasVideo ? (
            <Button
              size="sm"
              onClick={() => onPublish(item)}
              disabled={item.existingJob?.status === 'live'}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
              data-testid={`publish-btn-${item.id}`}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {item.existingJob?.status === 'live' ? 'Published' : 'Publish Now'}
            </Button>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              No Video
            </Badge>
          )}
          {item.videoAssets?.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              {item.videoAssets.length} video{item.videoAssets.length !== 1 ? 's' : ''} available
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// History Item
function HistoryItem({ job }) {
  const statusCfg = jobStatusCfg[job.status] || jobStatusCfg.pending;
  const cfg = platformCfg[job.platform] || platformCfg.youtube;
  const Icon = cfg.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-[#1F2933] bg-[#060c17]"
      data-testid={`history-item-${job.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{job.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
              <span className="text-[10px] text-zinc-500">
                {job.publishedAt ? format(new Date(job.publishedAt), 'MMM d, yyyy h:mm a') : ''}
              </span>
            </div>
          </div>
        </div>
        
        {job.platformUrl && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-white"
          >
            <a href={job.platformUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Failed Job Item
function FailedJobItem({ job, onRetry }) {
  const cfg = platformCfg[job.platform] || platformCfg.youtube;
  const Icon = cfg.icon;
  const [retrying, setRetrying] = useState(false);
  
  const handleRetry = async () => {
    setRetrying(true);
    await onRetry(job.id);
    setRetrying(false);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-red-500/20 bg-red-500/5"
      data-testid={`failed-item-${job.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{job.title}</h4>
            <p className="text-xs text-red-400 mt-0.5">{job.errorMessage || 'Upload failed'}</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
          className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-white"
          data-testid={`retry-btn-${job.id}`}
        >
          {retrying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export default function PublishingDashboardPage() {
  const { user, authHeaders, buildApiUrl } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [oauthStatus, setOauthStatus] = useState({});
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [failedJobs, setFailedJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  
  // Publish slide-over state
  const [publishItem, setPublishItem] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');
  const [publishForm, setPublishForm] = useState({
    title: '',
    description: '',
    tags: '',
    privacyStatus: 'public',
    scheduleEnabled: false,
    scheduledDate: null,
    selectedVideoId: null,
    selectedThumbnailId: null,
  });
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(null);
  const pollIntervalRef = useRef(null);
  
  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!authHeaders) return;
    setLoading(true);
    
    try {
      const [oauthRes, queueRes, historyRes, failedRes, statsRes] = await Promise.all([
        axios.get(buildApiUrl(`${API}/oauth/status`), { headers: authHeaders }),
        axios.get(buildApiUrl(`${API}/publish/queue`), { headers: authHeaders }),
        axios.get(buildApiUrl(`${API}/publish/history`), { headers: authHeaders }),
        axios.get(buildApiUrl(`${API}/publish/jobs?status=failed`), { headers: authHeaders }),
        axios.get(buildApiUrl(`${API}/publish/stats`), { headers: authHeaders }),
      ]);
      
      setOauthStatus(oauthRes.data || {});
      setQueue(queueRes.data || []);
      setHistory(historyRes.data || []);
      setFailedJobs(failedRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Failed to load publishing data:', err);
      toast.error('Failed to load publishing data');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, buildApiUrl]);
  
  useEffect(() => { fetchData(); }, [fetchData]);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
  // Open publish slide-over
  const handleOpenPublish = (item) => {
    setPublishItem(item);
    setPublishForm({
      title: item.title || '',
      description: item.notes || item.description || '',
      tags: '',
      privacyStatus: 'public',
      scheduleEnabled: false,
      scheduledDate: null,
      selectedVideoId: item.videoAssets?.[0]?.id || null,
      selectedThumbnailId: item.thumbnailAssets?.[0]?.id || null,
    });
    setPublishProgress(null);
  };
  
  // Close publish slide-over
  const handleClosePublish = () => {
    setPublishItem(null);
    setPublishProgress(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };
  
  // Poll job status
  const pollJobStatus = async (jobId) => {
    try {
      const res = await axios.get(buildApiUrl(`${API}/publish/status/${jobId}`), { headers: authHeaders });
      const job = res.data;
      
      setPublishProgress(job);
      
      if (job.status === 'live') {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Published! <a href={job.platformUrl} target="_blank" rel="noopener noreferrer" className="underline">View on YouTube →</a></span>
          </div>
        );
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        fetchData();
      } else if (job.status === 'failed') {
        toast.error(`Upload failed: ${job.errorMessage || 'Unknown error'}`);
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        fetchData();
      }
    } catch (err) {
      console.error('Failed to poll job status:', err);
    }
  };
  
  // Submit publish
  const handlePublish = async () => {
    if (!publishItem || !publishForm.selectedVideoId) {
      toast.error('Please select a video to publish');
      return;
    }
    
    // Check if YouTube is connected
    if (!oauthStatus.youtube?.connected) {
      toast.error('Please connect YouTube in Settings first');
      return;
    }
    
    setPublishing(true);
    
    try {
      const payload = {
        submissionId: publishItem.id,
        videoAssetId: publishForm.selectedVideoId,
        title: publishForm.title.substring(0, 100),
        description: publishForm.description.substring(0, 5000),
        tags: publishForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        privacyStatus: publishForm.privacyStatus,
        scheduledPublishAt: publishForm.scheduleEnabled && publishForm.scheduledDate 
          ? publishForm.scheduledDate.toISOString() 
          : null,
        thumbnailAssetId: publishForm.selectedThumbnailId,
      };
      
      const res = await axios.post(
        buildApiUrl(`${API}/publish/youtube`),
        payload,
        { headers: authHeaders }
      );
      
      const job = res.data;
      setPublishProgress({ ...job, progress: 0 });
      
      // Start polling
      toast.info('Uploading video...');
      pollIntervalRef.current = setInterval(() => pollJobStatus(job.id), 1500);
      
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start upload');
    } finally {
      setPublishing(false);
    }
  };
  
  // Retry failed job
  const handleRetryJob = async (jobId) => {
    try {
      await axios.post(buildApiUrl(`${API}/publish/jobs/${jobId}/retry`), {}, { headers: authHeaders });
      toast.info('Retrying upload...');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to retry');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <AuraSpinner size="md" />
      </div>
    );
  }
  
  const hasConnectedPlatforms = Object.values(oauthStatus).some(p => p.connected);
  
  return (
    <div data-testid="publishing-dashboard" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <AuraTooltip content={tooltipContent.publishing?.overview || "Manage your content distribution across platforms"} position="right">
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Publishing Command Center
            </h1>
          </AuraTooltip>
          <p className="text-sm text-zinc-500 mt-0.5">Upload and schedule content to your connected platforms.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {stats?.quota && <QuotaIndicator quota={stats.quota} />}
          <PlatformSelector 
            selected={selectedPlatform} 
            onChange={setSelectedPlatform}
            oauthStatus={oauthStatus}
          />
        </div>
      </div>
      
      {/* Not Connected Warning */}
      {!hasConnectedPlatforms && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm text-amber-300 font-medium">No platforms connected</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Connect your YouTube account in Settings to start publishing.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/settings')}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                Connect Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-[#0B1120] border-[#1F2933] glass-flutter">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Total Published</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.live || 0} duration={1.5} />
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0B1120] border-[#1F2933] glass-flutter">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">In Queue</span>
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={queue.length || 0} duration={1.5} />
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0B1120] border-[#1F2933] glass-flutter">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Uploading</span>
                <Upload className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.uploading || 0} duration={1.5} />
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0B1120] border-[#1F2933] glass-flutter">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Failed</span>
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.failed || 0} duration={1.5} />
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content Tabs */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-3">
            <TabsList className="bg-zinc-900/50">
              <TabsTrigger value="queue" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Content Queue
                {queue.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-indigo-500/20 text-indigo-400">
                    {queue.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Published
              </TabsTrigger>
              <TabsTrigger value="failed" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Failed
                {failedJobs.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-red-500/20 text-red-400">
                    {failedJobs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent>
            <TabsContent value="queue" className="mt-0 space-y-3">
              {queue.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No content ready to publish</p>
                  <p className="text-xs text-zinc-600 mt-1">Approved submissions will appear here.</p>
                </div>
              ) : (
                queue.map(item => (
                  <QueueItem key={item.id} item={item} onPublish={handleOpenPublish} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-0 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No published content yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Your published videos will appear here.</p>
                </div>
              ) : (
                history.map(job => (
                  <HistoryItem key={job.id} job={job} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="failed" className="mt-0 space-y-3">
              {failedJobs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-emerald-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No failed uploads</p>
                  <p className="text-xs text-zinc-600 mt-1">All your uploads are successful!</p>
                </div>
              ) : (
                failedJobs.map(job => (
                  <FailedJobItem key={job.id} job={job} onRetry={handleRetryJob} />
                ))
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      
      {/* Publish Slide-Over */}
      <Sheet open={!!publishItem} onOpenChange={(open) => !open && handleClosePublish()}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-[480px] sm:w-[520px] overflow-y-auto">
          {publishItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Publish to {platformCfg[selectedPlatform]?.label || 'YouTube'}
                </SheetTitle>
                <SheetDescription className="text-zinc-500 text-xs">
                  Configure your upload settings
                </SheetDescription>
              </SheetHeader>
              
              {/* Upload Progress */}
              {publishProgress && (
                <div className="mb-6 p-4 rounded-lg bg-zinc-900/50 border border-[#1F2933]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-300">{jobStatusCfg[publishProgress.status]?.label || 'Processing'}</span>
                    <span className="text-xs text-zinc-500">{publishProgress.progress}%</span>
                  </div>
                  <Progress value={publishProgress.progress} className="h-2" />
                  {publishProgress.status === 'live' && publishProgress.platformUrl && (
                    <a 
                      href={publishProgress.platformUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View on YouTube
                    </a>
                  )}
                </div>
              )}
              
              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-zinc-400">Title</Label>
                  <Input
                    value={publishForm.title}
                    onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                    maxLength={100}
                    className="bg-zinc-900/50 border-zinc-700 text-white"
                    data-testid="publish-title-input"
                  />
                  <p className="text-[10px] text-zinc-500 text-right">{publishForm.title.length}/100</p>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-zinc-400">Description</Label>
                  <Textarea
                    value={publishForm.description}
                    onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                    maxLength={5000}
                    rows={4}
                    className="bg-zinc-900/50 border-zinc-700 text-white resize-none"
                    data-testid="publish-description-input"
                  />
                  <p className="text-[10px] text-zinc-500 text-right">{publishForm.description.length}/5000</p>
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-zinc-400">Tags (comma-separated)</Label>
                  <Input
                    value={publishForm.tags}
                    onChange={(e) => setPublishForm({ ...publishForm, tags: e.target.value })}
                    placeholder="shorts, podcast, tips"
                    className="bg-zinc-900/50 border-zinc-700 text-white"
                    data-testid="publish-tags-input"
                  />
                </div>
                
                {/* Privacy */}
                <div className="space-y-2">
                  <Label className="text-zinc-400">Privacy</Label>
                  <div className="flex gap-2">
                    {privacyOptions.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setPublishForm({ ...publishForm, privacyStatus: opt.value })}
                          className={`flex-1 p-3 rounded-lg border transition-all ${
                            publishForm.privacyStatus === opt.value
                              ? 'border-indigo-500/50 bg-indigo-500/10'
                              : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-600'
                          }`}
                          data-testid={`privacy-${opt.value}`}
                        >
                          <Icon className={`h-4 w-4 mx-auto mb-1 ${publishForm.privacyStatus === opt.value ? 'text-indigo-400' : 'text-zinc-500'}`} />
                          <p className={`text-xs ${publishForm.privacyStatus === opt.value ? 'text-white' : 'text-zinc-400'}`}>
                            {opt.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Schedule Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-zinc-900/30">
                  <div>
                    <p className="text-sm text-white">Schedule for later</p>
                    <p className="text-xs text-zinc-500">Set a specific publish time</p>
                  </div>
                  <Switch
                    checked={publishForm.scheduleEnabled}
                    onCheckedChange={(checked) => setPublishForm({ ...publishForm, scheduleEnabled: checked })}
                    data-testid="schedule-toggle"
                  />
                </div>
                
                {/* Date Picker */}
                {publishForm.scheduleEnabled && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Scheduled Date & Time</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-zinc-900/50 border-zinc-700 text-white"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                          {publishForm.scheduledDate 
                            ? format(publishForm.scheduledDate, 'PPP p') 
                            : 'Pick a date'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#0B1120] border-[#1F2933]">
                        <Calendar
                          mode="single"
                          selected={publishForm.scheduledDate}
                          onSelect={(date) => setPublishForm({ ...publishForm, scheduledDate: date })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                
                {/* Video Selection */}
                {publishItem.videoAssets?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Select Video</Label>
                    <div className="grid gap-2">
                      {publishItem.videoAssets.map(asset => (
                        <button
                          key={asset.id}
                          onClick={() => setPublishForm({ ...publishForm, selectedVideoId: asset.id })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            publishForm.selectedVideoId === asset.id
                              ? 'border-indigo-500/50 bg-indigo-500/10'
                              : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Video className={`h-4 w-4 ${publishForm.selectedVideoId === asset.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{asset.title || 'Video'}</p>
                              {asset.duration && (
                                <p className="text-xs text-zinc-500">{Math.round(asset.duration)}s</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Thumbnail Selection */}
                {publishItem.thumbnailAssets?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Custom Thumbnail (optional)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {publishItem.thumbnailAssets.map(asset => (
                        <button
                          key={asset.id}
                          onClick={() => setPublishForm({ 
                            ...publishForm, 
                            selectedThumbnailId: publishForm.selectedThumbnailId === asset.id ? null : asset.id 
                          })}
                          className={`aspect-video rounded-lg border overflow-hidden transition-all ${
                            publishForm.selectedThumbnailId === asset.id
                              ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                              : 'border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          {asset.url ? (
                            <img src={asset.url} alt="Thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <Image className="h-4 w-4 text-zinc-600" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator className="bg-zinc-800 my-6" />
              
              {/* Publish Button */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClosePublish}
                  className="flex-1 border-zinc-700 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !publishForm.selectedVideoId || publishProgress?.status === 'live'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  data-testid="publish-submit-btn"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Youtube className="h-4 w-4 mr-2" />
                  )}
                  {publishProgress?.status === 'live' ? 'Published!' : 'Publish to YouTube'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
