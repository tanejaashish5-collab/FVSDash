
import React, { createContext, useContext, useCallback } from 'react';

export const AnalyticsContext = createContext({ logEvent: (event: string, data?: any) => {} });

export const useAnalytics = () => useContext(AnalyticsContext);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const logEvent = useCallback((event: string, data?: any) => console.info(`[Analytics] Event: ${event}`, data), []);
    return <AnalyticsContext.Provider value={{ logEvent }}>{children}</AnalyticsContext.Provider>;
};
