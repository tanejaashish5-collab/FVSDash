/**
 * CommentIntelligencePanel — YouTube comment mining for content ideas.
 *
 * Paste a YouTube URL → fetches + analyses comments → returns themes,
 * audience questions, pain points, and content idea suggestions.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, MessageSquare, Lightbulb, HelpCircle,
  TrendingUp, Smile, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FREQ_CFG = {
  high:   'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const TYPE_CFG = {
  Short:       'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Tutorial:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Deep-dive': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function CommentIntelligencePanel({ onAddIdea }) {
  const { authHeaders } = useAuth();
  const [url, setUrl]       = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [open, setOpen]       = useState(true);

  const handleAnalyse = async () => {
    if (!url.trim()) { toast.error('Enter a YouTube URL'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(
        `${API}/ai/analyze-comments`,
        { videoUrl: url.trim() },
        { headers: authHeaders },
      );
      setResult(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
  };

  return (
    <div className="border border-[#1F2933] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs font-medium text-zinc-300">YouTube Comment Intelligence</span>
          {result?.isMocked && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
              demo
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
      </button>

      {open && (
        <div className="border-t border-[#1F2933] p-3 space-y-3">
          {/* URL input */}
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
              placeholder="https://youtube.com/watch?v=..."
              className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 flex-1"
            />
            <Button
              size="sm"
              onClick={handleAnalyse}
              disabled={loading}
              className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 shrink-0"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Analyse'}
            </Button>
          </div>

          {result && (
            <ScrollArea className="max-h-[460px]">
              <div className="space-y-4 pr-1">

                {/* Top request callout */}
                {result.topRequest && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1">
                      #1 audience request
                    </p>
                    <p className="text-xs text-white font-medium">{result.topRequest}</p>
                  </div>
                )}

                {/* Sentiment */}
                {result.sentiment && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Smile className="h-3 w-3 text-zinc-400" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Sentiment</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { k: 'positive', color: 'bg-emerald-500', label: 'Positive' },
                        { k: 'neutral',  color: 'bg-zinc-500',    label: 'Neutral' },
                        { k: 'negative', color: 'bg-red-500',     label: 'Negative' },
                      ].map(({ k, color, label }) => (
                        <div key={k} className="flex-1">
                          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden mb-1">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${result.sentiment[k] ?? 0}%` }} />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[9px] text-zinc-600">{label}</span>
                            <span className="text-[9px] text-zinc-500">{result.sentiment[k] ?? 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Themes */}
                {result.themes?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="h-3 w-3 text-zinc-400" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Recurring Themes</span>
                    </div>
                    <div className="space-y-1.5">
                      {result.themes.map((t, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 bg-zinc-900/50 rounded px-2.5 py-1.5">
                          <div className="min-w-0">
                            <span className="text-xs text-zinc-300">{t.theme}</span>
                            {t.example && <p className="text-[10px] text-zinc-600 italic mt-0.5 line-clamp-1">"{t.example}"</p>}
                          </div>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 shrink-0 ${FREQ_CFG[t.frequency] || FREQ_CFG.medium}`}>
                            {t.frequency}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audience questions */}
                {result.audienceQuestions?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <HelpCircle className="h-3 w-3 text-zinc-400" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Audience Questions</span>
                    </div>
                    <div className="space-y-1">
                      {result.audienceQuestions.map((q, i) => (
                        <div key={i} className="flex items-start gap-2 group">
                          <span className="text-[10px] text-zinc-600 mt-0.5 shrink-0">{i + 1}.</span>
                          <span className="text-xs text-zinc-400 flex-1">{q}</span>
                          <button
                            onClick={() => copy(q)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-400"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content ideas */}
                {result.contentIdeas?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Content Ideas</span>
                    </div>
                    <div className="space-y-2">
                      {result.contentIdeas.map((idea, i) => (
                        <div key={i} className="bg-zinc-900/50 border border-[#1F2933] rounded-lg px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs text-white font-medium flex-1">{idea.title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${TYPE_CFG[idea.type] || TYPE_CFG.Short}`}>
                                {idea.type}
                              </Badge>
                              {onAddIdea && (
                                <button
                                  onClick={() => { onAddIdea(idea.title); toast.success('Idea added to studio'); }}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                                >
                                  + Use
                                </button>
                              )}
                            </div>
                          </div>
                          {idea.rationale && (
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{idea.rationale}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
