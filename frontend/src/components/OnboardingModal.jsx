import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, FileText, Brain, Share2, ArrowRight, Check
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ONBOARDING_STEPS = [
  {
    id: 'brand-brain',
    title: 'Set up your Brand Brain',
    description: 'Configure your channel identity, tone, and content pillars',
    icon: Sparkles,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    path: '/dashboard/settings',
    buttonText: 'Go to Brand Brain'
  },
  {
    id: 'submission',
    title: 'Submit your first episode',
    description: 'Add a source file or Google Drive link to start production',
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    path: '/dashboard/submissions',
    buttonText: 'Go to Submissions'
  },
  {
    id: 'fvs',
    title: 'Run the FVS Brain',
    description: 'Let AI generate episode ideas based on your channel data',
    icon: Brain,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    path: '/dashboard/system',
    buttonText: 'Go to FVS System'
  },
  {
    id: 'publishing',
    title: 'Connect your social accounts',
    description: 'Link YouTube Shorts, TikTok, or Instagram to enable publishing',
    icon: Share2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    path: '/dashboard/settings?tab=publishing',
    buttonText: 'Go to Publishing Settings'
  }
];

export default function OnboardingModal({ open, onDismiss, authHeaders }) {
  const navigate = useNavigate();
  const [checkedSteps, setCheckedSteps] = useState({});
  const [dismissing, setDismissing] = useState(false);

  const allChecked = ONBOARDING_STEPS.every(step => checkedSteps[step.id]);

  const handleCheckStep = (stepId) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleDismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      await axios.patch(`${API}/auth/me/onboarding`, {
        onboarding_complete: true
      }, { headers: authHeaders });
      onDismiss();
    } catch (err) {
      console.error('Failed to update onboarding status:', err);
      // Still dismiss the modal even if the API fails
      onDismiss();
    } finally {
      setDismissing(false);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    // Don't auto-dismiss when navigating - let user complete steps
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss(); }}>
      <DialogContent 
        className="bg-[#0B1120] border-[#1F2933] sm:max-w-[520px] p-0 overflow-hidden"
        data-testid="onboarding-modal"
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Welcome to ForgeVoice Studio 👋
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 mt-1">
            Get set up in 4 steps to start producing AI-powered content.
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-[#1F2933]" />

        <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {ONBOARDING_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isChecked = checkedSteps[step.id];
            
            return (
              <div 
                key={step.id}
                className={`p-4 rounded-lg border transition-colors ${
                  isChecked 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : 'border-[#1F2933] bg-zinc-900/30 hover:border-zinc-700'
                }`}
                data-testid={`onboarding-step-${step.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      id={`step-${step.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleCheckStep(step.id)}
                      className="mt-0.5 border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      data-testid={`checkbox-${step.id}`}
                    />
                    <div className={`h-8 w-8 rounded-lg ${step.bg} flex items-center justify-center shrink-0`}>
                      <StepIcon className={`h-4 w-4 ${step.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={`step-${step.id}`}
                        className={`text-sm font-medium cursor-pointer ${isChecked ? 'text-emerald-400 line-through' : 'text-white'}`}
                      >
                        Step {idx + 1}: {step.title}
                      </label>
                      <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate(step.path)}
                    className="h-8 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/5 shrink-0"
                    data-testid={`goto-${step.id}`}
                  >
                    {step.buttonText}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="bg-[#1F2933]" />

        <DialogFooter className="px-6 py-4 flex-row justify-between sm:justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={dismissing}
            className="text-zinc-400 hover:text-white hover:bg-white/5 h-9 text-sm"
            data-testid="skip-onboarding"
          >
            Skip for now
          </Button>
          {allChecked && (
            <Button
              onClick={handleDismiss}
              disabled={dismissing}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium h-9 text-sm gap-2"
              data-testid="complete-onboarding"
            >
              <Check className="h-4 w-4" />
              I'm all set — let's go!
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
