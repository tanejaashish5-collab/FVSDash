/**
 * SmartScheduleWidget — AI-powered publish schedule recommendations.
 *
 * Props:
 *   onApplyDate(date: string) — called when user picks a suggestion
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarClock, Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_CFG = {
  High:   'bg-red-500/10 text-red-400 border-red-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Low:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function SmartScheduleWidget({ onApplyDate }) {
  const { authHeaders } = useAuth();
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [insight, setInsight]         = useState('');
  const [applied, setApplied]         = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestions([]);
    setInsight('');
    try {
      const res = await axios.post(`${API}/ai/suggest-schedule`, {}, { headers: authHeaders });
      setSuggestions(res.data.suggestions || []);
      setInsight(res.data.insight || '');
      if (!open) setOpen(true);
    } catch {
      toast.error('Failed to generate schedule suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (s) => {
    setApplied(s.date);
    onApplyDate?.(s.date);
    toast.success(`Release date set to ${s.dayOfWeek} ${s.date}`);
  };

  return (
    <div className="border border-[#1F2933] rounded-lg overflow-hidden">
      {/* Header bar */}
      <button
        onClick={() => { if (!open && suggestions.length === 0) handleGenerate(); else setOpen(o => !o); }}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-teal-400" />
          <span className="text-xs font-medium text-zinc-300">AI Schedule Suggestions</span>
          {suggestions.length > 0 && (
            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-800/50 px-1.5 rounded">
              {suggestions.length} slots
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />}
          {!loading && suggestions.length === 0 && (
            <span className="text-[10px] text-teal-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Generate
            </span>
          )}
          {!loading && suggestions.length > 0 && (
            open ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Suggestions list */}
      {open && suggestions.length > 0 && (
        <div className="p-3 space-y-2 border-t border-[#1F2933]">
          {insight && (
            <p className="text-[10px] text-zinc-500 leading-relaxed mb-3 italic">{insight}</p>
          )}
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-all ${
                applied === s.date
                  ? 'bg-teal-500/10 border-teal-500/30'
                  : 'bg-zinc-900/50 border-[#1F2933] hover:border-zinc-700'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{s.dayOfWeek}</span>
                  <span className="text-[10px] text-zinc-500">{s.date}</span>
                  {s.timeOfDay && (
                    <span className="text-[10px] text-zinc-600">{s.timeOfDay}</span>
                  )}
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${PRIORITY_CFG[s.priority] || PRIORITY_CFG.Medium}`}>
                    {s.priority}
                  </Badge>
                </div>
                {s.reason && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{s.reason}</p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleApply(s)}
                disabled={applied === s.date}
                className={`h-6 text-[10px] px-2 ml-2 shrink-0 ${
                  applied === s.date
                    ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {applied === s.date ? <Check className="h-3 w-3" /> : 'Use'}
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-6 text-[10px] text-zinc-500 hover:text-zinc-300 mt-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Refresh suggestions
          </Button>
        </div>
      )}
    </div>
  );
}
