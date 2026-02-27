import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, FileBox, ChevronDown, ExternalLink, FileVideo, FileAudio, FileImage, FileText as FileTextIcon } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DELIVERABLE_TYPES = ['Video', 'Audio', 'Thumbnail', 'Transcript', 'Other'];
const DELIVERABLE_STATUSES = ['Draft', 'Final'];
const CONTENT_TYPES = ['Podcast', 'Short', 'Blog', 'Webinar', 'Other'];

const statusCfg = {
  Draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  Final: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const typeCfg = {
  Podcast: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Short: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Blog: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Webinar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Other: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const deliverableTypeIcons = {
  Video: FileVideo,
  Audio: FileAudio,
  Thumbnail: FileImage,
  Transcript: FileTextIcon,
  Other: FileBox,
};

export default function DeliverablesPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();

  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterContentType, setFilterContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDeliverables = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/deliverables`, { headers: authHeaders })
      .then(res => setDeliverables(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { fetchDeliverables(); }, [fetchDeliverables]);

  const handleStatusChange = async (assetId, newStatus) => {
    try {
      await axios.patch(`${API}/assets/${assetId}/status`, { status: newStatus }, { headers: authHeaders });
      toast.success('Deliverable status updated');
      // Update local state
      setDeliverables(prev => prev.map(d => 
        d.assetId === assetId ? { ...d, deliverableStatus: newStatus } : d
      ));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  // Filter deliverables
  const filteredDeliverables = deliverables.filter(d => {
    if (filterType !== 'all' && d.deliverableType !== filterType) return false;
    if (filterStatus !== 'all' && d.deliverableStatus !== filterStatus) return false;
    if (filterContentType !== 'all' && d.contentType !== filterContentType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.episodeTitle?.toLowerCase().includes(q) && !d.deliverableName?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div data-testid="deliverables-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <AuraTooltip content={tooltipContent.deliverables.deliverableStatus} position="right">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Deliverables
          </h1>
        </AuraTooltip>
        <p className="text-sm text-zinc-500 mt-0.5">Track assets for each episode and their production status.</p>
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
                placeholder="Search episodes or assets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-deliverable-type" className="w-[130px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                <SelectItem value="all" className="text-xs text-zinc-300">All Types</SelectItem>
                {DELIVERABLE_TYPES.map(t => (
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
                {DELIVERABLE_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs text-zinc-300">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterContentType} onValueChange={setFilterContentType}>
              <SelectTrigger data-testid="filter-content-type" className="w-[130px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                <SelectItem value="all" className="text-xs text-zinc-300">All Content</SelectItem>
                {CONTENT_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-xs text-zinc-300">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-[10px] text-zinc-600 ml-auto">
              {filteredDeliverables.length} deliverable{filteredDeliverables.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="deliverables-table">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileBox className="h-4 w-4 text-zinc-400" />
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              All Deliverables
            </CardTitle>
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 rounded">
              {filteredDeliverables.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDeliverables.length === 0 ? (
            <div className="text-center py-12">
              <FileBox className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No deliverables yet.</p>
              <p className="text-xs text-zinc-600 mt-1">As episodes move through production, their assets will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#1F2933] hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Episode</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Deliverable</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <AuraTooltip content={tooltipContent.deliverables.deliverableType} position="top">
                      <span>Type</span>
                    </AuraTooltip>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <AuraTooltip content={tooltipContent.deliverables.markComplete} position="top">
                      <span>Status</span>
                    </AuraTooltip>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Content</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <AuraTooltip content={tooltipContent.deliverables.dueDate} position="top">
                      <span>Release</span>
                    </AuraTooltip>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliverables.map(d => {
                  const sc = statusCfg[d.deliverableStatus] || statusCfg.Draft;
                  const tc = typeCfg[d.contentType] || typeCfg.Other;
                  const TypeIcon = deliverableTypeIcons[d.deliverableType] || FileBox;
                  
                  return (
                    <TableRow
                      key={d.assetId}
                      className="border-[#1F2933] hover:bg-white/[0.02] cursor-pointer"
                      data-testid={`deliverable-row-${d.assetId}`}
                      onClick={() => d.submissionId && navigate(`/dashboard/submissions/${d.submissionId}`)}
                    >
                      <TableCell>
                        {/* Clicking a deliverable row deep-links to the parent Submission details page */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            d.submissionId && navigate(`/dashboard/submissions/${d.submissionId}`);
                          }}
                          className={`text-sm font-medium truncate max-w-[180px] block text-left ${
                            d.submissionId ? 'text-white hover:text-indigo-400 transition-colors' : 'text-zinc-500'
                          }`}
                          disabled={!d.submissionId}
                          data-testid={`episode-link-${d.assetId}`}
                        >
                          {d.episodeTitle}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <TypeIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <span className="text-sm text-zinc-300 truncate max-w-[160px]">{d.deliverableName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-400">{d.deliverableType}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              data-testid={`status-trigger-${d.assetId}`}
                              className="flex items-center gap-1 group"
                            >
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                                {d.deliverableStatus}
                              </Badge>
                              <ChevronDown className="h-2.5 w-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-[#0B1120] border-[#1F2933] w-28">
                            {DELIVERABLE_STATUSES.map(s => {
                              const cfg = statusCfg[s];
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStatusChange(d.assetId, s)}
                                  className={`text-xs cursor-pointer ${d.deliverableStatus === s ? 'text-white font-medium' : 'text-zinc-400'}`}
                                  data-testid={`set-status-${s.toLowerCase()}-${d.assetId}`}
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
                        {d.contentType && d.contentType !== '—' ? (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc}`}>{d.contentType}</Badge>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-zinc-500">{d.releaseDate || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/5 text-zinc-500 hover:text-indigo-400 transition-colors"
                            data-testid={`open-url-${d.assetId}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
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
  );
}
