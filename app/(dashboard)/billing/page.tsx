import React from 'react';
import {
    DEFAULT_SUBSCRIPTION_PLAN,
    DEFAULT_PAYMENT_METHOD,
    DEFAULT_INVOICES
} from '@/constants';
import { SubscriptionPlan, PaymentMethod, Invoice } from '@/types';
import Icons from '@/components/Icons';

const BillingWidget: React.FC<{
    title: string;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
}> = ({ title, children, className, actions }) => (
    <div className={`bg-[#121212] rounded-lg border border-[#2A2A2A] ${className}`}>
        <div className="flex justify-between items-center p-6 border-b border-[#2A2A2A]">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const UsageBar: React.FC<{
    label: string;
    current: number;
    limit: number;
}> = ({ label, current, limit }) => {
    const percentage = limit > 0 ? (current / limit) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">{label}</span>
                <span className="text-sm text-gray-400">{current} / {limit}</span>
            </div>
            <div className="h-2 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#F1C87A] rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const InvoiceHistoryTable: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
    const getStatusPill = (status: Invoice['status']) => {
        switch (status) {
            case 'Paid':
                return 'bg-green-500/10 text-green-400';
            case 'Due':
                return 'bg-yellow-500/10 text-yellow-400';
            case 'Overdue':
                return 'bg-red-500/10 text-red-400';
            default:
                return 'bg-gray-500/10 text-gray-400';
        }
    };
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#2A2A2A] text-[#B3B3B3] uppercase tracking-wider text-xs">
                    <tr>
                        <th className="p-4">Invoice ID</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right"></th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.map(invoice => (
                        <tr key={invoice.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]/50 transition-colors">
                            <td className="p-4 font-mono text-gray-400">#{invoice.id.split('_')[1]}</td>
                            <td className="p-4 text-white">{new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                            <td className="p-4 text-white font-semibold">${invoice.amount.toFixed(2)}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusPill(invoice.status)}`}>
                                    {invoice.status}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <a href={invoice.downloadUrl} className="flex items-center justify-end gap-2 text-[#F1C87A] hover:underline">
                                    <Icons.Download /> Download
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function BillingPage() {
    const plan = DEFAULT_SUBSCRIPTION_PLAN;
    const paymentMethod = DEFAULT_PAYMENT_METHOD;
    const invoices = DEFAULT_INVOICES;

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B] space-y-8">
            {/* Header */}
            <div>
                <p className="text-lg font-semibold text-[#F1C87A]">BILLING & SUBSCRIPTION</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Manage Your Account</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Plan & Payment */}
                <div className="lg:col-span-1 space-y-8">
                    <BillingWidget title="Current Plan">
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-2xl font-bold text-[#F1C87A]">{plan.name}</span>
                                <p className="text-white"><span className="text-4xl font-bold">${plan.price}</span><span className="text-gray-400">/mo</span></p>
                            </div>
                            <p className="text-sm text-gray-400">
                                Your plan renews on {new Date(plan.nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                            </p>
                            <ul className="space-y-3 pt-4">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <Icons.CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                        <span className="text-gray-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button className="w-full mt-4 px-4 py-3 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform flex items-center justify-center gap-2">
                                <Icons.Manage /> Manage Subscription
                            </button>
                            <p className="text-xs text-center text-gray-500">You will be redirected to our secure payment provider.</p>
                        </div>
                    </BillingWidget>

                    <BillingWidget title="Payment Method">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-8 bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                                <Icons.CreditCard className="text-[#F1C87A] w-8 h-8"/>
                            </div>
                            <div>
                                <p className="font-semibold text-white">{paymentMethod.type} ending in {paymentMethod.last4}</p>
                                <p className="text-sm text-gray-400">Expires {String(paymentMethod.expiryMonth).padStart(2, '0')}/{paymentMethod.expiryYear}</p>
                            </div>
                        </div>
                        <button className="w-full mt-6 px-4 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all">
                           Update Payment Method
                        </button>
                    </BillingWidget>
                </div>
                
                {/* Right Column: Invoices & Usage */}
                <div className="lg:col-span-2 space-y-8">
                     <BillingWidget title="Usage This Period">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <UsageBar label="Podcasts" current={plan.usage.podcasts.current} limit={plan.usage.podcasts.limit} />
                           <UsageBar label="Shorts" current={plan.usage.shorts.current} limit={plan.usage.shorts.limit} />
                           <UsageBar label="Blogs" current={plan.usage.blogs.current} limit={plan.usage.blogs.limit} />
                        </div>
                    </BillingWidget>

                    <BillingWidget title="Invoice History" className="!p-0">
                       <InvoiceHistoryTable invoices={invoices} />
                    </BillingWidget>
                </div>
            </div>

        </main>
    );
};