import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Sentry error tracking — only active when REACT_APP_SENTRY_DSN is set
const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
if (sentryDsn) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }).catch(() => { /* sentry-sdk not installed — silent skip */ });
}

document.documentElement.classList.add('dark');

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
