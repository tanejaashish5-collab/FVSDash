import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fv_token'));
  const [loading, setLoading] = useState(true);
  
  // Onboarding state - session-level flag (resets on new login)
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Impersonation state (admin only)
  const [impersonatedClientId, setImpersonatedClientId] = useState(
    localStorage.getItem('fv_impersonated_client_id')
  );
  const [impersonatedClientName, setImpersonatedClientName] = useState(
    localStorage.getItem('fv_impersonated_client_name')
  );

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setUser(res.data);
          // Check if we should show onboarding (non-admin users who haven't completed it)
          if (res.data.role !== 'admin' && res.data.onboardingComplete === false) {
            setShowOnboarding(true);
          }
        })
        .catch(() => {
          localStorage.removeItem('fv_token');
          localStorage.removeItem('fv_impersonated_client_id');
          localStorage.removeItem('fv_impersonated_client_name');
          setToken(null);
          setImpersonatedClientId(null);
          setImpersonatedClientName(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('fv_token', newToken);
    // Clear any impersonation state on new login
    localStorage.removeItem('fv_impersonated_client_id');
    localStorage.removeItem('fv_impersonated_client_name');
    setToken(newToken);
    setUser(userData);
    setImpersonatedClientId(null);
    setImpersonatedClientName(null);
    // Check if we should show onboarding for this user (non-admin who hasn't completed it)
    if (userData.role !== 'admin' && userData.onboardingComplete === false) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
    return userData;
  };

  const signup = async (email, password, name) => {
    const res = await axios.post(`${API}/auth/signup`, { email, password, name });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('fv_token', newToken);
    setToken(newToken);
    setUser(userData);
    // New signups always show onboarding (non-admin)
    if (userData.role !== 'admin') {
      setShowOnboarding(true);
    }
    return userData;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('fv_token');
    localStorage.removeItem('fv_impersonated_client_id');
    localStorage.removeItem('fv_impersonated_client_name');
    setToken(null);
    setUser(null);
    setImpersonatedClientId(null);
    setImpersonatedClientName(null);
    setShowOnboarding(false);
  }, []);

  // Dismiss onboarding modal (called after PATCH /api/auth/me/onboarding)
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    // Update local user state to reflect onboarding complete
    setUser(prev => prev ? { ...prev, onboardingComplete: true } : prev);
  }, []);

  // Impersonation functions (admin only)
  const startImpersonation = useCallback((clientId, clientName) => {
    if (user?.role !== 'admin') {
      console.warn('Only admins can impersonate clients');
      return;
    }
    localStorage.setItem('fv_impersonated_client_id', clientId);
    localStorage.setItem('fv_impersonated_client_name', clientName);
    setImpersonatedClientId(clientId);
    setImpersonatedClientName(clientName);
  }, [user]);

  const stopImpersonation = useCallback(() => {
    localStorage.removeItem('fv_impersonated_client_id');
    localStorage.removeItem('fv_impersonated_client_name');
    setImpersonatedClientId(null);
    setImpersonatedClientName(null);
  }, []);

  // Determine the effective client ID for data fetching
  // If admin is impersonating, use impersonated client ID
  // Otherwise use the user's own client ID
  const effectiveClientId = (user?.role === 'admin' && impersonatedClientId) 
    ? impersonatedClientId 
    : user?.clientId;

  const isImpersonating = user?.role === 'admin' && impersonatedClientId !== null;

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  
  // Helper to get API params including impersonation if active
  const getApiParams = useCallback((additionalParams = {}) => {
    const params = { ...additionalParams };
    if (user?.role === 'admin' && impersonatedClientId) {
      params.impersonateClientId = impersonatedClientId;
    }
    return params;
  }, [user, impersonatedClientId]);

  // Helper to build URL with impersonation param
  const buildApiUrl = useCallback((baseUrl) => {
    if (user?.role === 'admin' && impersonatedClientId) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}impersonateClientId=${impersonatedClientId}`;
    }
    return baseUrl;
  }, [user, impersonatedClientId]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      signup, 
      logout, 
      authHeaders,
      // Onboarding
      showOnboarding,
      dismissOnboarding,
      // Impersonation
      impersonatedClientId,
      impersonatedClientName,
      startImpersonation,
      stopImpersonation,
      isImpersonating,
      effectiveClientId,
      getApiParams,
      buildApiUrl
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
