import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, FolderOpen, ChevronDown, ExternalLink, MoreHorizontal,
  FileVideo, FileAudio, FileImage, FileText as FileTextIcon, FileBox, Link as LinkIcon, Eye, ZoomIn, Play
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ASSET_TYPES = ['Video', 'Audio', 'Thumbnail', 'Transcript', 'Other'];
const ASSET_STATUSES = ['Draft', 'Final'];

const statusCfg = {
  Draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  Final: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const assetTypeIcons = {
  Video: FileVideo,
  Audio: FileAudio,
  Thumbnail: FileImage,
  Transcript: FileTextIcon,
  Other: FileBox,
};

const assetTypeCfg = {
  Video: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Audio: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Thumbnail: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Transcript: 'bg-green-500/10 text-green-400 border-green-500/20',
  Other: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

// Helper to check if URL is a viewable image
const isImageUrl = (url) => {
  if (!url) return false;
  if (url.startsWith('data:image')) return true;
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  // Check for image extensions or unsplash/image hosting
  return imageExts.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('unsplash.com') ||
         lowerUrl.includes('placeholder.com');
};

// Helper to check if URL is a video
const isVideoUrl = (url) => {
  if (!url) return false;
  const videoExts = ['.mp4', '.webm', '.mov', '.avi'];
  const lowerUrl = url.toLowerCase();
  return videoExts.some(ext => lowerUrl.includes(ext)) ||
         lowerUrl.includes('storage.googleapis.com/gtv-videos');
};

export default function AssetsPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preview modal state
  const [previewAsset, setPreviewAsset] = useState(null);

  const fetchAssets = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/assets/library`, { headers: authHeaders }),
      axios.get(`${API}/submissions`, { headers: authHeaders }),
    ])
      .then(([assetsRes, subsRes]) => {
        setAssets(assetsRes.data || []);
        setSubmissions(subsRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleStatusChange = async (assetId, newStatus) => {
    try {
      await axios.patch(`${API}/assets/${assetId}/status`, { status: newStatus }, { headers: authHeaders });
      toast.success(`Asset marked as ${newStatus}`);
      setAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, status: newStatus } : a
      ));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleLinkSubmission = async (assetId, submissionId) => {
    try {
      await axios.patch(`${API}/assets/${assetId}/submission`, { submissionId: submissionId || null }, { headers: authHeaders });
      const subTitle = submissions.find(s => s.id === submissionId)?.title;
      toast.success(submissionId ? `Linked to "${subTitle}"` : 'Unlinked from episode');
      setAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, submissionId, episodeTitle: subTitle || null } : a
      ));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update link');
    }
  };
  
  // Handle preview click - thumbnails show modal, others open in new tab
  const handlePreview = (asset) => {
    if (asset.type === 'Thumbnail' && asset.url) {
      setPreviewAsset(asset);
    } else if (asset.url) {
      window.open(asset.url, '_blank');
    } else {
      toast.info('No preview available');
    }
  };

  // Filter assets
  const filteredAssets = assets.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.name?.toLowerCase().includes(q) && !a.episodeTitle?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div data-testid="assets-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Assets library
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Browse and manage all your media assets.</p>
      </div>

      {/* Filters */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                data-testid="search-input"
                placeholder="Search assets or episodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-type" className="w-[130px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                <SelectItem value="all" className="text-xs text-zinc-300">All Types</SelectItem>
                {ASSET_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-xs text-zinc-300">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status" className="w-[120px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                <SelectItem value="all" className="text-xs text-zinc-300">All Statuses</SelectItem>
                {ASSET_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs text-zinc-300">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-[10px] text-zinc-600 ml-auto">
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="assets-table">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-zinc-400" />
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              All Assets
            </CardTitle>
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 rounded">
              {filteredAssets.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No assets yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Once content is produced, your media files will live here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#1F2933] hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dashed border-zinc-600">Type</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] bg-zinc-900 text-white border-zinc-700">
                          Audio: voiceover files. Video: rendered shorts. Thumbnail: cover images generated by FVS.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Linked Episode</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Created</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map(asset => {
                  const sc = statusCfg[asset.status] || statusCfg.Draft;
                  const tc = assetTypeCfg[asset.type] || assetTypeCfg.Other;
                  const TypeIcon = assetTypeIcons[asset.type] || FileBox;
                  const showPreviewThumb = asset.type === 'Thumbnail' && isImageUrl(asset.url);
                  
                  return (
                    <TableRow
                      key={asset.id}
                      className="border-[#1F2933] hover:bg-white/[0.02]"
                      data-testid={`asset-row-${asset.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Show thumbnail preview for image assets */}
                          {showPreviewThumb ? (
                            <button 
                              onClick={() => handlePreview(asset)}
                              className="relative h-10 w-16 rounded overflow-hidden flex-shrink-0 group cursor-pointer border border-zinc-700 hover:border-pink-500/50 transition-colors"
                              data-testid={`thumb-preview-${asset.id}`}
                            >
                              <img 
                                src={asset.url} 
                                alt={asset.name}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className={`h-10 w-10 rounded flex items-center justify-center shrink-0 ${tc.split(' ')[0]}`}>
                              <TypeIcon className={`h-4 w-4 ${tc.split(' ')[1]}`} />
                            </div>
                          )}
                          <span className="text-sm text-white font-medium truncate max-w-[180px]">{asset.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc}`}>{asset.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              data-testid={`status-trigger-${asset.id}`}
                              className="flex items-center gap-1 group"
                            >
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                                {asset.status}
                              </Badge>
                              <ChevronDown className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-[#0B1120] border-[#1F2933] w-28">
                            {ASSET_STATUSES.map(s => {
                              const cfg = statusCfg[s];
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStatusChange(asset.id, s)}
                                  className={`text-xs cursor-pointer ${asset.status === s ? 'text-white font-medium' : 'text-zinc-400'}`}
                                  data-testid={`set-status-${s.toLowerCase()}-${asset.id}`}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              data-testid={`link-trigger-${asset.id}`}
                              className="flex items-center gap-1 group text-left"
                            >
                              {asset.episodeTitle ? (
                                <span className="text-xs text-zinc-300 truncate max-w-[150px]">{asset.episodeTitle}</span>
                              ) : (
                                <span className="text-xs text-zinc-600 italic">Unlinked</span>
                              )}
                              <ChevronDown className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-[#0B1120] border-[#1F2933] w-56 max-h-60 overflow-y-auto">
                            <DropdownMenuItem
                              onClick={() => handleLinkSubmission(asset.id, null)}
                              className={`text-xs cursor-pointer ${!asset.submissionId ? 'text-white font-medium' : 'text-zinc-400'}`}
                            >
                              <LinkIcon className="h-3 w-3 mr-2 opacity-50" />
                              Unlink
                            </DropdownMenuItem>
                            {submissions.map(sub => (
                              <DropdownMenuItem
                                key={sub.id}
                                onClick={() => handleLinkSubmission(asset.id, sub.id)}
                                className={`text-xs cursor-pointer ${asset.submissionId === sub.id ? 'text-white font-medium' : 'text-zinc-400'}`}
                              >
                                <LinkIcon className="h-3 w-3 mr-2 opacity-50" />
                                <span className="truncate">{sub.title}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-zinc-500">{formatDate(asset.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {asset.status === 'Draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(asset.id, 'Final')}
                              className="h-7 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              data-testid={`mark-final-${asset.id}`}
                            >
                              Mark Final
                            </Button>
                          )}
                          {/* Preview button - opens modal for thumbnails, new tab for others */}
                          {asset.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(asset)}
                              className="h-7 w-7 text-zinc-500 hover:text-indigo-400 hover:bg-white/5"
                              data-testid={`preview-${asset.id}`}
                              title={asset.type === 'Thumbnail' ? 'Preview image' : 'Open in new tab'}
                            >
                              {asset.type === 'Thumbnail' ? (
                                <ZoomIn className="h-3.5 w-3.5" />
                              ) : asset.type === 'Video' ? (
                                <Play className="h-3.5 w-3.5" />
                              ) : (
                                <ExternalLink className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          {/* Deep-link to view the parent submission if available */}
                          {asset.submissionId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/dashboard/submissions/${asset.submissionId}`)}
                              className="h-7 w-7 text-zinc-500 hover:text-indigo-400 hover:bg-white/5"
                              data-testid={`view-submission-${asset.id}`}
                              title="View linked submission"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
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
      
      {/* Thumbnail Preview Modal */}
      <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
        <DialogContent className="bg-[#0B1120] border-[#1F2933] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">{previewAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {previewAsset?.url && (
              <img 
                src={previewAsset.url} 
                alt={previewAsset?.name}
                className="max-w-full max-h-[60vh] rounded-lg object-contain"
              />
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={assetTypeCfg.Thumbnail}>
                {previewAsset?.type}
              </Badge>
              <Badge variant="outline" className={statusCfg[previewAsset?.status]?.bg + ' ' + statusCfg[previewAsset?.status]?.text}>
                {previewAsset?.status}
              </Badge>
              {previewAsset?.episodeTitle && (
                <span className="text-xs text-zinc-400">• {previewAsset.episodeTitle}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(previewAsset?.url, '_blank')}
                className="text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open Full Size
              </Button>
              {previewAsset?.submissionId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewAsset(null);
                    navigate(`/dashboard/submissions/${previewAsset.submissionId}`);
                  }}
                  className="text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Submission
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
