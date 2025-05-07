import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

// Define types for tab data
interface IssueType {
  id: string;
  title: string;
  description: string;
  stance?: string | null;
  reason?: string;
  isPriority?: boolean;
}

interface RecentActionType {
  id: string;
  type: 'vote' | 'comment';
  proposalTitle: string;
  proposalId: string;
  actionDetails: string;
  timestamp: string;
  canVeto: boolean;
  isOverridden: boolean;
}

interface ProposalType {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

// Define the type for the current tab data
interface CurrentTabDataType {
  positions?: {
    issues: IssueType[];
    selectedIssue?: IssueType | null;
  };
  activity?: {
    recentActions: RecentActionType[];
    selectedAction?: RecentActionType | null;
  };
  proposals?: {
    proposals: ProposalType[];
    selectedProposal?: ProposalType | null;
  };
}

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
  
  // New fields for enhanced context sharing
  currentTabData: CurrentTabDataType;
  setCurrentTabData: (data: CurrentTabDataType) => void;
  updateCurrentTabData: (data: Partial<CurrentTabDataType>) => void;
  selectIssue: (issueId: string | null) => void;
  selectAction: (actionId: string | null) => void;
  selectProposal: (proposalId: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('positions');
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the currentTabData state
  const [currentTabData, setCurrentTabData] = useState<CurrentTabDataType>({
    positions: { issues: [] },
    activity: { recentActions: [] },
    proposals: { proposals: [] }
  });

  // Function to update partial tab data
  const updateCurrentTabData = useCallback((data: Partial<CurrentTabDataType>) => {
    setCurrentTabData(prev => ({
      ...prev,
      ...data
    }));
  }, []);

  // Function to select a specific issue
  const selectIssue = useCallback((issueId: string | null) => {
    if (!issueId) {
      setCurrentTabData(prev => ({
        ...prev,
        positions: {
          ...prev.positions,
          selectedIssue: null
        }
      }));
      return;
    }
    
    setCurrentTabData(prev => {
      const issues = prev.positions?.issues || [];
      const selectedIssue = issues.find(issue => issue.id === issueId) || null;
      
      return {
        ...prev,
        positions: {
          ...prev.positions,
          selectedIssue
        }
      };
    });
  }, []);

  // Function to select a specific action
  const selectAction = useCallback((actionId: string | null) => {
    if (!actionId) {
      setCurrentTabData(prev => ({
        ...prev,
        activity: {
          ...prev.activity,
          selectedAction: null
        }
      }));
      return;
    }
    
    setCurrentTabData(prev => {
      const recentActions = prev.activity?.recentActions || [];
      const selectedAction = recentActions.find(action => action.id === actionId) || null;
      
      return {
        ...prev,
        activity: {
          ...prev.activity,
          selectedAction
        }
      };
    });
  }, []);

  // Function to select a specific proposal
  const selectProposal = useCallback((proposalId: string | null) => {
    if (!proposalId) {
      setCurrentTabData(prev => ({
        ...prev,
        proposals: {
          ...prev.proposals,
          selectedProposal: null
        }
      }));
      return;
    }
    
    setCurrentTabData(prev => {
      const proposals = prev.proposals?.proposals || [];
      const selectedProposal = proposals.find(proposal => proposal.id === proposalId) || null;
      
      return {
        ...prev,
        proposals: {
          ...prev.proposals,
          selectedProposal
        }
      };
    });
  }, []);

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
      
      // Determine which issues data to use
      const issuesData = Array.isArray(data) && data.length > 0
        ? data
        : (agentData?.preferences?.issuesMatrix &&
           Array.isArray(agentData.preferences.issuesMatrix) &&
           agentData.preferences.issuesMatrix.length > 0)
          ? agentData.preferences.issuesMatrix
          : [];
      
      // Update the regular issues state
      setIssues(issuesData);
      
      // Mock data for recent actions (in a real implementation, this would come from an API)
      const recentActions = [
        { id: 'v1', type: 'vote', proposalTitle: 'Increase Budget', proposalId: 'p1', actionDetails: 'Voted YES (Confidence: 90%)', timestamp: new Date(Date.now() - 3600000).toISOString(), canVeto: true, isOverridden: false },
        { id: 'c1', type: 'comment', proposalTitle: 'New Policy', proposalId: 'p2', actionDetails: 'Commented: "Looks good."', timestamp: new Date(Date.now() - 7200000).toISOString(), canVeto: false, isOverridden: false },
        { id: 'v2', type: 'vote', proposalTitle: 'Old Proposal', proposalId: 'p3', actionDetails: 'Voted NO (Confidence: 75%)', timestamp: new Date(Date.now() - 86400000).toISOString(), canVeto: false, isOverridden: true },
      ];
      
      // Mock data for proposals (in a real implementation, this would come from an API)
      const proposals = [
        { id: 'p1', title: 'Increase Budget', description: 'A proposal to increase the operational budget by 10%.', type: 'monetary', status: 'open', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'p2', title: 'New Policy', description: 'Implementing a new policy for remote work.', type: 'standard', status: 'open', createdAt: new Date(Date.now() - 172800000).toISOString() },
        { id: 'p3', title: 'Old Proposal', description: 'A previously discussed proposal that was voted down.', type: 'standard', status: 'closed', createdAt: new Date(Date.now() - 259200000).toISOString() },
      ];
      
      // Update the currentTabData with the fetched and mock data
      setCurrentTabData({
        positions: {
          issues: issuesData,
          selectedIssue: null
        },
        activity: {
          recentActions,
          selectedAction: null
        },
        proposals: {
          proposals,
          selectedProposal: null
        }
      });
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[DEBUG_DASHBOARD_CONTEXT] Using issues data from API');
      } else if (agentData?.preferences?.issuesMatrix &&
                 Array.isArray(agentData.preferences.issuesMatrix) &&
                 agentData.preferences.issuesMatrix.length > 0) {
        // Fallback to preferences.issuesMatrix if the issues API didn't return data
        console.log('[DEBUG_DASHBOARD_CONTEXT] Using issuesMatrix from agent preferences');
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
      refreshData,
      // Add the new context values
      currentTabData,
      setCurrentTabData,
      updateCurrentTabData,
      selectIssue,
      selectAction,
      selectProposal
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