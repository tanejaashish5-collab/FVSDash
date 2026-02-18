import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, DollarSign, Clock, MessageSquare, User, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsPage() {
  const { authHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    hourlyRate: 100,
    hoursPerEpisode: 5,
    brandVoiceDescription: '',
    primaryContactName: '',
    primaryContactEmail: '',
    clientName: '',
  });

  const fetchSettings = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/settings`, { headers: authHeaders })
      .then(res => setSettings(res.data))
      .catch(err => {
        toast.error('Failed to load settings');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (settings.hourlyRate < 0) {
      toast.error('Hourly rate must be non-negative');
      return;
    }
    if (settings.hoursPerEpisode <= 0) {
      toast.error('Hours per episode must be positive');
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/settings`, {
        hourlyRate: parseFloat(settings.hourlyRate) || 0,
        hoursPerEpisode: parseFloat(settings.hoursPerEpisode) || 5,
        brandVoiceDescription: settings.brandVoiceDescription,
        primaryContactName: settings.primaryContactName,
        primaryContactEmail: settings.primaryContactEmail,
      }, { headers: authHeaders });
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="settings-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Configure your account and content preferences.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business & ROI Settings */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="business-settings-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-zinc-400" />
                Business & ROI Settings
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Used for ROI calculations in the ROI Center.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  Hourly Rate ($)
                </Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.hourlyRate}
                  onChange={(e) => handleChange('hourlyRate', e.target.value)}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                  data-testid="input-hourly-rate"
                />
                <p className="text-[10px] text-zinc-600">Your hourly rate for content production work.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hoursPerEpisode" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Hours per Episode
                </Label>
                <Input
                  id="hoursPerEpisode"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={settings.hoursPerEpisode}
                  onChange={(e) => handleChange('hoursPerEpisode', e.target.value)}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                  data-testid="input-hours-per-episode"
                />
                <p className="text-[10px] text-zinc-600">Average hours spent producing each episode.</p>
              </div>

              <div className="p-3 rounded-md bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-xs text-zinc-400">
                  <span className="text-indigo-400 font-medium">Cost per Episode:</span>{' '}
                  ${((parseFloat(settings.hourlyRate) || 0) * (parseFloat(settings.hoursPerEpisode) || 0)).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Brand & Contact Details */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="brand-settings-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-zinc-400" />
                Brand & Contact Details
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Your brand voice and primary contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="brandVoice" className="text-xs font-medium text-zinc-400">
                  Brand Voice Description
                </Label>
                <Textarea
                  id="brandVoice"
                  value={settings.brandVoiceDescription}
                  onChange={(e) => handleChange('brandVoiceDescription', e.target.value)}
                  placeholder="Describe your brand's tone, style, and personality..."
                  className="min-h-[100px] bg-zinc-950 border-zinc-800 text-white resize-none"
                  data-testid="input-brand-voice"
                />
                <p className="text-[10px] text-zinc-600">Helps our team match your content to your brand.</p>
              </div>

              <Separator className="bg-[#1F2933]" />

              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Primary Contact Name
                </Label>
                <Input
                  id="contactName"
                  type="text"
                  value={settings.primaryContactName}
                  onChange={(e) => handleChange('primaryContactName', e.target.value)}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                  data-testid="input-contact-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  Primary Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.primaryContactEmail}
                  onChange={(e) => handleChange('primaryContactEmail', e.target.value)}
                  className="h-9 bg-zinc-950 border-zinc-800 text-white"
                  data-testid="input-contact-email"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button */}
      {!loading && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-6 bg-indigo-500 hover:bg-indigo-600 text-white"
            data-testid="save-settings-btn"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
