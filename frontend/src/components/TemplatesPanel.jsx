/**
 * TemplatesPanel — Content script template gallery.
 *
 * Props:
 *   onApply(template)  — called when user clicks "Use Template"
 *   onClose()          — called when user dismisses the panel
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, BookOpen, Zap, Star, X, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_CFG = {
  hook:        { label: 'Hook',        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  'full-script':{ label: 'Full Script', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  'story-arc': { label: 'Story Arc',   color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  cta:         { label: 'CTA',         color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

const FORMAT_CFG = {
  short:   'bg-pink-500/10 text-pink-400 border-pink-500/20',
  podcast: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  blog:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function TemplatesPanel({ onApply, onClose }) {
  const { authHeaders } = useAuth();
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFormat, setActiveFormat]     = useState('all');
  const [preview, setPreview]       = useState(null); // template being previewed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/templates`, { headers: authHeaders });
      setTemplates(res.data || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (tmpl) => {
    try {
      await axios.patch(`${API}/templates/${tmpl.id}/use`, {}, { headers: authHeaders });
    } catch {
      // non-critical
    }
    onApply?.(tmpl);
    toast.success(`Template "${tmpl.name}" applied`);
  };

  const handleDelete = async (tmpl, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete template "${tmpl.name}"?`)) return;
    try {
      await axios.delete(`${API}/templates/${tmpl.id}`, { headers: authHeaders });
      setTemplates(prev => prev.filter(t => t.id !== tmpl.id));
      if (preview?.id === tmpl.id) setPreview(null);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const visible = templates.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (activeFormat !== 'all' && t.format !== activeFormat) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase()) &&
        !t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const categories = ['all', ...new Set(templates.map(t => t.category))];
  const formats    = ['all', ...new Set(templates.map(t => t.format))];

  return (
    <div className="flex flex-col h-full bg-[#0B1120] border border-[#1F2933] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2933]">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Script Templates
          </span>
          <span className="text-[10px] text-zinc-500 font-mono bg-zinc-800/50 px-1.5 rounded">
            {visible.length}
          </span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-2.5 border-b border-[#1F2933] space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-8 h-7 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_CFG[cat]?.label || cat}
            </button>
          ))}
          {formats.filter(f => f !== 'all').map(fmt => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(activeFormat === fmt ? 'all' : fmt)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                activeFormat === fmt
                  ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Template list */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-xs">No templates match your filters.</div>
          ) : (
            <div className="p-3 space-y-1.5">
              {visible.map(tmpl => {
                const catCfg  = CATEGORY_CFG[tmpl.category] || { label: tmpl.category, color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
                const fmtCls  = FORMAT_CFG[tmpl.format] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
                const isUser  = tmpl.clientId !== 'system';
                const isPreviewing = preview?.id === tmpl.id;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setPreview(isPreviewing ? null : tmpl)}
                    className={`group relative rounded-lg border p-3 cursor-pointer transition-all ${
                      isPreviewing
                        ? 'border-indigo-500/50 bg-indigo-500/5'
                        : 'border-[#1F2933] hover:border-zinc-700 bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-white">{tmpl.name}</span>
                          {isUser && <Star className="h-3 w-3 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{tmpl.description}</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${catCfg.color}`}>
                            {catCfg.label}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${fmtCls}`}>
                            {tmpl.format}
                          </Badge>
                          {tmpl.usageCount > 0 && (
                            <span className="text-[9px] text-zinc-600">{tmpl.usageCount}× used</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isUser && (
                          <button
                            onClick={e => handleDelete(tmpl, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <ChevronRight className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${isPreviewing ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Inline preview */}
                    {isPreviewing && (
                      <div className="mt-3 pt-3 border-t border-[#1F2933]" onClick={e => e.stopPropagation()}>
                        <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto mb-3">
                          {tmpl.scriptTemplate}
                        </pre>
                        <Button
                          size="sm"
                          onClick={() => handleApply(tmpl)}
                          className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        >
                          <Zap className="h-3 w-3" />
                          Use This Template
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
