import React, { useState, useEffect } from 'react';
import apiClient, { agents } from '../api/apiClient';
import AgentChatPanel from '../components/AgentChatPanel';
import { PositionsMatrixTab, Issue } from '../components';
import { ActivityAuditTab, Activity } from '../components';
import { ProposalsTab, Proposal, ProposalDraft } from '../components';
// Placeholder types - replace with actual types from Prisma schema if shared
interface AgentData {
    id: string;
    name: string;
    color: string;
    alignmentScore: number;
    pausedUntil: string | null;
    // Add other relevant fields
}

interface RecentAction {
    id: string;
    type: 'vote' | 'comment'; // Example types
    proposalTitle: string;
    proposalId: string;
    actionDetails: string; // e.g., "Voted YES", "Commented: ..."
    timestamp: string;
    canVeto: boolean; // Whether the veto window is still open
    isOverridden: boolean;
}

const DashboardPage: React.FC = () => {
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'activity' | 'proposals'>('positions');
  const [isChatMinimized, setIsChatMinimized] = useState(true);

  // Positions Matrix state
  const [positionsFilter, setPositionsFilter] = useState<'positionsOnly' | 'all'>('positionsOnly');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Activity Audit state
  const [activityFilter, setActivityFilter] = useState<{ type?: string; issueId?: string; dateRange?: [Date, Date] }>({});
  const [activityList, setActivityList] = useState<Activity[]>([]);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Proposals state
  const [proposalList, setProposalList] = useState<Proposal[]>([]);
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft | null>(null);

  // User profile for personalization
  const [userName, setUserName] = useState<string>('User');

  // Fetch user profile and initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch user profile
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('[DashboardPage] No token found, redirecting to login');
          window.location.href = '/login';
          return;
        }
        const userRes = await fetch('/api/agents/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!userRes.ok) throw new Error('Failed to fetch user profile');
        const userData = await userRes.json();
        setUserName(userData.name || 'User');

        // Fetch initial positions issues
        console.log('[DashboardPage] Fetching issues with token:', token);
        const issuesRes = await apiClient.get('/issues?filter=positionsOnly');
        setIssues(issuesRes.data);
        // Fetch initial activity list
        const activityRes = await apiClient.get('/activity');
        setActivityList(activityRes.data);

        // Fetch proposals
        const proposalsRes = await apiClient.get('/proposals');
        setProposalList(proposalsRes.data);

      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handlers for tab switching
  const handleTabChange = (tab: 'positions' | 'activity' | 'proposals') => {
    setActiveTab(tab);
  };

  // Positions Matrix handlers
  const togglePositionsFilter = () => {
    const newFilter = positionsFilter === 'positionsOnly' ? 'all' : 'positionsOnly';
    setPositionsFilter(newFilter);
    // Fetch issues based on new filter
    const token = localStorage.getItem('token');
    console.log('[DashboardPage] Fetching issues with token:', token);
    apiClient.get(`/issues?filter=${newFilter}`)
      .then(res => setIssues(res.data))
      .catch(err => setError('Failed to update issues filter'));
  };

  const handleDiscussIssue = (issueId: string) => {
    setSelectedIssueId(issueId);
    // TODO: Open chat panel with context for this issue
    setIsChatMinimized(false);
  };

  // Activity Audit handlers
  const handleActivityFilterChange = (filter: typeof activityFilter) => {
    setActivityFilter(filter);
    // Fetch filtered activity
    fetch(`/api/activity?type=${filter.type || ''}&issueId=${filter.issueId || ''}`)
      .then(res => res.json())
      .then(data => setActivityList(data))
      .catch(err => setError('Failed to update activity filter'));
  };

  const handleRespondActivity = (activityId: string) => {
    // TODO: Open chat panel with context for this activity
    setIsChatMinimized(false);
  };

  // Proposals handlers
  const handleSelectProposal = (proposalId: string) => {
    setCurrentProposalId(proposalId);
  };

  const handleCreateProposal = () => {
    setProposalDraft({
      title: '',
      description: '',
      type: 'standard',
      amount: 0,
      quorum: 50,
      threshold: 0.5,
      closeAt: '',
      vetoWindowEnd: '',
    });
    setCurrentProposalId(null);
  };

  if (isLoading) return <div>Loading Dashboard...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h2>Hi {userName}, welcome to your dashboard</h2>
      <nav>
        <button onClick={() => handleTabChange('positions')} disabled={activeTab === 'positions'}>Positions Matrix</button>
        <button onClick={() => handleTabChange('activity')} disabled={activeTab === 'activity'}>Activity Audit</button>
        <button onClick={() => handleTabChange('proposals')} disabled={activeTab === 'proposals'}>Proposals</button>
      </nav>

      <div>
        {activeTab === 'positions' && (
          <PositionsMatrixTab
            filter={positionsFilter}
            issues={issues}
            onToggleFilter={togglePositionsFilter}
            onDiscuss={handleDiscussIssue}
            userName={userName}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityAuditTab
            filter={activityFilter}
            activities={activityList}
            onFilterChange={handleActivityFilterChange}
            onRespond={handleRespondActivity}
            userName={userName}
          />
        )}
        {activeTab === 'proposals' && (
          <ProposalsTab
            proposals={proposalList}
            currentProposalId={currentProposalId}
            proposalDraft={proposalDraft}
            onSelectProposal={handleSelectProposal}
            onCreateProposal={handleCreateProposal}
            userName={userName}
          />
        )}
      </div>

      <AgentChatPanel
        agentId={agentData?.id || ''}
        minimized={isChatMinimized}
        onMinimize={() => setIsChatMinimized(true)}
        onMaximize={() => setIsChatMinimized(false)}
      />
    </div>
  );
};

export default DashboardPage;