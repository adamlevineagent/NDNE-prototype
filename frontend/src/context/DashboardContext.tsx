import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface DashboardContextType {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  issues: any[];
  setIssues: (issues: any[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('positions');
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch issues from API
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First, try to get agent data to check if onboarding is complete
      const agentResponse = await fetch('/api/agents/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!agentResponse.ok) {
        throw new Error('Failed to fetch agent data');
      }
      
      const agentData = await agentResponse.json();
      console.log('[DEBUG_DASHBOARD_CONTEXT] Agent data:', agentData);
      
      // Then get the issues data
      const response = await fetch('/api/issues/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch issues');
      
      const data = await response.json();
      console.log('[DEBUG_DASHBOARD_CONTEXT] Issues data:', data);
      
      // Check if we have issues data
      if (Array.isArray(data) && data.length > 0) {
        setIssues(data);
      } else if (agentData?.preferences?.issuesMatrix &&
                 Array.isArray(agentData.preferences.issuesMatrix) &&
                 agentData.preferences.issuesMatrix.length > 0) {
        // Fallback to preferences.issuesMatrix if the issues API didn't return data
        console.log('[DEBUG_DASHBOARD_CONTEXT] Using issuesMatrix from agent preferences');
        setIssues(agentData.preferences.issuesMatrix);
      } else {
        console.log('[DEBUG_DASHBOARD_CONTEXT] No issues data found');
      }
    } catch (err: any) {
      console.error('[DEBUG_DASHBOARD_CONTEXT] Error loading data:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <DashboardContext.Provider value={{
      currentTab,
      setCurrentTab,
      issues,
      setIssues,
      isLoading,
      setIsLoading,
      error,
      setError,
      refreshData
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};