'use client';
import React, { useState } from 'react';
import Icons from '../components/Icons';
import { useSettings } from '../lib/SettingsProvider';
import { Goal, Integration } from '../types';

const SettingsWidget: React.FC<{ title: string; subtitle: string; children: React.ReactNode; }> = ({ title, subtitle, children }) => (
    <div className="bg-[#121212] rounded-lg border border-[#2A2A2A]">
        <div className="p-6 border-b border-[#2A2A2A]">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const IntegrationCard: React.FC<{
    integration: Integration;
    onToggle: (id: Integration['id'], status: boolean) => void;
}> = ({ integration, onToggle }) => (
    <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                {integration.icon}
            </div>
            <div>
                <p className="font-bold text-white">{integration.name}</p>
                <p className="text-xs text-gray-400">{integration.description}</p>
            </div>
        </div>
        <button
            onClick={() => onToggle(integration.id, !integration.isConnected)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                integration.isConnected
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            }`}
        >
            {integration.isConnected ? 'Disconnect' : 'Connect'}
        </button>
    </div>
);

const GoalEditor: React.FC<{ goal: Goal, onUpdate: (id: string, newGoal: Partial<Goal>) => void }> = ({ goal, onUpdate }) => {
    const [current, setCurrent] = useState(goal.current);
    const progress = (current / goal.target) * 100;

    return (
        <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <p className="font-semibold text-white">{goal.description}</p>
            <div className="flex items-center gap-4 my-2">
                <div className="h-2 flex-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
                <input
                    type="number"
                    value={current}
                    onChange={(e) => setCurrent(Number(e.target.value))}
                    onBlur={() => onUpdate(goal.id, { current })}
                    className="w-24 bg-[#121212] rounded-md p-1 text-center outline-none ring-1 ring-[#2A2A2A] focus:ring-[#F1C87A]"
                />
                <span>/ {goal.target.toLocaleString()}{goal.suffix}</span>
            </div>
        </div>
    );
};

const useDummyToasts = () => ({
    addToast: (toast: any) => console.info('Toast:', toast)
});

export default function SettingsPage() {
    const { settings, updateIntegrationStatus, updateCompetitorName, updateGoal, updateAirtableConfig } = useSettings();
    const { addToast } = useDummyToasts();

    const handleToggleIntegration = (id: 'googleAnalytics' | 'crm', status: boolean) => {
        updateIntegrationStatus(id, status);
        addToast({
            title: `Integration ${status ? 'Connected' : 'Disconnected'}`,
            message: `${settings.integrations.find(i => i.id === id)?.name} has been updated.`,
            type: 'info',
        });
    };

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B] space-y-8">
            {/* Header */}
            <div>
                <p className="text-lg font-semibold text-[#F1C87A]">SETTINGS & CONFIGURATION</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Dashboard Settings</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <SettingsWidget
                        title="Integrations"
                        subtitle="Connect your dashboard to other platforms for live data."
                    >
                        <div className="space-y-4">
                            {settings.integrations.map(int => (
                                <IntegrationCard key={int.id} integration={int} onToggle={handleToggleIntegration} />
                            ))}
                        </div>
                    </SettingsWidget>
                    
                    <SettingsWidget
                        title="Airtable Integration"
                        subtitle="Connect your historical performance data for hyper-personalized AI insights."
                    >
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="airtable-api-key" className="block text-sm font-medium text-gray-300 mb-1">Personal Access Token (PAT)</label>
                                <input
                                    id="airtable-api-key"
                                    type="password"
                                    value={settings.airtable.apiKey}
                                    onChange={(e) => updateAirtableConfig('apiKey', e.target.value)}
                                    className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]"
                                />
                            </div>
                             <div>
                                <label htmlFor="airtable-base-id" className="block text-sm font-medium text-gray-300 mb-1">Base ID</label>
                                <input
                                    id="airtable-base-id"
                                    value={settings.airtable.baseId}
                                    onChange={(e) => updateAirtableConfig('baseId', e.target.value)}
                                    className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]"
                                />
                            </div>
                             <div>
                                <label htmlFor="airtable-table-name" className="block text-sm font-medium text-gray-300 mb-1">Table Name</label>
                                <input
                                    id="airtable-table-name"
                                    value={settings.airtable.tableName}
                                    onChange={(e) => updateAirtableConfig('tableName', e.target.value)}
                                    className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]"
                                />
                            </div>
                        </div>
                    </SettingsWidget>

                    <SettingsWidget
                        title="Competitor Tracking"
                        subtitle="Define competitors for the Share of Voice chart in Analytics."
                    >
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="competitor1" className="block text-sm font-medium text-gray-300 mb-1">Competitor A</label>
                                <input
                                    id="competitor1"
                                    value={settings.competitors.name1}
                                    onChange={(e) => updateCompetitorName('name1', e.target.value)}
                                    className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]"
                                />
                            </div>
                            <div>
                                <label htmlFor="competitor2" className="block text-sm font-medium text-gray-300 mb-1">Competitor B</label>
                                <input
                                    id="competitor2"
                                    value={settings.competitors.name2}
                                    onChange={(e) => updateCompetitorName('name2', e.target.value)}
                                    className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]"
                                />
                            </div>
                        </div>
                    </SettingsWidget>
                </div>
                <div className="lg:col-span-1">
                    <SettingsWidget
                        title="Quarterly Goals"
                        subtitle="Set and track your key business objectives."
                    >
                        <div className="space-y-4">
                            {settings.goals.map(goal => (
                                <GoalEditor key={goal.id} goal={goal} onUpdate={updateGoal} />
                            ))}
                        </div>
                    </SettingsWidget>
                </div>
            </div>
        </main>
    );
}
