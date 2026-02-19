import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Search, BookOpen, Calendar, Tag, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const tagColors = {
  strategy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  content: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  podcast: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  AI: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  production: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  technology: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  analytics: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  growth: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  audio: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'getting-started': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

export default function BlogPage() {
  const { authHeaders } = useAuth();
  const [posts, setPosts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/blog/posts`, { headers: authHeaders }),
      axios.get(`${API}/blog/tags`, { headers: authHeaders }),
    ])
      .then(([postsRes, tagsRes]) => {
        setPosts(postsRes.data || []);
        setAllTags(tagsRes.data || []);
      })
      .catch(err => {
        toast.error('Failed to load blog posts');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter posts
  const filteredPosts = posts.filter(post => {
    // Tag filter
    if (selectedTag && !post.tags?.includes(selectedTag)) return false;
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!post.title?.toLowerCase().includes(q) && !post.excerpt?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTagColor = (tag) => tagColors[tag] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

  return (
    <div data-testid="blog-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <AuraTooltip content={tooltipContent.blog.generateWithAi} position="right">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Insights & Blog
          </h1>
        </AuraTooltip>
        <p className="text-sm text-zinc-500 mt-0.5">Best practices for content, AI, and analytics.</p>
      </div>

      {/* Filters */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-zinc-950 border-zinc-800 text-white"
                data-testid="search-posts"
              />
            </div>

            {/* Tag filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-500">
                <Tag className="h-3 w-3 inline mr-1" />
                Filter:
              </span>
              {selectedTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTag(null)}
                  className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                    selectedTag === tag
                      ? getTagColor(tag)
                      : 'border-[#1F2933] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                  }`}
                  data-testid={`tag-filter-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-zinc-600 ml-auto">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="bg-[#0B1120] border-[#1F2933]">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No posts found.</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your search or filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map(post => (
            <Card
              key={post.id}
              className="bg-[#0B1120] border-[#1F2933] hover:border-indigo-500/30 transition-colors cursor-pointer group"
              onClick={() => setSelectedPost(post)}
              data-testid={`post-card-${post.slug}`}
            >
              <CardContent className="p-5">
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags?.slice(0, 3).map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${getTagColor(tag)}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Title */}
                <AuraTooltip content={tooltipContent.blog.blogTitle} position="top">
                  <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {post.title}
                  </h3>
                </AuraTooltip>

                {/* Excerpt */}
                <AuraTooltip content={tooltipContent.blog.excerpt} position="top">
                  <p className="text-xs text-zinc-400 line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                </AuraTooltip>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(post.publishedAt)}
                  </div>
                  <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Read more
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Post Detail Sheet */}
      <Sheet open={!!selectedPost} onOpenChange={(open) => { if (!open) setSelectedPost(null); }}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-full sm:w-[600px] sm:max-w-[90vw] overflow-y-auto">
          {selectedPost && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedPost.tags?.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${getTagColor(tag)}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <SheetTitle className="text-white text-xl leading-tight pr-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {selectedPost.title}
                </SheetTitle>
                <SheetDescription className="text-zinc-500 text-xs flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(selectedPost.publishedAt)}
                </SheetDescription>
              </SheetHeader>

              <Separator className="bg-[#1F2933] my-4" />

              {/* Excerpt */}
              <p className="text-sm text-zinc-300 italic mb-6 p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]">
                {selectedPost.excerpt}
              </p>

              {/* Content */}
              <div 
                className="prose prose-sm prose-invert max-w-none text-zinc-300
                  prose-headings:text-white prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
                  prose-h2:text-lg prose-h3:text-base
                  prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:mb-4
                  prose-strong:text-white prose-strong:font-semibold
                  prose-ul:my-3 prose-ul:space-y-1 prose-li:text-zinc-300
                  prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline"
                data-testid="post-content"
              >
                {selectedPost.content?.split('\n').map((paragraph, i) => {
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={i}>{paragraph.replace('## ', '')}</h2>;
                  }
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={i}>{paragraph.replace('### ', '')}</h3>;
                  }
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return <p key={i}><strong>{paragraph.replace(/\*\*/g, '')}</strong></p>;
                  }
                  if (paragraph.startsWith('- [ ] ')) {
                    return <li key={i} className="list-none flex items-center gap-2">
                      <span className="h-4 w-4 rounded border border-zinc-600 shrink-0" />
                      {paragraph.replace('- [ ] ', '')}
                    </li>;
                  }
                  if (paragraph.startsWith('- ')) {
                    return <li key={i}>{paragraph.replace('- ', '')}</li>;
                  }
                  if (paragraph.trim() === '') {
                    return <br key={i} />;
                  }
                  // Handle inline bold
                  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i}>
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.replace(/\*\*/g, '')}</strong>;
                        }
                        return part;
                      })}
                    </p>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
