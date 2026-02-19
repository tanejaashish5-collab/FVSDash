import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, CalendarIcon, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ['INTAKE', 'EDITING', 'DESIGN', 'SCHEDULED', 'PUBLISHED'];
const CONTENT_TYPES = ['Podcast', 'Short', 'Blog', 'Webinar', 'Other'];

const statusCfg = {
  INTAKE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  EDITING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  DESIGN: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  SCHEDULED: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  PUBLISHED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const typeCfg = {
  Podcast: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Short: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Blog: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Webinar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Other: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DetailRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">{label}</p>
      <div className="text-sm text-zinc-300">{children}</div>
    </div>
  );
}

export default function CalendarPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchCalendar = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    setLoading(true);
    axios.get(`${API}/calendar?year=${year}&month=${month}`, { headers: authHeaders })
      .then(res => setSubmissions(res.data.submissions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders, currentDate]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleStatusChange = async (newStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await axios.patch(`${API}/submissions/${selected.id}`, { status: newStatus }, { headers: authHeaders });
      toast.success('Status updated');
      setSelected(prev => ({ ...prev, status: newStatus }));
      fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDateChange = async (newDate) => {
    if (!selected) return;
    setUpdating(true);
    setDatePickerOpen(false);
    try {
      const formattedDate = format(newDate, 'yyyy-MM-dd');
      await axios.patch(`${API}/submissions/${selected.id}`, { releaseDate: formattedDate }, { headers: authHeaders });
      toast.success('Release date updated');
      setSelected(prev => ({ ...prev, releaseDate: formattedDate }));
      fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update release date');
    } finally {
      setUpdating(false);
    }
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

  return (
    <div data-testid="calendar-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Content calendar
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Visualize and adjust your publishing schedule.</p>
      </div>

      {/* Filters */}
      <Card className="bg-[#0B1120] border-[#1F2933]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-content-type" className="w-[140px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
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
              <SelectTrigger data-testid="filter-status" className="w-[140px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
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
              {filteredSubmissions.length} event{filteredSubmissions.length !== 1 ? 's' : ''} this month
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="calendar-grid">
        <CardHeader className="pb-3">
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
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-[#1F2933]/50 rounded-lg overflow-hidden">
                {/* Padding for start of month */}
                {Array.from({ length: startPadding }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-[100px] bg-[#060c17]/50 p-2" />
                ))}

                {/* Days */}
                {days.map(day => {
                  const daySubmissions = getSubmissionsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[100px] bg-[#060c17] p-2 transition-colors ${
                        isToday ? 'ring-1 ring-inset ring-indigo-500/30' : ''
                      }`}
                      data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <div className={`text-xs font-medium mb-1.5 ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {daySubmissions.slice(0, 3).map(sub => {
                          const tc = typeCfg[sub.contentType] || typeCfg.Other;
                          const sc = statusCfg[sub.status] || statusCfg.INTAKE;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setSelected(sub)}
                              className="w-full text-left p-1.5 rounded bg-[#0B1120] border border-[#1F2933] hover:border-indigo-500/30 transition-colors group"
                              data-testid={`event-${sub.id}`}
                            >
                              <Badge variant="outline" className={`text-[8px] px-1 py-0 mb-0.5 ${tc}`}>
                                {sub.contentType}
                              </Badge>
                              <p className="text-[10px] text-zinc-300 truncate leading-tight">{sub.title}</p>
                              <div className={`h-1 w-1 rounded-full ${sc.dot} mt-1`} />
                            </button>
                          );
                        })}
                        {daySubmissions.length > 3 && (
                          <p className="text-[9px] text-zinc-500 pl-1">+{daySubmissions.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {filteredSubmissions.length === 0 && (
                <div className="text-center py-8 mt-4 border border-dashed border-[#1F2933] rounded-lg">
                  <CalendarIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No scheduled episodes for this view.</p>
                  <p className="text-xs text-zinc-600 mt-1">Use Submissions to plan your next content drops.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
                  Edit status and release date
                </SheetDescription>
              </SheetHeader>

              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {(() => {
                  const sc = statusCfg[selected.status] || statusCfg.INTAKE;
                  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>{selected.status}</Badge>;
                })()}
                {(() => {
                  const tc = typeCfg[selected.contentType] || typeCfg.Other;
                  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tc}`}>{selected.contentType}</Badge>;
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
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Release Date</p>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="edit-release-date"
                        disabled={updating}
                        className="w-full justify-start text-left font-normal h-9 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:text-white text-white"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-sm">{selected.releaseDate || 'Not set'}</span>
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
              {/* Clicking opens the canonical submission detail view with full context */}
              <div className="space-y-2">
                <Button
                  onClick={() => navigate(`/dashboard/submissions/${selected.id}`)}
                  variant="outline"
                  data-testid="view-submission-details"
                  className="w-full justify-center gap-2 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 h-9 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Submission
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
    </div>
  );
}
