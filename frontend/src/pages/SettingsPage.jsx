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
  Save, Loader2, Plus, X, Tag, Send, Youtube, Instagram,
  CheckCircle2, XCircle, Link2, Unlink
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const platformCfg = {
  youtube_shorts: { 
    label: 'YouTube Shorts', 
    icon: Youtube, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    description: 'Post short-form videos to YouTube'
  },
  tiktok: { 
    label: 'TikTok', 
    icon: TikTokIcon, 
    color: 'text-pink-400', 
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    description: 'Share videos on TikTok'
  },
  instagram_reels: { 
    label: 'Instagram Reels', 
    icon: Instagram, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'Publish Reels to Instagram'
  },
};

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
  
  // Platform Connections state
  const [platformConnections, setPlatformConnections] = useState([]);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [noClientId, setNoClientId] = useState(false);
  
  // Fetch both client settings and channel profile
  const fetchData = useCallback(async () => {
    if (!authHeaders) return;
    setLoading(true);
    setNoClientId(false);
    
    try {
      const [settingsRes, profileRes, optionsRes, connectionsRes] = await Promise.all([
        axios.get(`${API}/settings`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/channel-profile`, { headers: authHeaders }).catch((e) => {
          // If 400 error (no client ID), handle gracefully
          if (e.response?.status === 400) {
            setNoClientId(true);
            return { data: null };
          }
          throw e;
        }),
        axios.get(`${API}/channel-profile/options`, { headers: authHeaders }),
        axios.get(`${API}/platform-connections`, { headers: authHeaders }).catch(() => ({ data: [] }))
      ]);
      
      setSettings(settingsRes.data || {
        hourlyRate: 150,
        hoursPerEpisode: 5,
        competitorName: '',
        brandVoiceDescription: ''
      });
      setChannelProfile(profileRes.data);
      setProfileOptions(optionsRes.data);
      
      // Ensure all platforms are represented
      const platforms = ['youtube_shorts', 'tiktok', 'instagram_reels'];
      const existingConnections = connectionsRes.data || [];
      const fullConnections = platforms.map(platform => {
        const existing = existingConnections.find(c => c.platform === platform);
        return existing || {
          id: null,
          platform,
          connected: false,
          accountName: null,
          accountHandle: null,
          connectedAt: null
        };
      });
      setPlatformConnections(fullConnections);
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
  
  // Connect platform (mock OAuth)
  const handleConnectPlatform = async (platform) => {
    setConnectingPlatform(platform);
    try {
      const res = await axios.post(`${API}/platform-connections/${platform}/connect`, {}, { headers: authHeaders });
      setPlatformConnections(prev => 
        prev.map(p => p.platform === platform ? res.data : p)
      );
      toast.success(`${platformCfg[platform]?.label || platform} connected!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to connect platform');
    } finally {
      setConnectingPlatform(null);
    }
  };
  
  // Disconnect platform
  const handleDisconnectPlatform = async (platform) => {
    setConnectingPlatform(platform);
    try {
      await axios.post(`${API}/platform-connections/${platform}/disconnect`, {}, { headers: authHeaders });
      setPlatformConnections(prev => 
        prev.map(p => p.platform === platform ? { ...p, connected: false, accountName: null, accountHandle: null } : p)
      );
      toast.success(`${platformCfg[platform]?.label || platform} disconnected`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to disconnect platform');
    } finally {
      setConnectingPlatform(null);
    }
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
          <TabsTrigger value="publishing" className="data-[state=active]:bg-indigo-500/20">
            <Send className="h-4 w-4 mr-2" />
            Publishing
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
              {noClientId || !channelProfile ? (
                // Empty state for admin or no profile
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Set up your Brand Brain</h3>
                  <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
                    {noClientId 
                      ? "As an admin, please select a client to impersonate from the admin panel to configure their Brand Brain settings."
                      : "Configure your channel profile to customize how AI generates content for you."}
                  </p>
                  {!noClientId && (
                    <Button 
                      onClick={() => setChannelProfile({
                        languageStyle: 'english',
                        thumbnailStyle: 'modern_clean',
                        brandDescription: '',
                        tone: 'professional and engaging',
                        contentPillars: [],
                        thumbnailsPerShort: 1
                      })}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Profile
                    </Button>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publishing Tab */}
        <TabsContent value="publishing" className="mt-6">
          <Card className="bg-[#0B1120] border-[#1F2933]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <Send className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Platform Connections</CardTitle>
                  <CardDescription>
                    Connect your social media accounts to publish content directly
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformConnections.map((conn) => {
                const cfg = platformCfg[conn.platform] || {};
                const PlatformIcon = cfg.icon || Send;
                const isConnecting = connectingPlatform === conn.platform;
                
                return (
                  <div 
                    key={conn.platform}
                    className={`p-4 rounded-lg border ${conn.connected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-900/30'}`}
                    data-testid={`platform-card-${conn.platform}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                          <PlatformIcon className={`h-6 w-6 ${cfg.color}`} />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{cfg.label}</h4>
                          {conn.connected ? (
                            <div className="flex items-center gap-2 mt-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-sm text-emerald-400">Connected</span>
                              <span className="text-sm text-zinc-500">•</span>
                              <span className="text-sm text-zinc-400">{conn.accountHandle}</span>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500 mt-0.5">{cfg.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {conn.connected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectPlatform(conn.platform)}
                          disabled={isConnecting}
                          className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30"
                          data-testid={`disconnect-${conn.platform}-btn`}
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="h-4 w-4 mr-2" />
                              Disconnect
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnectPlatform(conn.platform)}
                          disabled={isConnecting}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          data-testid={`connect-${conn.platform}-btn`}
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Link2 className="h-4 w-4 mr-2" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  <span className="text-amber-400">Note:</span> This is a demo environment. 
                  OAuth connections are simulated. Real platform integrations will be available in a future update.
                </p>
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
