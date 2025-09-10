import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as Sentry from '@sentry/react';
import { AnalyticsProvider } from './lib/AnalyticsProvider';
import { SettingsProvider } from './lib/SettingsProvider';
import { AuthProvider } from './lib/AuthProvider';

// In a real-world application, this DSN would come from an environment variable
// and would be configured in your build process (e.g., process.env.REACT_APP_SENTRY_DSN)
Sentry.init({
  dsn: "https://a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6@o4507000000000000.ingest.sentry.io/4507000000000000",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, sample the whole session when an error occurs.
});


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AnalyticsProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </AnalyticsProvider>
    </AuthProvider>
  </React.StrictMode>
);