/**
 * YouTube OAuth API wrapper with automatic token refresh.
 * Intercepts 401 errors from YouTube-related endpoints and attempts to refresh the token.
 */
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * YouTube-related API endpoints that may need token refresh
 */
const YOUTUBE_ENDPOINTS = [
  '/api/analytics/overview',
  '/api/analytics/videos',
  '/api/analytics/dashboard',
  '/api/oauth/youtube/sync',
  '/api/trends/recommendations',
  '/api/trends/competitors',
  '/api/trends/scan',
];

/**
 * Check if the endpoint is YouTube-related
 */
const isYouTubeEndpoint = (url) => {
  return YOUTUBE_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

/**
 * Attempt to refresh the YouTube OAuth token
 */
const refreshYouTubeToken = async (authHeaders) => {
  try {
    const response = await axios.post(`${API}/api/oauth/refresh/youtube`, {}, {
      headers: authHeaders
    });
    return response.data.success;
  } catch (error) {
    console.error('YouTube token refresh failed:', error);
    return false;
  }
};

/**
 * Create an axios instance with YouTube token refresh interceptor
 */
export const createYouTubeAwareAxios = (authHeaders) => {
  const instance = axios.create();
  
  // Track if we're currently refreshing to avoid infinite loops
  let isRefreshing = false;
  let refreshPromise = null;
  
  instance.interceptors.response.use(
    // Success - pass through
    (response) => response,
    // Error handler
    async (error) => {
      const originalRequest = error.config;
      
      // Only handle 401 errors on YouTube endpoints that haven't been retried
      if (
        error.response?.status === 401 &&
        isYouTubeEndpoint(originalRequest.url) &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        
        // If already refreshing, wait for that to complete
        if (isRefreshing) {
          try {
            await refreshPromise;
            return instance(originalRequest);
          } catch {
            return Promise.reject(error);
          }
        }
        
        isRefreshing = true;
        refreshPromise = refreshYouTubeToken(authHeaders);
        
        try {
          const refreshed = await refreshPromise;
          isRefreshing = false;
          
          if (refreshed) {
            // Token refreshed successfully, retry the original request
            return instance(originalRequest);
          } else {
            // Refresh failed, show user-friendly message
            toast.error('YouTube session expired. Please reconnect your channel.', {
              action: {
                label: 'Reconnect',
                onClick: () => window.location.href = '/dashboard/settings?tab=integrations'
              }
            });
          }
        } catch {
          isRefreshing = false;
        }
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};

/**
 * Hook-friendly wrapper for YouTube API calls with auto-refresh
 */
export const youtubeApiCall = async (method, url, authHeaders, data = null) => {
  const fullUrl = url.startsWith('http') ? url : `${API}${url}`;
  
  try {
    const response = method === 'GET' 
      ? await axios.get(fullUrl, { headers: authHeaders })
      : await axios.post(fullUrl, data, { headers: authHeaders });
    return response;
  } catch (error) {
    // If 401, try to refresh token
    if (error.response?.status === 401 && isYouTubeEndpoint(url)) {
      const refreshed = await refreshYouTubeToken(authHeaders);
      
      if (refreshed) {
        // Retry the original request
        const retryResponse = method === 'GET'
          ? await axios.get(fullUrl, { headers: authHeaders })
          : await axios.post(fullUrl, data, { headers: authHeaders });
        return retryResponse;
      } else {
        // Show reconnect prompt
        toast.error('YouTube session expired. Please reconnect your channel.', {
          duration: 5000,
          action: {
            label: 'Settings',
            onClick: () => window.location.href = '/dashboard/settings?tab=integrations'
          }
        });
      }
    }
    
    throw error;
  }
};

export { createYouTubeAwareAxios, youtubeApiCall, refreshYouTubeToken };
