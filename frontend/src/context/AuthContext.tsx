import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('[DEBUG-AUTH-FIX] checkAuth running, token exists:', !!token);
      
      if (!token) {
        console.log('[DEBUG-AUTH-FIX] No token found, setting unauthenticated state');
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        console.log('[DEBUG-AUTH-FIX] Token found, fetching user data');
        console.log('[DEBUG-AUTH-FIX] Token value:', token ? token.substring(0, 15) + '...' : 'null');
        console.log('[DEBUG-AUTH-FIX] Token length:', token ? token.length : 0);
        // Fetch user data
        const response = await authApi.getUser();
        console.log('[DEBUG-AUTH-FIX] User data fetch successful:', response.data ? {
          id: response.data.id,
          email: response.data.email,
          hasAgent: !!response.data.agent
        } : 'No data returned');
        
        setUser(response.data);
        setIsAuthenticated(true);
        console.log('[DEBUG-AUTH-FIX] Authentication successful, user set');
        
        // Check if we should redirect to onboarding
        const shouldRedirectToOnboarding = response.data?.agent && !response.data.agent.onboardingCompleted;
        const isRegistration = localStorage.getItem('just_registered') === 'true';
        
        console.log('[DEBUG-AUTH-FIX] Onboarding check:', {
          shouldRedirect: shouldRedirectToOnboarding,
          isRegistration: isRegistration,
          onboardingCompleted: response.data?.agent?.onboardingCompleted
        });
        
        if (isRegistration && shouldRedirectToOnboarding) {
          console.log('[DEBUG-AUTH-FIX] New registration detected, redirecting to onboarding');
          localStorage.removeItem('just_registered');
          setTimeout(() => {
            window.location.href = '/onboarding';
          }, 100);
        }
      } catch (error) {
        console.error('[DEBUG-AUTH] Auth check failed:', error);
        // Token invalid, clear it
        localStorage.removeItem('token');
        console.log('[DEBUG-AUTH] Token removed due to authentication failure');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('[DEBUG-AUTH] Authentication check completed, loading set to false');
      }
    };
    
    checkAuth();
  }, []);

  const login = (token: string) => {
    console.log('[DEBUG-AUTH-FIX] Login called with token:', token ? token.substring(0, 15) + '...' : 'null');
    console.log('[DEBUG-AUTH-FIX] Token length:', token ? token.length : 0);
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    // Fetch user data after login
    fetchUser(token);
  };

  const fetchUser = async (token: string) => {
    try {
      console.log('[DEBUG-AUTH] Fetching user data after login');
      const response = await authApi.getUser();
      console.log('[DEBUG-AUTH] User data fetch successful after login:', response.data ? {
        id: response.data.id,
        email: response.data.email,
        hasAgent: !!response.data.agent,
        agentData: response.data.agent ? {
          id: response.data.agent.id,
          onboardingCompleted: response.data.agent.onboardingCompleted
        } : null
      } : 'No data returned');
      
      setUser(response.data);
    } catch (error) {
      console.error('[DEBUG-AUTH] Failed to fetch user data after login:', error);
    }
  };

  const logout = () => {
    console.log('[DEBUG-AUTH] Logout called');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;