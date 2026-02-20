import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, Check, Calendar, AlertCircle, Zap, 
  ArrowUpRight, Shield, Settings, HelpCircle, ExternalLink, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { AuraTooltip } from '@/components/ui/AuraTooltip';
import { tooltipContent } from '@/constants/tooltipContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusCfg = {
  Active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  PastDue: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  past_due: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  Cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

const planColors = {
  Starter: 'border-zinc-600',
  starter: 'border-zinc-600',
  Pro: 'border-indigo-500',
  pro: 'border-indigo-500',
  Enterprise: 'border-violet-500',
  enterprise: 'border-violet-500',
};

function PlanCard({ plan, price, features, isCurrent, onSelect }) {
  const borderColor = planColors[plan] || 'border-zinc-600';
  
  return (
    <Card 
      className={`bg-[#0B1120] ${isCurrent ? borderColor : 'border-[#1F2933]'} ${isCurrent ? 'ring-1 ring-inset ring-indigo-500/30' : ''}`}
      data-testid={`plan-card-${plan.toLowerCase()}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{plan}</h3>
          {isCurrent && (
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">
              Current Plan
            </Badge>
          )}
        </div>
        <div className="mb-4">
          <span className="text-3xl font-bold text-white">${price}</span>
          <span className="text-xs text-zinc-500">/month</span>
        </div>
        <ul className="space-y-2 mb-5">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {!isCurrent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(plan)}
            className="w-full h-8 text-xs bg-zinc-950 border-zinc-800 hover:border-indigo-500/30 text-zinc-300"
          >
            {price > 299 ? 'Contact Sales' : 'Select Plan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/billing/dashboard`, { headers: authHeaders })
      .then(res => setData(res.data))
      .catch(err => {
        toast.error('Failed to load billing data');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStripeAction = (action) => {
    toast.info(`Stripe integration is not yet connected in this environment.`, {
      description: `"${action}" will be available once Stripe is configured.`,
    });
  };

  const handlePlanSelect = (plan) => {
    toast.info(`Stripe integration is not yet connected in this environment.`, {
      description: `Upgrading to "${plan}" will be available once Stripe is configured.`,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div data-testid="billing-page" className="space-y-6">
      {/* Page Header */}
      <div>
        <AuraTooltip content={tooltipContent.billing.currentPlan} position="right">
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Billing
          </h1>
        </AuraTooltip>
        <p className="text-sm text-zinc-500 mt-0.5">Your subscription and payment details.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.billing ? (
        <Card className="bg-[#0B1120] border-[#1F2933]">
          <CardContent className="py-16 text-center">
            <CreditCard className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No billing information is configured yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Please contact support to set up your subscription.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-8 text-xs bg-zinc-950 border-zinc-800 hover:border-indigo-500/30 text-zinc-300"
              onClick={() => toast.info('Contact support at support@forgevoice.com')}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Plan Card */}
          <Card className="bg-[#0B1120] border-[#1F2933]" data-testid="current-plan-card">
            <CardHeader className="pb-3">
              <AuraTooltip content={tooltipContent.billing.currentPlan} position="right">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-400" />
                  Current Subscription
                </CardTitle>
              </AuraTooltip>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{data.currentPlan} Plan</h2>
                    {(() => {
                      const status = data.billing?.status || 'Active';
                      const sc = statusCfg[status] || statusCfg.Active;
                      return (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                          {status}
                        </Badge>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-zinc-400 mb-4">
                    ${data.planDetails?.price || 299}/month
                  </p>
                  
                  {data.billing?.nextBillingDate && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <AuraTooltip content={tooltipContent.billing.nextBillingDate} position="top">
                        <span>Next billing: {formatDate(data.billing.nextBillingDate)}</span>
                      </AuraTooltip>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <AuraTooltip content={tooltipContent.billing.paymentMethod} position="top">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStripeAction('Update payment method')}
                      className="h-8 text-xs bg-zinc-950 border-zinc-800 hover:border-indigo-500/30 text-zinc-300"
                      data-testid="update-payment-btn"
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      Update Payment
                    </Button>
                  </AuraTooltip>
                  <AuraTooltip content={tooltipContent.billing.upgradePlan} position="top">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStripeAction('Change plan')}
                      className="h-8 text-xs bg-zinc-950 border-zinc-800 hover:border-indigo-500/30 text-zinc-300"
                      data-testid="change-plan-btn"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                      Change Plan
                    </Button>
                  </AuraTooltip>
                </div>
              </div>

              <Separator className="bg-[#1F2933] my-5" />

              {/* Plan Features */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">Plan Features</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.planDetails?.features?.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Integration Placeholder */}
          <Card className="bg-[#0B1120] border-[#1F2933] border-dashed" data-testid="stripe-placeholder">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1">Stripe Integration Coming Soon</h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    Secure payment processing, automatic invoicing, and seamless plan management will be available once Stripe is connected.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-zinc-950 border-zinc-800 text-zinc-400">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Secure Payments
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-zinc-950 border-zinc-800 text-zinc-400">
                      <Zap className="h-3 w-3 mr-1" />
                      Auto-Invoicing
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-zinc-950 border-zinc-800 text-zinc-400">
                      <Settings className="h-3 w-3 mr-1" />
                      Plan Management
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Plans */}
          <div>
            <AuraTooltip content={tooltipContent.billing.usageThisMonth} position="right">
              <h2 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Available Plans
              </h2>
            </AuraTooltip>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.allPlans || {}).map(([plan, details]) => (
                <PlanCard
                  key={plan}
                  plan={plan}
                  price={details.price}
                  features={details.features}
                  isCurrent={plan === data.currentPlan}
                  onSelect={handlePlanSelect}
                />
              ))}
            </div>
          </div>

          {/* Client Info */}
          {data.client && (
            <Card className="bg-[#0B1120] border-[#1F2933]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white">Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Account Name</p>
                    <p className="text-zinc-300">{data.client.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Primary Contact</p>
                    <p className="text-zinc-300">{data.client.primaryContactEmail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
