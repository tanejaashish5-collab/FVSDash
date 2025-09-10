'use client';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Settings, Goal } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface SettingsContextType {
    settings: Settings;
    updateIntegrationStatus: (id: 'googleAnalytics' | 'crm', isConnected: boolean) => void;
    updateCompetitorName: (competitor: 'name1' | 'name2', name: string) => void;
    updateGoal: (id: string, newGoal: Partial<Omit<Goal, 'id'>>) => void;
    updateAirtableConfig: (key: keyof Settings['airtable'], value: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('fvs_settings');
            if (savedSettings) {
                // A simple merge to prevent breaking changes if new settings are added
                const parsed = JSON.parse(savedSettings);
                setSettings(current => ({
                    ...current,
                    ...parsed,
                    competitors: { ...current.competitors, ...parsed.competitors },
                    airtable: { ...current.airtable, ...parsed.airtable },
                    // You might need a more robust merge for arrays if their structure can change
                }));
            }
        } catch (error) {
            console.error('Could not load settings from localStorage', error);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('fvs_settings', JSON.stringify(settings));
        }
    }, [settings, isInitialized]);

    const updateIntegrationStatus = (id: 'googleAnalytics' | 'crm', isConnected: boolean) => {
        setSettings(s => ({
            ...s,
            integrations: s.integrations.map(int =>
                int.id === id ? { ...int, isConnected } : int
            ),
        }));
    };

    const updateCompetitorName = (competitor: 'name1' | 'name2', name: string) => {
        setSettings(s => ({
            ...s,
            competitors: { ...s.competitors, [competitor]: name },
        }));
    };

    const updateGoal = (id: string, newGoal: Partial<Omit<Goal, 'id'>>) => {
        setSettings(s => ({
            ...s,
            goals: s.goals.map(g => (g.id === id ? { ...g, ...newGoal } : g)),
        }));
    };
    
    const updateAirtableConfig = (key: keyof Settings['airtable'], value: string) => {
        setSettings(s => ({
            ...s,
            airtable: {
                ...s.airtable,
                [key]: value,
            },
        }));
    };

    const value = { settings, updateIntegrationStatus, updateCompetitorName, updateGoal, updateAirtableConfig };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
