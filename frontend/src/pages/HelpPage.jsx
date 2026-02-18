import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Search, HelpCircle, MessageSquare, Send, Loader2, BookOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusCfg = {
  Open: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'In Progress': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  Resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const categoryCfg = {
  'Getting Started': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Submissions': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Billing': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Analytics': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export default function HelpPage() {
  const { authHeaders } = useAuth();
  const [articles, setArticles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newRequest, setNewRequest] = useState({ subject: '', message: '' });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/help/articles`, { headers: authHeaders }),
      axios.get(`${API}/help/support`, { headers: authHeaders }),
    ])
      .then(([articlesRes, requestsRes]) => {
        setArticles(articlesRes.data || []);
        setRequests(requestsRes.data || []);
      })
      .catch(err => {
        toast.error('Failed to load help data');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.subject.trim() || !newRequest.message.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/help/support`, newRequest, { headers: authHeaders });
      toast.success('Support request submitted');
      setNewRequest({ subject: '', message: '' });
      setRequests(prev => [res.data.request, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter articles by search
  const filteredArticles = articles.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q);
  });

  // Group articles by category
  const articlesByCategory = filteredArticles.reduce((acc, article) => {
    const cat = article.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(article);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div data-testid="help-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Help & Support
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Find answers or contact the ForgeVoice team.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Help Articles */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="help-articles-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-zinc-400" />
                  Help Articles
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Browse our knowledge base for answers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-zinc-950 border-zinc-800 text-white"
                    data-testid="search-articles"
                  />
                </div>

                {/* Articles Accordion */}
                {Object.keys(articlesByCategory).length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No articles found.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(articlesByCategory).map(([category, catArticles]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryCfg[category] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                            {category}
                          </Badge>
                          <span className="text-[10px] text-zinc-600">{catArticles.length} article{catArticles.length !== 1 ? 's' : ''}</span>
                        </div>
                        {catArticles.map(article => (
                          <AccordionItem
                            key={article.id}
                            value={article.id}
                            className="border border-[#1F2933] rounded-md bg-zinc-950/50 px-0"
                            data-testid={`article-${article.id}`}
                          >
                            <AccordionTrigger className="px-4 py-3 text-sm text-white hover:no-underline hover:text-indigo-400 [&[data-state=open]]:text-indigo-400">
                              {article.title}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                              {article.content}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </div>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Contact Support + Recent Requests */}
          <div className="lg:col-span-5 space-y-4">
            {/* Contact Support Form */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="support-form-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-zinc-400" />
                  Contact Support
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Can't find an answer? Send us a message.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-xs font-medium text-zinc-400">
                      Subject
                    </Label>
                    <Input
                      id="subject"
                      value={newRequest.subject}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="What do you need help with?"
                      className="h-9 bg-zinc-950 border-zinc-800 text-white"
                      data-testid="input-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-xs font-medium text-zinc-400">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={newRequest.message}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Describe your issue or question in detail..."
                      className="min-h-[100px] bg-zinc-950 border-zinc-800 text-white resize-none"
                      data-testid="input-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-9 bg-indigo-500 hover:bg-indigo-600 text-white"
                    data-testid="submit-request-btn"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="recent-requests-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  Your Recent Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">No support requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 5).map(req => {
                      const sc = statusCfg[req.status] || statusCfg.Open;
                      return (
                        <div
                          key={req.id}
                          className="p-3 rounded-md bg-zinc-950/50 border border-[#1F2933]"
                          data-testid={`request-${req.id}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm text-white font-medium truncate flex-1">{req.subject}</p>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                              {req.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-500">{formatDate(req.createdAt)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
