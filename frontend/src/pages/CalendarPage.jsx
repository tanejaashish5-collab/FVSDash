import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, ChevronRight, CalendarIcon, ExternalLink, Loader2, 
  Clock, Palette, Check, Sparkles, GripVertical, List, Calendar as CalendarViewIcon,
  ArrowRight, Undo2, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, addDays, isAfter, isBefore } from 'date-fns';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';
import { AuraSpinner } from '@/components/animations/AuraSpinner';

// DnD Kit imports
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
  closestCenter,
} from '@dnd-kit/core';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ['INTAKE', 'EDITING', 'DESIGN', 'SCHEDULED', 'PUBLISHED'];
const CONTENT_TYPES = ['Podcast', 'Short', 'Blog', 'Webinar', 'Other'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Silk easing for animations
const silkEase = [0.22, 1, 0.36, 1];

const statusCfg = {
  INTAKE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400', icon: Clock },
  EDITING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400', icon: Clock },
  DESIGN: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400', icon: Palette },
  SCHEDULED: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-400', icon: Check },
  PUBLISHED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400', icon: Check },
};

const typeCfg = {
  Podcast: { class: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', color: 'indigo' },
  Short: { class: 'bg-pink-500/10 text-pink-400 border-pink-500/20', color: 'pink' },
  Blog: { class: 'bg-orange-500/10 text-orange-400 border-orange-500/20', color: 'orange' },
  Webinar: { class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', color: 'cyan' },
  Other: { class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', color: 'zinc' },
};

// Cadence watermarks configuration - Sprint 13
// Configurable cadence labels for each day of the week
const CADENCE_CONFIG = {
  0: null, // Sunday - rest day
  1: { text: 'Shorts Day', type: 'Short', color: 'teal' }, // Monday
  2: { text: 'Strategy Day', type: 'Podcast', color: 'purple' }, // Tuesday (Chanakya Sutra specific)
  3: { text: 'Shorts Day', type: 'Short', color: 'teal' }, // Wednesday
  4: { text: 'Strategy Day', type: 'Podcast', color: 'purple' }, // Thursday
  5: { text: 'Shorts Day', type: 'Short', color: 'teal' }, // Friday
  6: { text: 'Shorts Day', type: 'Short', color: 'teal' }, // Saturday
};

const getCadenceWatermark = (dayOfWeek) => {
  return CADENCE_CONFIG[dayOfWeek] || null;
};

// Draggable Pipeline Card
function DraggablePipelineCard({ submission, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `pipeline-${submission.id}`,
    data: { submission, source: 'pipeline' },
  });

  const tc = typeCfg[submission.contentType] || typeCfg.Other;
  const sc = statusCfg[submission.status] || statusCfg.INTAKE;
  const StatusIcon = sc.icon;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, x: 0 }}
      className={`group p-3 rounded-lg bg-[#060c17] border border-[#1F2933] hover:border-indigo-500/30 cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50' : ''}`}
      data-testid={`pipeline-card-${submission.id}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${tc.class}`}>
              {submission.contentType}
            </Badge>
            <StatusIcon className={`h-3 w-3 ${sc.text}`} />
          </div>
          <p className="text-xs text-white font-medium truncate">{submission.title}</p>
          {submission.guest && (
            <p className="text-[10px] text-zinc-500 truncate">w/ {submission.guest}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Draggable Calendar Event
function DraggableCalendarEvent({ submission, isToday, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `calendar-${submission.id}`,
    data: { submission, source: 'calendar' },
  });

  const tc = typeCfg[submission.contentType] || typeCfg.Other;
  const sc = statusCfg[submission.status] || statusCfg.INTAKE;
  const StatusIcon = sc.icon;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  return (
    <motion.button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick(submission);
        }
      }}
      className={`w-full text-left p-1.5 rounded bg-[#0B1120] border border-[#1F2933] hover:border-indigo-500/30 transition-all cursor-grab active:cursor-grabbing group ${
        isToday ? 'animate-aura-gold ring-1 ring-amber-400/30' : ''
      } ${isDragging ? 'opacity-50 scale-95' : ''}`}
      data-testid={`event-${submission.id}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <Badge variant="outline" className={`text-[7px] px-0.5 py-0 ${tc.class}`}>
          {submission.contentType?.substring(0, 3)}
        </Badge>
        <StatusIcon className={`h-2.5 w-2.5 ${sc.text}`} />
      </div>
      <p className="text-[9px] text-zinc-300 truncate leading-tight">{submission.title}</p>
    </motion.button>
  );
}

// Droppable Day Cell - Sprint 13: Increased height, cadence watermarks
function DroppableDay({ day, children, isOver, isToday, cadence, draggedItem }) {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `day-${format(day, 'yyyy-MM-dd')}`,
    data: { date: format(day, 'yyyy-MM-dd') },
  });

  // Use passed cadence prop or fallback to day-based watermark
  const watermark = cadence || null;
  
  // Determine cadence watermark color
  const cadenceColor = watermark?.color === 'teal' 
    ? 'text-teal-400/30' 
    : watermark?.color === 'purple' 
    ? 'text-purple-400/30' 
    : watermark?.color === 'amber'
    ? 'text-amber-400/30'
    : 'text-white/10';
  
  // Check if dragged item matches the cadence recommendation
  const isCompatibleDrag = draggedItem && watermark && 
    draggedItem.contentType === watermark.type;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] bg-[#060c17] p-2 transition-all relative ${
        isToday ? 'ring-1 ring-inset ring-indigo-500/30' : ''
      } ${dropIsOver ? 'bg-indigo-500/10 ring-2 ring-indigo-500/50' : ''}`}
      data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
    >
      {/* Date number - top left corner, small, muted */}
      <div className={`text-[11px] font-medium mb-2 ${isToday ? 'text-indigo-400' : 'text-zinc-600'}`}>
        {format(day, 'd')}
      </div>
      
      {/* Cadence Watermark - centered behind content */}
      {watermark && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all ${
          isCompatibleDrag ? 'animate-pulse' : ''
        }`}>
          <span className={`text-[9px] uppercase tracking-widest font-semibold ${
            isCompatibleDrag ? 'text-amber-400/50' : cadenceColor
          }`}>
            {watermark.text}
          </span>
        </div>
      )}
      
      <div className="space-y-1 relative z-10">
        {children}
      </div>
    </div>
  );
}

// Ghost Pill for AI Suggestions
function GhostPill({ suggestion, onAccept }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onAccept(suggestion)}
      className="w-full p-1.5 rounded border-2 border-dashed border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 transition-all cursor-pointer group"
      data-testid={`ghost-pill-${suggestion.date}`}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-amber-400/60 group-hover:text-amber-400 animate-pulse" />
        <span className="text-[9px] text-amber-400/60 group-hover:text-amber-400 truncate">
          {suggestion.suggestedSubmission?.title?.substring(0, 20)}...
        </span>
      </div>
    </motion.button>
  );
}

// Detail Row Component
function DetailRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">{label}</p>
      <div className="text-sm text-zinc-300">{children}</div>
    </div>
  );
}

// View Toggle Component
function ViewToggle({ view, setView }) {
  return (
    <div className="inline-flex p-1 rounded-lg bg-zinc-900/50 border border-[#1F2933]">
      <button
        onClick={() => setView('month')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'month' 
            ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' 
            : 'text-zinc-400 hover:text-white'
        }`}
        data-testid="view-month"
      >
        <CalendarViewIcon className="h-3.5 w-3.5 inline mr-1.5" />
        Month
      </button>
      <button
        onClick={() => setView('agenda')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'agenda' 
            ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' 
            : 'text-zinc-400 hover:text-white'
        }`}
        data-testid="view-agenda"
      >
        <List className="h-3.5 w-3.5 inline mr-1.5" />
        Agenda
      </button>
      <button
        onClick={() => setView('upcoming')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'upcoming' 
            ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' 
            : 'text-zinc-400 hover:text-white'
        }`}
        data-testid="view-upcoming"
      >
        <ArrowRight className="h-3.5 w-3.5 inline mr-1.5" />
        Upcoming
      </button>
    </div>
  );
}

export default function CalendarPage() {
  const { authHeaders, buildApiUrl } = useAuth();
  const navigate = useNavigate();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [submissions, setSubmissions] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [view, setView] = useState('month');
  const [rescheduleConfirm, setRescheduleConfirm] = useState(null);
  
  // AI Schedule State - Sprint 13
  const [aiScheduleOpen, setAiScheduleOpen] = useState(false);
  const [aiScheduleLoading, setAiScheduleLoading] = useState(false);
  const [aiSchedule, setAiSchedule] = useState(null);
  const [bestTimes, setBestTimes] = useState(null);
  const [applyingSchedule, setApplyingSchedule] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    setLoading(true);
    try {
      const [calendarRes, pipelineRes, suggestRes] = await Promise.all([
        axios.get(buildApiUrl(`${API}/calendar?year=${year}&month=${month}`), { headers: authHeaders }),
        axios.get(buildApiUrl(`${API}/calendar/pipeline`), { headers: authHeaders }),
        axios.get(buildApiUrl(`${API}/calendar/suggest?year=${year}&month=${month}`), { headers: authHeaders }),
      ]);
      setSubmissions(calendarRes.data.submissions || []);
      setPipeline(pipelineRes.data.submissions || []);
      setSuggestions(suggestRes.data.suggestions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, buildApiUrl, currentDate]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Fetch AI Best Times - Sprint 13
  const fetchBestTimes = async () => {
    try {
      const res = await axios.get(buildApiUrl(`${API}/calendar/best-times`), { headers: authHeaders });
      setBestTimes(res.data);
    } catch (err) {
      console.error('Failed to fetch best times:', err);
    }
  };

  // Generate AI Schedule - Sprint 13
  const generateAiSchedule = async () => {
    setAiScheduleLoading(true);
    try {
      const res = await axios.post(buildApiUrl(`${API}/calendar/ai-schedule`), {}, { headers: authHeaders });
      if (res.data.status === 'complete') {
        setAiSchedule(res.data.schedule);
        toast.success(`Generated ${res.data.suggestion_count} scheduling suggestions!`);
      } else {
        toast.error('Failed to generate schedule');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate AI schedule');
    } finally {
      setAiScheduleLoading(false);
    }
  };

  // Fetch existing AI Schedule
  const fetchAiSchedule = async () => {
    try {
      const res = await axios.get(buildApiUrl(`${API}/calendar/ai-schedule`), { headers: authHeaders });
      if (res.data.status === 'complete') {
        setAiSchedule(res.data.schedule);
      }
    } catch (err) {
      console.error('Failed to fetch AI schedule:', err);
    }
  };

  // Apply single suggestion
  const applySuggestion = async (suggestion) => {
    try {
      await axios.post(
        buildApiUrl(`${API}/calendar/apply-suggestion`),
        {},
        { 
          headers: authHeaders,
          params: {
            date: suggestion.date,
            time_ist: suggestion.time_ist,
            content_type: suggestion.content_type,
            submission_id: suggestion.submission_id || null,
            recommendation_id: suggestion.recommendation_id || null
          }
        }
      );
      toast.success(`Added "${suggestion.content_title}" to calendar!`);
      fetchCalendar(); // Refresh calendar
    } catch (err) {
      toast.error('Failed to apply suggestion');
    }
  };

  // Apply all scheduled suggestions
  const applyFullSchedule = async () => {
    if (!aiSchedule?.suggestions?.length) return;
    
    setApplyingSchedule(true);
    const scheduledItems = aiSchedule.suggestions.filter(s => s.content_type === 'scheduled');
    
    let success = 0;
    for (const item of scheduledItems) {
      try {
        await axios.post(
          buildApiUrl(`${API}/calendar/apply-suggestion`),
          {},
          { 
            headers: authHeaders,
            params: {
              date: item.date,
              time_ist: item.time_ist,
              content_type: item.content_type,
              submission_id: item.submission_id || null,
              recommendation_id: item.recommendation_id || null
            }
          }
        );
        success++;
      } catch (err) {
        console.error('Failed to apply suggestion:', item, err);
      }
    }
    
    setApplyingSchedule(false);
    toast.success(`Applied ${success} items to your calendar!`);
    fetchCalendar();
  };

  // Open AI Schedule panel
  const openAiSchedule = () => {
    setAiScheduleOpen(true);
    fetchBestTimes();
    fetchAiSchedule();
  };

  // Schedule submission to a date
  const scheduleSubmission = async (submissionId, date) => {
    try {
      await axios.patch(
        buildApiUrl(`${API}/calendar/schedule/${submissionId}?date=${date}`),
        {},
        { headers: authHeaders }
      );
      toast.success('Content scheduled!');
      fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule');
    }
  };

  // Unschedule submission
  const unscheduleSubmission = async (submissionId) => {
    try {
      await axios.patch(
        buildApiUrl(`${API}/calendar/unschedule/${submissionId}`),
        {},
        { headers: authHeaders }
      );
      toast.success('Content unscheduled');
      fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unschedule');
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await axios.patch(buildApiUrl(`${API}/submissions/${selected.id}`), { status: newStatus }, { headers: authHeaders });
      toast.success('Status updated');
      setSelected(prev => ({ ...prev, status: newStatus }));
      fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle date change from detail panel
  const handleDateChange = async (newDate) => {
    if (!selected) return;
    setUpdating(true);
    setDatePickerOpen(false);
    try {
      const formattedDate = format(newDate, 'yyyy-MM-dd');
      await scheduleSubmission(selected.id, formattedDate);
      setSelected(prev => ({ ...prev, releaseDate: formattedDate, status: 'SCHEDULED' }));
    } finally {
      setUpdating(false);
    }
  };

  // Accept AI suggestion
  const handleAcceptSuggestion = async (suggestion) => {
    await scheduleSubmission(suggestion.suggestedSubmission.id, suggestion.date);
  };

  // DnD Handlers
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    setDraggedItem(active.data.current?.submission);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedItem(null);

    if (!over) return;

    const sourceData = active.data.current;
    const targetDate = over.data.current?.date;

    if (!targetDate) return;

    const submission = sourceData.submission;
    const fromCalendar = sourceData.source === 'calendar';

    // If rescheduling from calendar, show confirmation
    if (fromCalendar && submission.releaseDate !== targetDate) {
      setRescheduleConfirm({
        submission,
        newDate: targetDate,
        oldDate: submission.releaseDate,
      });
      return;
    }

    // Schedule from pipeline
    if (!fromCalendar) {
      // Optimistic update
      setPipeline(prev => prev.filter(p => p.id !== submission.id));
      setSubmissions(prev => [...prev, { ...submission, releaseDate: targetDate, status: 'SCHEDULED' }]);
      await scheduleSubmission(submission.id, targetDate);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedItem(null);
  };

  // Confirm reschedule
  const confirmReschedule = async () => {
    if (!rescheduleConfirm) return;
    
    // Optimistic update
    setSubmissions(prev => prev.map(s => 
      s.id === rescheduleConfirm.submission.id 
        ? { ...s, releaseDate: rescheduleConfirm.newDate }
        : s
    ));
    setRescheduleConfirm(null);
    
    await scheduleSubmission(rescheduleConfirm.submission.id, rescheduleConfirm.newDate);
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(sub => {
    if (filterType !== 'all' && sub.contentType !== filterType) return false;
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    return true;
  });

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const getSubmissionsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return filteredSubmissions.filter(sub => sub.releaseDate === dateStr);
  };

  const getSuggestionForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return suggestions.find(s => s.date === dateStr);
  };

  // Find active dragged item for overlay
  const activeDragItem = useMemo(() => {
    if (!activeId) return null;
    const fromPipeline = pipeline.find(p => `pipeline-${p.id}` === activeId);
    if (fromPipeline) return fromPipeline;
    return submissions.find(s => `calendar-${s.id}` === activeId);
  }, [activeId, pipeline, submissions]);

  // Upcoming view data (next 14 days)
  const upcomingDays = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 0; i < 14; i++) {
      const day = addDays(today, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySubmissions = submissions.filter(s => s.releaseDate === dateStr);
      if (daySubmissions.length > 0) {
        result.push({ date: day, submissions: daySubmissions });
      }
    }
    return result;
  }, [submissions]);

  // Agenda view data (grouped by date)
  const agendaData = useMemo(() => {
    const grouped = {};
    filteredSubmissions.forEach(sub => {
      if (sub.releaseDate) {
        if (!grouped[sub.releaseDate]) {
          grouped[sub.releaseDate] = [];
        }
        grouped[sub.releaseDate].push(sub);
      }
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, subs]) => ({ date, submissions: subs }));
  }, [filteredSubmissions]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div data-testid="calendar-page" className="flex gap-6 h-[calc(100vh-140px)]">
        {/* Main Calendar Area (75%) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <AuraTooltip content={tooltipContent.calendar.calendarView} position="right">
                  <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Strategic Calendar
                  </h1>
                </AuraTooltip>
                <p className="text-sm text-zinc-500 mt-0.5">Drag content from the pipeline to schedule your releases.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={openAiSchedule}
                  className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30"
                  size="sm"
                  data-testid="ai-schedule-btn"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Schedule
                </Button>
                <ViewToggle view={view} setView={setView} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-[#0B1120] border-[#1F2933] mb-4 shrink-0">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="filter-content-type" className="w-[130px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    <SelectItem value="all" className="text-xs text-zinc-300">All Types</SelectItem>
                    {CONTENT_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs text-zinc-300">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="filter-status" className="w-[130px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    <SelectItem value="all" className="text-xs text-zinc-300">All Statuses</SelectItem>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="text-xs text-zinc-300">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {filteredSubmissions.length} scheduled · {pipeline.length} in pipeline
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Views */}
          <Card className="bg-[#0B1120] border-[#1F2933] flex-1 overflow-hidden" data-testid="calendar-grid">
            {view === 'month' && (
              <>
                <CardHeader className="pb-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrevMonth}
                      className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5"
                      data-testid="prev-month-btn"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToday}
                      className="h-8 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/5"
                      data-testid="today-btn"
                    >
                      Today
                    </Button>
                    <CardTitle className="text-base font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {format(currentDate, 'MMMM yyyy')}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNextMonth}
                      className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5"
                      data-testid="next-month-btn"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <AuraSpinner size="md" />
                    </div>
                  ) : (
                    <>
                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 mb-2">
                        {WEEKDAYS.map(day => (
                          <div key={day} className="text-center text-[10px] uppercase tracking-wider text-zinc-500 font-semibold py-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar grid - Sprint 13: Increased cell height */}
                      <div className="grid grid-cols-7 gap-px bg-[#1F2933]/50 rounded-lg overflow-hidden">
                        {/* Padding for start of month */}
                        {Array.from({ length: startPadding }).map((_, i) => (
                          <div key={`pad-${i}`} className="min-h-[120px] bg-[#060c17]/50 p-2" />
                        ))}

                        {/* Days */}
                        {days.map(day => {
                          const daySubmissions = getSubmissionsForDay(day);
                          const suggestion = getSuggestionForDay(day);
                          const isToday = isSameDay(day, new Date());
                          const cadence = getCadenceWatermark(getDay(day));
                          
                          return (
                            <DroppableDay 
                              key={day.toISOString()} 
                              day={day} 
                              isToday={isToday}
                              draggedItem={draggedItem}
                              cadence={daySubmissions.length === 0 ? cadence : null}
                            >
                              {daySubmissions.slice(0, 2).map(sub => (
                                <DraggableCalendarEvent
                                  key={sub.id}
                                  submission={sub}
                                  isToday={isToday && sub.releaseDate === format(new Date(), 'yyyy-MM-dd')}
                                  onClick={setSelected}
                                />
                              ))}
                              {daySubmissions.length > 2 && (
                                <p className="text-[8px] text-zinc-500 pl-1">+{daySubmissions.length - 2} more</p>
                              )}
                              {/* AI Suggestion Ghost Pill */}
                              {suggestion && daySubmissions.length === 0 && (
                                <GhostPill suggestion={suggestion} onAccept={handleAcceptSuggestion} />
                              )}
                            </DroppableDay>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </>
            )}

            {view === 'agenda' && (
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {format(currentDate, 'MMMM yyyy')} Agenda
                </h3>
                <ScrollArea className="h-[calc(100vh-340px)]">
                  {agendaData.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">No scheduled content this month.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {agendaData.map(({ date, submissions: daySubs }) => (
                        <div key={date} className="border-l-2 border-indigo-500/30 pl-4">
                          <p className="text-xs font-semibold text-zinc-400 mb-2">
                            {format(new Date(date), 'EEEE, MMMM d')}
                          </p>
                          <div className="space-y-2">
                            {daySubs.map(sub => {
                              const tc = typeCfg[sub.contentType] || typeCfg.Other;
                              const sc = statusCfg[sub.status] || statusCfg.INTAKE;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => setSelected(sub)}
                                  className="w-full text-left p-3 rounded-lg bg-[#060c17] border border-[#1F2933] hover:border-indigo-500/30 transition-colors"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${tc.class}`}>
                                      {sub.contentType}
                                    </Badge>
                                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                                      {sub.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-white font-medium">{sub.title}</p>
                                  {sub.guest && <p className="text-xs text-zinc-500">w/ {sub.guest}</p>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            )}

            {view === 'upcoming' && (
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Next 14 Days
                </h3>
                <ScrollArea className="h-[calc(100vh-340px)]">
                  {upcomingDays.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">No upcoming content in the next 2 weeks.</p>
                      <p className="text-xs text-zinc-600 mt-1">Drag content from the pipeline to schedule.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingDays.map(({ date, submissions: daySubs }) => {
                        const isToday = isSameDay(date, new Date());
                        return (
                          <div 
                            key={format(date, 'yyyy-MM-dd')} 
                            className={`p-3 rounded-lg border ${isToday ? 'border-amber-500/30 bg-amber-500/5' : 'border-[#1F2933] bg-[#060c17]'}`}
                          >
                            <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-amber-400' : 'text-zinc-400'}`}>
                              {isToday ? 'Today' : format(date, 'EEEE, MMM d')}
                            </p>
                            {daySubs.map(sub => {
                              const tc = typeCfg[sub.contentType] || typeCfg.Other;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => setSelected(sub)}
                                  className="w-full text-left p-2 rounded bg-[#0B1120] border border-[#1F2933] hover:border-indigo-500/30 transition-colors mb-1 last:mb-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${tc.class}`}>
                                      {sub.contentType}
                                    </Badge>
                                    <p className="text-xs text-white truncate">{sub.title}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Content Pipeline Sidebar (25%) */}
        <Card className="w-[280px] shrink-0 bg-[#0B1120] border-[#1F2933] flex flex-col" data-testid="content-pipeline">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Sparkles className="h-4 w-4 text-amber-400" />
              Content Pipeline
            </CardTitle>
            <p className="text-[10px] text-zinc-500">Drag to schedule</p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-3 pt-0">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <AuraSpinner size="sm" />
                </div>
              ) : pipeline.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
                  <CalendarIcon className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                  <p className="text-xs text-zinc-400">No content in pipeline</p>
                  <p className="text-[10px] text-zinc-600 mt-1 px-4">
                    Submit new content or generate ideas in FVS System
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard/fvs')}
                    className="mt-3 text-xs text-teal-400 hover:bg-teal-500/20"
                    data-testid="goto-fvs-btn"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Go to FVS System
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {pipeline.map(sub => (
                    <DraggablePipelineCard
                      key={sub.id}
                      submission={sub}
                      isDragging={activeId === `pipeline-${sub.id}`}
                    />
                  ))}
                  
                  {/* Add New Idea button at bottom */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard/fvs')}
                    className="w-full text-xs text-zinc-500 hover:text-teal-400 hover:bg-teal-500/10 border border-dashed border-zinc-700 mt-2"
                    data-testid="add-new-idea-btn"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Add New Idea
                  </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          
          {/* AI Suggestions Count */}
          {suggestions.length > 0 && (
            <div className="p-3 border-t border-[#1F2933] shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-amber-400/80">
                <Sparkles className="h-3 w-3" />
                <span>{suggestions.length} AI suggestion{suggestions.length !== 1 ? 's' : ''} available</span>
              </div>
            </div>
          )}
        </Card>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragItem && (
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.05, opacity: 0.9 }}
              className="p-3 rounded-lg bg-[#0B1120] border-2 border-indigo-500 shadow-xl shadow-indigo-500/20"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${(typeCfg[activeDragItem.contentType] || typeCfg.Other).class}`}>
                  {activeDragItem.contentType}
                </Badge>
              </div>
              <p className="text-xs text-white font-medium mt-1">{activeDragItem.title}</p>
            </motion.div>
          )}
        </DragOverlay>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-[420px] sm:w-[480px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-white text-lg pr-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {selected.title}
                </SheetTitle>
                <SheetDescription className="text-zinc-500 text-xs">
                  Edit status and schedule
                </SheetDescription>
              </SheetHeader>

              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {(() => {
                  const sc = statusCfg[selected.status] || statusCfg.INTAKE;
                  const StatusIcon = sc.icon;
                  return (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${sc.bg} ${sc.text} ${sc.border}`}>
                      <StatusIcon className="h-3 w-3" />
                      {selected.status}
                    </Badge>
                  );
                })()}
                {(() => {
                  const tc = typeCfg[selected.contentType] || typeCfg.Other;
                  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc.class}`}>{selected.contentType}</Badge>;
                })()}
              </div>

              <Separator className="bg-[#1F2933] mb-5" />

              <div className="space-y-5">
                {selected.guest && (
                  <DetailRow label="Guest">
                    <p>{selected.guest}</p>
                  </DetailRow>
                )}
                <DetailRow label="Description">
                  <p className="leading-relaxed">{selected.description || 'No description'}</p>
                </DetailRow>

                {/* Editable Release Date */}
                <div>
                  <AuraTooltip content={tooltipContent.calendar.addToCalendar} position="right">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Release Date</p>
                  </AuraTooltip>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="edit-release-date"
                        disabled={updating}
                        className="w-full justify-start text-left font-normal h-9 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:text-white text-white"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-sm">{selected.releaseDate || 'Not scheduled'}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#0B1120] border-[#1F2933]" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={selected.releaseDate ? new Date(selected.releaseDate) : undefined}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Unschedule button */}
                  {selected.releaseDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        unscheduleSubmission(selected.id);
                        setSelected(null);
                      }}
                      className="w-full mt-2 h-8 text-xs text-zinc-500 hover:text-red-400"
                    >
                      <Undo2 className="h-3 w-3 mr-1.5" />
                      Unschedule (move to pipeline)
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="bg-[#1F2933] my-5" />

              {/* Status change */}
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
                        onClick={() => handleStatusChange(s)}
                        disabled={updating || isActive}
                        className={`px-2.5 py-1 rounded-sm text-[10px] font-medium border transition-colors disabled:opacity-50 ${
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

              {/* Deep-link to Submission details page */}
              <div className="space-y-2">
                <Button
                  onClick={() => navigate(`/dashboard/submissions/${selected.id}`)}
                  variant="outline"
                  data-testid="view-submission-details"
                  className="w-full justify-center gap-2 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 h-9 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Full Submission
                </Button>
              </div>

              {updating && (
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating...
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reschedule Confirmation Sheet */}
      <Sheet open={!!rescheduleConfirm} onOpenChange={(open) => { if (!open) setRescheduleConfirm(null); }}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-[380px]">
          {rescheduleConfirm && (
            <div className="py-6">
              <div className="text-center mb-6">
                <CalendarIcon className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Reschedule Content?
                </h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-[#1F2933]">
                  <p className="text-xs text-zinc-500 mb-1">Content</p>
                  <p className="text-sm text-white font-medium">{rescheduleConfirm.submission.title}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 rounded-lg bg-zinc-900/50 border border-[#1F2933]">
                    <p className="text-xs text-zinc-500 mb-1">From</p>
                    <p className="text-sm text-white">{rescheduleConfirm.oldDate}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  <div className="flex-1 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                    <p className="text-xs text-indigo-400 mb-1">To</p>
                    <p className="text-sm text-white">{rescheduleConfirm.newDate}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRescheduleConfirm(null)}
                  className="flex-1 h-10 text-sm border-[#1F2933] text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReschedule}
                  className="flex-1 h-10 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Confirm Reschedule
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* AI Schedule Sheet - Sprint 13 */}
      <Sheet open={aiScheduleOpen} onOpenChange={setAiScheduleOpen}>
        <SheetContent side="right" className="bg-[#0B1120] border-[#1F2933] w-[480px] sm:w-[520px] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Sparkles className="h-5 w-5 text-teal-400" />
              Content Calendar AI
            </SheetTitle>
            <SheetDescription className="text-zinc-500 text-xs">
              Optimal posting times based on your channel's performance data
            </SheetDescription>
          </SheetHeader>

          <Separator className="bg-[#1F2933] mb-5" />

          {/* Best Posting Times Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-teal-400" />
              Your Best Performing Times
            </h3>
            
            {bestTimes?.top_slots?.length > 0 ? (
              <div className="space-y-2">
                {bestTimes.top_slots.map((slot, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const confidence = slot.confidence === 'High' ? 'text-emerald-400' : slot.confidence === 'Medium' ? 'text-amber-400' : 'text-zinc-500';
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{medals[i]}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{slot.day} {slot.time_label}</p>
                          <p className={`text-xs ${confidence}`}>{slot.confidence} confidence</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{slot.avg_views.toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500">avg views</p>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-zinc-600 text-center mt-2">
                  Based on {bestTimes.total_analyzed} published videos analysis
                </p>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                <BarChart3 className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Need more performance data</p>
                <p className="text-[10px] text-zinc-600 mt-1">Publish at least 10 videos to unlock this feature</p>
              </div>
            )}
          </div>

          <Separator className="bg-[#1F2933] mb-5" />

          {/* Generate Schedule Button */}
          <div className="mb-5">
            <Button
              onClick={generateAiSchedule}
              disabled={aiScheduleLoading}
              className="w-full bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30"
              data-testid="generate-schedule-btn"
            >
              {aiScheduleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Schedule...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate 4-Week Schedule
                </>
              )}
            </Button>
          </div>

          {/* AI Loading State */}
          {aiScheduleLoading && (
            <div className="text-center py-8">
              <AuraSpinner size="md" />
              <p className="text-xs text-zinc-400 mt-4">Analysing performance patterns...</p>
              <p className="text-[10px] text-zinc-600 mt-1">Identifying optimal slots... Building your schedule...</p>
            </div>
          )}

          {/* AI Generated Schedule */}
          {!aiScheduleLoading && aiSchedule?.suggestions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-teal-400" />
                AI Generated Schedule
              </h3>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {aiSchedule.suggestions.map((item, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded-lg border ${
                        item.content_type === 'scheduled' 
                          ? 'bg-teal-500/5 border-teal-500/30' 
                          : 'bg-amber-500/5 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`text-[9px] px-1.5 py-0 ${
                                item.content_type === 'scheduled' 
                                  ? 'border-teal-500/40 text-teal-400' 
                                  : 'border-amber-500/40 text-amber-400'
                              }`}
                            >
                              {item.content_type === 'scheduled' ? 'Ready to Schedule' : 'New Idea'}
                            </Badge>
                            {item.confidence_score && (
                              <span className="text-[9px] text-zinc-600">
                                {Math.round(item.confidence_score * 100)}% match
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white truncate">{item.content_title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {item.day_of_week}, {item.date} · {item.time_ist}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applySuggestion(item)}
                          className="shrink-0 h-7 px-2 text-xs text-teal-400 hover:bg-teal-500/20"
                          data-testid={`apply-suggestion-${i}`}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Apply Full Schedule Button */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <Button
                  onClick={applyFullSchedule}
                  disabled={applyingSchedule}
                  className="w-full bg-teal-500 text-white hover:bg-teal-600"
                  data-testid="apply-full-schedule-btn"
                >
                  {applyingSchedule ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply Full Schedule ({aiSchedule.suggestions.filter(s => s.content_type === 'scheduled').length} items)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!aiScheduleLoading && (!aiSchedule || !aiSchedule.suggestions?.length) && (
            <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
              <CalendarIcon className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No schedule generated yet</p>
              <p className="text-xs text-zinc-600 mt-1">Click "Generate Schedule" to create an AI-powered posting plan</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DndContext>
  );
}
