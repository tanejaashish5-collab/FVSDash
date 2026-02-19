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
import { Separator } from '@/components/ui/separator';
import { 
  Settings, User, Palette, Brain, Globe, Sparkles, 
  Save, Loader2, Plus, X, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsPage() {
  const { user, authHeaders } = useAuth();
  
  // Client Settings (legacy)
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Channel Profile state
  const [channelProfile, setChannelProfile] = useState(null);
  const [profileOptions, setProfileOptions] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPillar, setNewPillar] = useState('');
  
  // Fetch both client settings and channel profile
  const fetchData = useCallback(async () => {
    if (!authHeaders) return;
    setLoading(true);
    
    try {
      const [settingsRes, profileRes, optionsRes] = await Promise.all([
        axios.get(`${API}/settings`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/channel-profile`, { headers: authHeaders }),
        axios.get(`${API}/channel-profile/options`, { headers: authHeaders })
      ]);
      
      setSettings(settingsRes.data || {
        hourlyRate: 150,
        hoursPerEpisode: 5,
        competitorName: '',
        brandVoiceDescription: ''
      });
      setChannelProfile(profileRes.data);
      setProfileOptions(optionsRes.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save client settings (legacy)
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings, { headers: authHeaders });
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Save channel profile
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await axios.put(`${API}/channel-profile`, channelProfile, { headers: authHeaders });
      setChannelProfile(response.data);
      toast.success('Channel Profile saved!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save Channel Profile');
    } finally {
      setSavingProfile(false);
    }
  };
  
  // Add content pillar
  const addPillar = () => {
    if (!newPillar.trim()) return;
    const pillars = channelProfile?.contentPillars || [];
    if (!pillars.includes(newPillar.trim())) {
      setChannelProfile({
        ...channelProfile,
        contentPillars: [...pillars, newPillar.trim()]
      });
    }
    setNewPillar('');
  };
  
  // Remove content pillar
  const removePillar = (pillar) => {
    setChannelProfile({
      ...channelProfile,
      contentPillars: (channelProfile?.contentPillars || []).filter(p => p !== pillar)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-zinc-400">Manage your account and Brand Brain</p>
        </div>
      </div>

      <Tabs defaultValue="channel" className="w-full">
        <TabsList className="bg-[#0B1120] border border-[#1F2933]">
          <TabsTrigger value="channel" className="data-[state=active]:bg-indigo-500/20">
            <Brain className="h-4 w-4 mr-2" />
            Channel Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-indigo-500/20">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="roi" className="data-[state=active]:bg-indigo-500/20">
            <Sparkles className="h-4 w-4 mr-2" />
            ROI Settings
          </TabsTrigger>
        </TabsList>

        {/* Channel Profile Tab */}
        <TabsContent value="channel" className="mt-6">
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Brand Brain</CardTitle>
                  <CardDescription>
                    Configure how AI generates scripts, thumbnails, and content for your channel
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Style */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Language Style
                  </Label>
                  <Select
                    value={channelProfile?.languageStyle || 'english'}
                    onValueChange={(value) => setChannelProfile({ ...channelProfile, languageStyle: value })}
                  >
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white" data-testid="language-style-select">
                      <SelectValue placeholder="Select language style" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {profileOptions?.languageStyles && Object.entries(profileOptions.languageStyles).map(([key, name]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-zinc-800">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">
                    {channelProfile?.languageStyle === 'hinglish' 
                      ? 'Scripts will be in Hinglish with performance cues [pause], [emphatic], etc.'
                      : 'Scripts will be in the selected language style'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Thumbnail Style
                  </Label>
                  <Select
                    value={channelProfile?.thumbnailStyle || 'modern_clean'}
                    onValueChange={(value) => setChannelProfile({ ...channelProfile, thumbnailStyle: value })}
                  >
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white" data-testid="thumbnail-style-select">
                      <SelectValue placeholder="Select thumbnail style" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {profileOptions?.thumbnailStyles && Object.entries(profileOptions.thumbnailStyles).map(([key, name]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-zinc-800">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Brand Description */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Brand Description</Label>
                <Textarea
                  value={channelProfile?.brandDescription || ''}
                  onChange={(e) => setChannelProfile({ ...channelProfile, brandDescription: e.target.value })}
                  placeholder="e.g., Chanakya Sutra: strategic wisdom, sharp insights, stoic philosophy for modern life"
                  className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[80px]"
                  data-testid="brand-description-input"
                />
                <p className="text-xs text-zinc-500">Describe your channel's identity. This guides AI tone and content focus.</p>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Tone</Label>
                <Input
                  value={channelProfile?.tone || ''}
                  onChange={(e) => setChannelProfile({ ...channelProfile, tone: e.target.value })}
                  placeholder="e.g., strategic, sharp, guru-like, authoritative"
                  className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600"
                  data-testid="tone-input"
                />
              </div>

              {/* Content Pillars */}
              <div className="space-y-3">
                <Label className="text-zinc-300 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Content Pillars
                </Label>
                <div className="flex flex-wrap gap-2">
                  {(channelProfile?.contentPillars || []).map((pillar, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 px-3 py-1"
                    >
                      {pillar}
                      <button
                        onClick={() => removePillar(pillar)}
                        className="ml-2 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newPillar}
                    onChange={(e) => setNewPillar(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPillar()}
                    placeholder="Add content pillar (e.g., War, Money, Power)"
                    className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 flex-1"
                    data-testid="pillar-input"
                  />
                  <Button variant="outline" size="icon" onClick={addPillar} className="border-zinc-700 hover:bg-zinc-800">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">Core themes your channel covers. AI will incorporate these into ideas.</p>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Thumbnail Options */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Thumbnails per Episode</Label>
                  <Select
                    value={String(channelProfile?.thumbnailsPerShort || 1)}
                    onValueChange={(value) => setChannelProfile({ ...channelProfile, thumbnailsPerShort: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white" data-testid="thumbnails-per-short-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="1" className="text-white">1 thumbnail</SelectItem>
                      <SelectItem value="2" className="text-white">2 thumbnails</SelectItem>
                      <SelectItem value="3" className="text-white">3 thumbnails (recommended)</SelectItem>
                      <SelectItem value="4" className="text-white">4 thumbnails</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">Generate multiple options to choose the best one</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Custom Thumbnail Prompt</Label>
                  <Textarea
                    value={channelProfile?.thumbnailPromptTemplate || ''}
                    onChange={(e) => setChannelProfile({ ...channelProfile, thumbnailPromptTemplate: e.target.value })}
                    placeholder="e.g., Black background, bold white text, one gold accent, no faces, high contrast"
                    className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[80px]"
                    data-testid="thumbnail-prompt-input"
                  />
                  <p className="text-xs text-zinc-500">Custom instructions added to thumbnail generation prompts</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-testid="save-profile-btn"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Channel Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="mt-6">
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Email</Label>
                  <Input 
                    value={user?.email || ''} 
                    readOnly 
                    className="bg-zinc-900/30 border-zinc-800 text-zinc-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Name</Label>
                  <Input 
                    value={user?.name || ''} 
                    readOnly 
                    className="bg-zinc-900/30 border-zinc-800 text-zinc-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Role</Label>
                  <Badge 
                    variant="outline" 
                    className={user?.role === 'admin' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }
                  >
                    {user?.role || 'client'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Settings Tab */}
        <TabsContent value="roi" className="mt-6">
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                ROI Calculator Settings
              </CardTitle>
              <CardDescription>Configure how your ROI is calculated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Hourly Rate ($)</Label>
                  <Input
                    type="number"
                    value={settings?.hourlyRate || 150}
                    onChange={(e) => setSettings({ ...settings, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="bg-zinc-900/50 border-zinc-700 text-white"
                    data-testid="hourly-rate-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Hours per Episode</Label>
                  <Input
                    type="number"
                    value={settings?.hoursPerEpisode || 5}
                    onChange={(e) => setSettings({ ...settings, hoursPerEpisode: parseFloat(e.target.value) || 0 })}
                    className="bg-zinc-900/50 border-zinc-700 text-white"
                    data-testid="hours-per-episode-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Competitor Name (for comparison)</Label>
                <Input
                  value={settings?.competitorName || ''}
                  onChange={(e) => setSettings({ ...settings, competitorName: e.target.value })}
                  placeholder="e.g., Industry Average"
                  className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Brand Voice (Legacy)</Label>
                <Textarea
                  value={settings?.brandVoiceDescription || ''}
                  onChange={(e) => setSettings({ ...settings, brandVoiceDescription: e.target.value })}
                  placeholder="Describe your brand voice..."
                  className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[100px]"
                />
                <p className="text-xs text-zinc-500">Legacy field. Use Channel Profile above for AI settings.</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-testid="save-settings-btn"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save ROI Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
