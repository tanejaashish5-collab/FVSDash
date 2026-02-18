import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, Brain, FileText, ListOrdered, Youtube, Loader2, 
  Copy, Check, ChevronRight, Plus, Lightbulb, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PROVIDERS = [
  { value: 'gemini', label: 'Gemini', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'openai', label: 'OpenAI', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'anthropic', label: 'Anthropic', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
];

const GOALS = [
  { value: 'educate', label: 'Educate' },
  { value: 'sell', label: 'Sell' },
  { value: 'entertain', label: 'Entertain' },
  { value: 'authority', label: 'Build Authority' },
];

export default function StrategyPage() {
  const { authHeaders } = useAuth();
  
  // Provider & capabilities
  const [provider, setProvider] = useState('gemini');
  const [capabilities, setCapabilities] = useState({ llmProviders: [], videoProviders: [] });
  
  // Input state
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [goal, setGoal] = useState('educate');
  
  // Output state
  const [research, setResearch] = useState('');
  const [outline, setOutline] = useState([]);
  const [script, setScript] = useState('');
  const [titles, setTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [chapters, setChapters] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('research');
  const [loading, setLoading] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionData, setSubmissionData] = useState({ title: '', contentType: 'Podcast', releaseDate: '' });
  const [creatingSubmission, setCreatingSubmission] = useState(false);

  // Fetch capabilities and settings
  useEffect(() => {
    axios.get(`${API}/ai/capabilities`, { headers: authHeaders })
      .then(res => setCapabilities(res.data))
      .catch(console.error);
    
    axios.get(`${API}/settings`, { headers: authHeaders })
      .then(res => {
        if (res.data.brandVoiceDescription) {
          setTone(res.data.brandVoiceDescription);
        }
      })
      .catch(console.error);
  }, [authHeaders]);

  const callAI = async (task, existingContent = '') => {
    setLoading(prev => ({ ...prev, [task]: true }));
    try {
      const res = await axios.post(`${API}/ai/generate`, {
        provider,
        task,
        input: {
          topic,
          audience,
          tone,
          goal,
          existingContent
        }
      }, { headers: authHeaders });
      
      // Handle response based on task
      if (task === 'research') {
        setResearch(res.data.researchSummary || '');
        setActiveTab('research');
        toast.success('Research generated');
      } else if (task === 'outline') {
        setOutline(res.data.outlineSections || []);
        setActiveTab('outline');
        toast.success('Outline generated');
      } else if (task === 'script') {
        setScript(res.data.scriptText || '');
        setActiveTab('script');
        toast.success('Script generated');
      } else if (task === 'youtube_package') {
        setTitles(res.data.titleIdeas || []);
        setDescription(res.data.descriptionText || '');
        setTags(res.data.tags || []);
        setChapters(res.data.chapters || []);
        setActiveTab('metadata');
        toast.success('YouTube package generated');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to generate ${task}`);
    } finally {
      setLoading(prev => ({ ...prev, [task]: false }));
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleCreateSubmission = async () => {
    if (!submissionData.title) {
      toast.error('Please enter a title');
      return;
    }
    
    setCreatingSubmission(true);
    try {
      await axios.post(`${API}/submissions`, {
        title: submissionData.title,
        description: description || script.slice(0, 500),
        contentType: submissionData.contentType,
        releaseDate: submissionData.releaseDate || null,
        guest: '',
        priority: 'Medium'
      }, { headers: authHeaders });
      
      toast.success('Submission created from strategy');
      setShowSubmissionModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setCreatingSubmission(false);
    }
  };

  const isAnyLoading = Object.values(loading).some(v => v);
  const providerConfig = PROVIDERS.find(p => p.value === provider);

  return (
    <div data-testid="strategy-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Strategy Lab
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Research, outline, and script episodes with your choice of AI model.</p>
        </div>
        <Badge variant="outline" className={`text-xs px-2 py-1 ${providerConfig?.color}`}>
          <Sparkles className="h-3 w-3 mr-1" />
          {providerConfig?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Inputs & Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Model Selection */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Brain className="h-4 w-4 text-zinc-400" />
                AI Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger data-testid="model-select" className="h-9 bg-zinc-950 border-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                  {capabilities.llmProviders.length > 0 ? (
                    PROVIDERS.filter(p => capabilities.llmProviders.includes(p.value)).map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-zinc-300">
                        {p.label}
                      </SelectItem>
                    ))
                  ) : (
                    PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-zinc-300">
                        {p.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Episode Concept */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="concept-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-zinc-400" />
                Episode Concept
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Define your episode idea and parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Topic or Idea</Label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's your episode about? Be specific..."
                  className="min-h-[80px] bg-zinc-950 border-zinc-800 text-white resize-none"
                  data-testid="input-topic"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Target Audience</Label>
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Who is this for? e.g., Marketing professionals, beginners..."
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                  data-testid="input-audience"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Tone / Brand Voice</Label>
                <Textarea
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Professional, casual, humorous, authoritative..."
                  className="min-h-[60px] bg-zinc-950 border-zinc-800 text-white resize-none"
                  data-testid="input-tone"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger data-testid="goal-select" className="h-9 bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                    {GOALS.map(g => (
                      <SelectItem key={g.value} value={g.value} className="text-zinc-300">
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-zinc-400" />
                Generate Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => callAI('research')}
                disabled={!topic || isAnyLoading}
                className="w-full h-9 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-indigo-500/30 text-white justify-start"
                data-testid="btn-research"
              >
                {loading.research ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2 text-blue-400" />
                )}
                Generate Research
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              </Button>

              <Button
                onClick={() => callAI('outline', research)}
                disabled={!topic || isAnyLoading}
                className="w-full h-9 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-indigo-500/30 text-white justify-start"
                data-testid="btn-outline"
              >
                {loading.outline ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ListOrdered className="h-4 w-4 mr-2 text-emerald-400" />
                )}
                Generate Outline
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              </Button>

              <Button
                onClick={() => callAI('script', outline.join('\n'))}
                disabled={!topic || isAnyLoading}
                className="w-full h-9 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-indigo-500/30 text-white justify-start"
                data-testid="btn-script"
              >
                {loading.script ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2 text-violet-400" />
                )}
                Generate Script
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              </Button>

              <Separator className="bg-[#1F2933]" />

              <Button
                onClick={() => callAI('youtube_package', script || outline.join('\n'))}
                disabled={!topic || isAnyLoading}
                className="w-full h-9 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 justify-start"
                data-testid="btn-youtube"
              >
                {loading.youtube_package ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Youtube className="h-4 w-4 mr-2" />
                )}
                Generate YouTube Package
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              </Button>
            </CardContent>
          </Card>

          {/* Create Submission Button */}
          {(script || description) && (
            <Button
              onClick={() => {
                setSubmissionData({
                  title: selectedTitle || titles[0] || topic,
                  contentType: 'Podcast',
                  releaseDate: ''
                });
                setShowSubmissionModal(true);
              }}
              className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
              data-testid="btn-create-submission"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Submission from Script
            </Button>
          )}
        </div>

        {/* Right Panel: Outputs */}
        <div className="lg:col-span-7">
          <Card className="bg-[#0B1120] border-[#1F2933] h-full" data-testid="outputs-card">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <TabsList className="bg-zinc-950/50 p-1">
                  <TabsTrigger value="research" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                    Research
                  </TabsTrigger>
                  <TabsTrigger value="outline" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                    Outline
                  </TabsTrigger>
                  <TabsTrigger value="script" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                    Script
                  </TabsTrigger>
                  <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
                    Metadata
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="flex-1 pt-4 overflow-auto">
                <TabsContent value="research" className="mt-0 h-full">
                  {research ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Research Summary</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(research, 'research')}
                          className="h-7 text-xs text-zinc-400 hover:text-white"
                        >
                          {copiedField === 'research' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copy
                        </Button>
                      </div>
                      <div className="p-4 rounded-md bg-zinc-950/50 border border-[#1F2933] text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                        {research}
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={Brain} text="Click 'Generate Research' to start" />
                  )}
                </TabsContent>

                <TabsContent value="outline" className="mt-0 h-full">
                  {outline.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Episode Outline</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(outline.join('\n'), 'outline')}
                          className="h-7 text-xs text-zinc-400 hover:text-white"
                        >
                          {copiedField === 'outline' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copy
                        </Button>
                      </div>
                      <div className="p-4 rounded-md bg-zinc-950/50 border border-[#1F2933] max-h-[500px] overflow-y-auto">
                        <ul className="space-y-2">
                          {outline.map((item, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                              <span className="text-indigo-400 shrink-0">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={ListOrdered} text="Click 'Generate Outline' to create structure" />
                  )}
                </TabsContent>

                <TabsContent value="script" className="mt-0 h-full">
                  {script ? (
                    <div className="space-y-3 h-full flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Episode Script</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(script, 'script')}
                          className="h-7 text-xs text-zinc-400 hover:text-white"
                        >
                          {copiedField === 'script' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copy
                        </Button>
                      </div>
                      <Textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        className="flex-1 min-h-[400px] bg-zinc-950/50 border-[#1F2933] text-sm text-zinc-300 resize-none"
                        data-testid="script-textarea"
                      />
                    </div>
                  ) : (
                    <EmptyState icon={FileText} text="Click 'Generate Script' to write content" />
                  )}
                </TabsContent>

                <TabsContent value="metadata" className="mt-0 h-full overflow-auto">
                  {(titles.length > 0 || description || tags.length > 0) ? (
                    <div className="space-y-6">
                      {/* Titles */}
                      {titles.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Title Ideas</span>
                          <div className="space-y-2">
                            {titles.map((title, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedTitle(title)}
                                className={`w-full text-left p-3 rounded-md border transition-colors ${
                                  selectedTitle === title
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                                    : 'bg-zinc-950/50 border-[#1F2933] text-zinc-300 hover:border-zinc-600'
                                }`}
                              >
                                <span className="text-sm">{title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {description && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Description</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(description, 'description')}
                              className="h-6 text-[10px] text-zinc-400 hover:text-white"
                            >
                              {copiedField === 'description' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[120px] bg-zinc-950/50 border-[#1F2933] text-sm text-zinc-300 resize-none"
                          />
                        </div>
                      )}

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Tags</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(tags.join(', '), 'tags')}
                              className="h-6 text-[10px] text-zinc-400 hover:text-white"
                            >
                              {copiedField === 'tags' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 bg-zinc-950/50 border-[#1F2933] text-zinc-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chapters */}
                      {chapters.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Chapters</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n'), 'chapters')}
                              className="h-6 text-[10px] text-zinc-400 hover:text-white"
                            >
                              {copiedField === 'chapters' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {chapters.map((ch, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-950/50 border border-[#1F2933]">
                                <span className="text-xs font-mono text-indigo-400 w-12">{ch.timestamp}</span>
                                <span className="text-sm text-zinc-300">{ch.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState icon={Youtube} text="Click 'Generate YouTube Package' for metadata" />
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Create Submission Modal */}
      <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
        <DialogContent className="bg-[#0B1120] border-[#1F2933] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white">Create Submission</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Create a new submission from your strategy content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-400">Title</Label>
              <Input
                value={submissionData.title}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, title: e.target.value }))}
                className="h-9 bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-400">Content Type</Label>
              <Select value={submissionData.contentType} onValueChange={(v) => setSubmissionData(prev => ({ ...prev, contentType: v }))}>
                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B1120] border-[#1F2933]">
                  <SelectItem value="Podcast" className="text-zinc-300">Podcast</SelectItem>
                  <SelectItem value="Short" className="text-zinc-300">Short</SelectItem>
                  <SelectItem value="Blog" className="text-zinc-300">Blog</SelectItem>
                  <SelectItem value="Webinar" className="text-zinc-300">Webinar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-400">Release Date (optional)</Label>
              <Input
                type="date"
                value={submissionData.releaseDate}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, releaseDate: e.target.value }))}
                className="h-9 bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmissionModal(false)} className="border-zinc-800 text-zinc-300">
              Cancel
            </Button>
            <Button onClick={handleCreateSubmission} disabled={creatingSubmission} className="bg-indigo-500 hover:bg-indigo-600">
              {creatingSubmission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-12">
      <Icon className="h-10 w-10 text-zinc-700 mb-3" />
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}
