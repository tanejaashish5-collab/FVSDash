/**
 * usePipelineEvents — subscribes to the SSE /api/pipeline/events stream.
 *
 * Fires `onEvent(event)` for every message received.
 * Handles reconnection automatically (browser native SSE behaviour).
 *
 * Usage:
 *   usePipelineEvents((event) => {
 *     if (event.type === 'submission_status') {
 *       setSubmissions(prev => prev.map(s =>
 *         s.id === event.data.id ? { ...s, status: event.data.status } : s
 *       ));
 *     }
 *   });
 */
import { useEffect, useRef } from 'react';

const API = process.env.REACT_APP_BACKEND_URL;

export function usePipelineEvents(onEvent, enabled = true) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;  // always call the latest version without resubscribing

  useEffect(() => {
    if (!enabled || !API) return;

    // Retrieve auth token from localStorage (same key used by AuthContext)
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${API}/api/pipeline/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== 'ping') {
          onEventRef.current(event);
        }
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      // EventSource retries automatically — no manual action needed
    };

    return () => es.close();
  }, [enabled]);
}
