import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  ArrowLeft, FileAudio, FileImage, FileVideo, FileText, 
  Calendar, User, Tag, Clock, ExternalLink, Play,
  Sparkles, Brain, Loader2, Check, Send, Youtube, Instagram,
  X, CalendarClock, Link2, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const platformCfg = {
  youtube_shorts: { 
    label: 'YouTube Shorts', 
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
    border: 'border-pink-500/20'
  },
  instagram_reels: { 
    label: 'Instagram Reels', 
    icon: Instagram, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  },
};

const publishStatusCfg = {
  draft: { label: 'Draft', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  posting: { label: 'Posting', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  posted: { label: 'Posted', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const statusCfg = {
  INTAKE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  EDITING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  DESIGN: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  SCHEDULED: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  PUBLISHED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const typeCfg = {
  Podcast: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Short: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Blog: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Webinar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const assetTypeIcons = {
  Audio: FileAudio,
  Video: FileVideo,
  Thumbnail: FileImage,
  Transcript: FileText,
};

function AssetCard({ asset, onView }) {
  const Icon = assetTypeIcons[asset.type] || FileText;
  const isFvsGenerated = asset.fvsGenerated || asset.name?.toLowerCase().includes('fvs');
  
  return (
    <Card 
      className="bg-[#0B1120] border-[#1F2933] hover:border-indigo-500/30 transition-all cursor-pointer group"
      onClick={() => onView(asset)}
      data-testid={`asset-card-${asset.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white truncate">{asset.name}</h4>
              {isFvsGenerated && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  FVS
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] bg-zinc-800/50 text-zinc-400 border-zinc-700">
                {asset.type}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-zinc-800/50 text-zinc-400 border-zinc-700">
                {asset.status || 'Draft'}
              </Badge>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SubmissionDetailPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [assets, setAssets] = useState([]);
  const [fvsIdea, setFvsIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingThumbnail, setSelectingThumbnail] = useState(null); // ID of thumbnail being selected

  const fetchSubmission = useCallback(async () => {
    if (!token || !submissionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch submission details
      const subRes = await axios.get(`${API}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmission(subRes.data);
      
      // Fetch assets for this submission
      const assetsRes = await axios.get(`${API}/assets/library`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const submissionAssets = assetsRes.data.filter(a => a.submissionId === submissionId);
      setAssets(submissionAssets);
      
      // Try to fetch related FVS idea if this is an FVS-generated submission
      try {
        const ideasRes = await axios.get(`${API}/fvs/ideas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const relatedIdea = ideasRes.data.find(i => i.producedSubmissionId === submissionId);
        if (relatedIdea) {
          setFvsIdea(relatedIdea);
        }
      } catch (e) {
        // FVS idea fetch is optional
      }
      
    } catch (err) {
      console.error('Failed to fetch submission:', err);
      if (err.response?.status === 404) {
        setError('Submission not found');
      } else {
        setError('Failed to load submission details');
      }
      toast.error('Failed to load submission');
    } finally {
      setLoading(false);
    }
  }, [token, submissionId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleViewAsset = (asset) => {
    // Open asset in new tab if URL available
    if (asset.url) {
      // For data URLs, we can still open them
      if (asset.url.startsWith('data:')) {
        // Create a blob and open it
        try {
          const byteString = atob(asset.url.split(',')[1]);
          const mimeString = asset.url.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        } catch (e) {
          toast.error('Could not open asset');
        }
      } else {
        window.open(asset.url, '_blank');
      }
    } else {
      toast.info('Asset URL not available');
    }
  };

  const handleSelectPrimaryThumbnail = async (assetId) => {
    if (selectingThumbnail) return; // Prevent double clicks
    
    // Check if already primary
    if (submission.primaryThumbnailAssetId === assetId) {
      toast.info('This is already the primary thumbnail');
      return;
    }
    
    setSelectingThumbnail(assetId);
    
    try {
      const res = await axios.patch(
        `${API}/submissions/${submissionId}/primary-thumbnail`,
        { assetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setSubmission(prev => ({
        ...prev,
        primaryThumbnailAssetId: assetId
      }));
      
      // Update assets to reflect new primary status
      setAssets(prev => prev.map(a => ({
        ...a,
        isPrimaryThumbnail: a.id === assetId
      })));
      
      toast.success('Primary thumbnail updated!', {
        description: 'This thumbnail will be used for publishing.'
      });
    } catch (err) {
      console.error('Failed to set primary thumbnail:', err);
      toast.error(err.response?.data?.detail || 'Failed to set primary thumbnail');
    } finally {
      setSelectingThumbnail(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="submission-detail-loading">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" data-testid="submission-detail-error">
        <p className="text-zinc-400">{error || 'Submission not found'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const statusStyle = statusCfg[submission.status] || statusCfg.INTAKE;
  const typeStyle = typeCfg[submission.contentType] || typeCfg.Podcast;

  const audioAssets = assets.filter(a => a.type === 'Audio');
  const videoAssets = assets.filter(a => a.type === 'Video');
  const thumbnailAssets = assets.filter(a => a.type === 'Thumbnail');
  const otherAssets = assets.filter(a => !['Audio', 'Video', 'Thumbnail'].includes(a.type));

  return (
    <div className="space-y-6" data-testid="submission-detail-page">
      {/* Header with back navigation */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-white"
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-6 bg-zinc-700" />
        <span className="text-zinc-500 text-sm">Submission Details</span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Submission Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title Card */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-semibold text-white" data-testid="submission-title">
                    {submission.title}
                  </CardTitle>
                  {submission.description && (
                    <CardDescription className="mt-2 text-zinc-400">
                      {submission.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                    {submission.status}
                  </Badge>
                  <Badge variant="outline" className={typeStyle}>
                    {submission.contentType}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                {submission.guest && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Guest: {submission.guest}</span>
                  </div>
                )}
                {submission.releaseDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Release: {new Date(submission.releaseDate).toLocaleDateString()}</span>
                  </div>
                )}
                {submission.priority && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span>Priority: {submission.priority}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assets Section */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white">
                Assets ({assets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {assets.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assets attached to this submission yet.</p>
                </div>
              ) : (
                <>
                  {audioAssets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <FileAudio className="h-4 w-4" />
                        Audio ({audioAssets.length})
                      </h4>
                      <div className="grid gap-3">
                        {audioAssets.map(asset => (
                          <AssetCard key={asset.id} asset={asset} onView={handleViewAsset} />
                        ))}
                      </div>
                    </div>
                  )}

                  {videoAssets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <FileVideo className="h-4 w-4" />
                        Video ({videoAssets.length})
                      </h4>
                      <div className="grid gap-3">
                        {videoAssets.map(asset => (
                          <AssetCard key={asset.id} asset={asset} onView={handleViewAsset} />
                        ))}
                      </div>
                    </div>
                  )}

                  {thumbnailAssets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        Thumbnails ({thumbnailAssets.length})
                        <span className="text-xs text-zinc-500 ml-2">
                          - Click to select primary
                        </span>
                      </h4>
                      {/* Thumbnail Selection Gallery */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {thumbnailAssets.map((asset, idx) => {
                          const isPrimary = asset.id === submission.primaryThumbnailAssetId || asset.isPrimaryThumbnail;
                          const isSelecting = selectingThumbnail === asset.id;
                          
                          return (
                            <div 
                              key={asset.id}
                              className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                                isPrimary 
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20' 
                                  : 'border-zinc-700 hover:border-amber-500/50 hover:ring-1 hover:ring-amber-500/20'
                              } ${isSelecting ? 'opacity-70' : ''}`}
                              onClick={() => handleSelectPrimaryThumbnail(asset.id)}
                              data-testid={`thumbnail-select-${idx + 1}`}
                            >
                              {/* Thumbnail Image */}
                              {asset.url ? (
                                <img 
                                  src={asset.url} 
                                  alt={asset.name}
                                  className="w-full aspect-video object-cover"
                                  onError={(e) => { 
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-full aspect-video bg-zinc-800 items-center justify-center hidden"
                                style={{ display: asset.url ? 'none' : 'flex' }}
                              >
                                <FileImage className="h-8 w-8 text-zinc-600" />
                              </div>
                              
                              {/* Overlay on hover (non-primary) */}
                              {!isPrimary && !isSelecting && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-xs font-medium text-white px-3 py-1.5 bg-amber-500/80 rounded-full">
                                    Set as Primary
                                  </span>
                                </div>
                              )}
                              
                              {/* Loading overlay */}
                              {isSelecting && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                                </div>
                              )}
                              
                              {/* Top badges */}
                              <div className="absolute top-2 left-2 flex gap-1">
                                <Badge 
                                  variant="outline" 
                                  className="bg-black/60 text-white text-[10px] border-none"
                                >
                                  {idx + 1}/{thumbnailAssets.length}
                                </Badge>
                              </div>
                              
                              {/* Primary indicator */}
                              {isPrimary && (
                                <div className="absolute top-2 right-2">
                                  <Badge className="bg-emerald-500 text-white text-[10px] flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Primary
                                  </Badge>
                                </div>
                              )}
                              
                              {/* FVS badge */}
                              {asset.fvsGenerated && !isPrimary && (
                                <div className="absolute top-2 right-2">
                                  <Badge 
                                    variant="outline" 
                                    className="bg-purple-500/80 text-white text-[10px] border-none"
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    FVS
                                  </Badge>
                                </div>
                              )}
                              
                              {/* View button (bottom right) */}
                              <button
                                className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewAsset(asset);
                                }}
                                data-testid={`thumbnail-view-${idx + 1}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Helper text */}
                      <p className="text-[10px] text-zinc-600 mt-2 text-center">
                        Click a thumbnail to set it as the primary image for publishing
                      </p>
                    </div>
                  )}

                  {otherAssets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Other ({otherAssets.length})
                      </h4>
                      <div className="grid gap-3">
                        {otherAssets.map(asset => (
                          <AssetCard key={asset.id} asset={asset} onView={handleViewAsset} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: FVS Info & Quick Actions */}
        <div className="space-y-6">
          {/* FVS Info Card (if applicable) */}
          {fvsIdea && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <CardTitle className="text-base font-medium text-white">
                    FVS Generated
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Original Idea</p>
                  <p className="text-sm text-zinc-300">{fvsIdea.topic}</p>
                </div>
                {fvsIdea.hook && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Hook</p>
                    <p className="text-sm text-zinc-400 italic">"{fvsIdea.hook}"</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  onClick={() => navigate('/dashboard/system')}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  View in FVS System
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-zinc-400 hover:text-white"
                onClick={() => navigate('/dashboard/calendar')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View in Calendar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-zinc-400 hover:text-white"
                onClick={() => navigate('/dashboard/deliverables')}
              >
                <Tag className="h-4 w-4 mr-2" />
                View in Deliverables
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-zinc-400 hover:text-white"
                onClick={() => navigate('/dashboard/assets')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View All Assets
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardContent className="p-4">
              <div className="space-y-2 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Created: {new Date(submission.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Updated: {new Date(submission.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
