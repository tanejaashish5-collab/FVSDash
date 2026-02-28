/**
 * Published — library of all published YouTube Shorts.
 * Shows imported YouTube videos + anything manually pushed to PUBLISHED.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Youtube, Eye, ThumbsUp, ExternalLink, Film } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function fmt(n) {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function PublishedPage() {
  const { authHeaders } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authHeaders) return;
    axios.get(`${API}/submissions?status=PUBLISHED`, { headers: authHeaders })
      .then(res => setItems(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = items.filter(item =>
    !search || item.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto" data-testid="published-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Published
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {items.length} published short{items.length !== 1 ? 's' : ''} from your YouTube channel
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search titles…"
            className="pl-8 h-9 w-64 bg-zinc-900 border-zinc-700 text-white text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Film className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            {items.length === 0
              ? 'No published Shorts yet. Go to Settings → Publishing and click Sync Channel.'
              : 'No results match your search.'}
          </p>
          {items.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs border-zinc-700 text-zinc-400 hover:text-white"
              onClick={() => window.location.href = '/dashboard/settings'}
            >
              Go to Settings →
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => {
            const thumb = item.youtubeThumbnailUrl || item.thumbnailUrl;
            const ytUrl = item.youtubeVideoId
              ? `https://www.youtube.com/shorts/${item.youtubeVideoId}`
              : item.youtubeUrl;
            const views = item.youtubeViewCount ?? item.views;
            const likes = item.youtubeLikeCount ?? item.likes;

            return (
              <div key={item.id}
                className="group bg-[#0B1120] border border-[#1F2933] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all duration-200">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-8 w-8 text-zinc-700" />
                    </div>
                  )}
                  {item.importedFromYoutube && (
                    <Badge className="absolute top-2 left-2 text-[9px] bg-red-500/80 text-white border-0 px-1.5">
                      <Youtube className="h-2.5 w-2.5 mr-1" /> YouTube
                    </Badge>
                  )}
                  {ytUrl && (
                    <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <ExternalLink className="h-6 w-6 text-white" />
                    </a>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-medium text-white leading-snug line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    {views != null && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {fmt(views)}
                      </span>
                    )}
                    {likes != null && (
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {fmt(likes)}
                      </span>
                    )}
                    {item.publishedAt || item.createdAt ? (
                      <span>{new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
