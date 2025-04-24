import React, { useState, useEffect } from 'react';
import apiClient, { agents } from '../api/apiClient';
import AgentChatPanel from '../components/AgentChatPanel';

import { useNavigate } from 'react-router-dom';

// Tab content components
// These components already exist in the project, no need to change the paths
import PositionsMatrixTab from '../components/dashboard/PositionsMatrixTab';
import ActivityAuditTab from '../components/dashboard/ActivityAuditTab';
import ProposalsTab from '../components/dashboard/ProposalsTab';

// Custom hook for chat context
import { useChatContext } from '../hooks/useChatContext';

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

// Define the available tabs
type TabType = 'positions' | 'activity' | 'proposals';

const DashboardPage: React.FC = () => {
    // Dashboard state
    const navigate = useNavigate();
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
    const [issues, setIssues] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPausing, setIsPausing] = useState(false);
    const [isVetoingAction, setIsVetoingAction] = useState(false);
    const [vetoingActionId, setVetoingActionId] = useState<string | null>(null);
    const [vetoFeedbackMessage, setVetoFeedbackMessage] = useState<{message: string, isError: boolean} | null>(null);
    
    // Tab navigation state
    const [activeTab, setActiveTab] = useState<TabType>('positions');
    
    // Chat panel state
    const [isChatMinimized, setIsChatMinimized] = useState(true);
    
    // Chat context for sharing context between tabs and chat panel
    const { setChatContext } = useChatContext();

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch data for all tabs at once
            console.log('Fetching dashboard data...');
            
            // 1. Fetch agent data (/api/agents/me)
            try {
                // This would be an actual API call in production
                const response = await fetch('/api/agents/me', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setAgentData({
                        id: data.id || 'agent-123',
                        name: data.name || 'Test Agent',
                        color: data.color || '#ff0000',
                        alignmentScore: data.alignmentScore || 0.85,
                        pausedUntil: data.pausedUntil || null
                    });
                } else {
                    // Fallback to placeholder data if API fails
                    const fetchedAgentData: AgentData = {
                        id: 'agent-123', name: 'Test Agent', color: '#ff0000', alignmentScore: 0.85, pausedUntil: null
                    };
                    setAgentData(fetchedAgentData);
                }
            } catch (err) {
                console.error("Error fetching agent data:", err);
                // Fallback to placeholder data
                const fetchedAgentData: AgentData = {
                    id: 'agent-123', name: 'Test Agent', color: '#ff0000', alignmentScore: 0.85, pausedUntil: null
                };
                setAgentData(fetchedAgentData);
            }

            // 2. Fetch recent actions (e.g., last 10 votes/comments for this agent)
            const fetchedActions: RecentAction[] = [ // Placeholder data
                { id: 'v1', type: 'vote', proposalTitle: 'Increase Budget', proposalId: 'p1', actionDetails: 'Voted YES (Confidence: 90%)', timestamp: new Date(Date.now() - 3600000).toISOString(), canVeto: true, isOverridden: false },
                { id: 'c1', type: 'comment', proposalTitle: 'New Policy', proposalId: 'p2', actionDetails: 'Commented: "Looks good."', timestamp: new Date(Date.now() - 7200000).toISOString(), canVeto: false, isOverridden: false },
                { id: 'v2', type: 'vote', proposalTitle: 'Old Proposal', proposalId: 'p3', actionDetails: 'Voted NO (Confidence: 75%)', timestamp: new Date(Date.now() - 86400000).toISOString(), canVeto: false, isOverridden: true },
            ];
            setRecentActions(fetchedActions);
            
            // 3. Fetch issues data for positions matrix
            const fetchedIssues = [
                { 
                    id: 'issue-1', 
                    title: 'Climate Change', 
                    description: 'Policy approaches to address climate change',
                    stance: 'APPROACH_A',
                    reason: 'Supporting renewable energy and carbon reduction strategies', 
                    isPriority: true 
                },
                { 
                    id: 'issue-2', 
                    title: 'Healthcare Reform', 
                    description: 'Approaches to healthcare system improvements',
                    stance: 'APPROACH_B',
                    reason: 'Focus on market-based solutions with public safeguards', 
                    isPriority: false 
                },
                { 
                    id: 'issue-3', 
                    title: 'Education Funding', 
                    description: 'Methods to fund and improve educational outcomes',
                    stance: 'APPROACH_C',
                    reason: 'Balance of public funding with accountability measures', 
                    isPriority: true 
                }
            ];
            setIssues(fetchedIssues);

        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data.');
            console.error("Dashboard fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Fetch data on component mount

    const handlePauseAgent = async () => {
        if (!agentData) return;
        setIsPausing(true);
        setError(null);
        try {
            // Calculate pause duration (e.g., 24 hours from now)
            const pauseUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            console.log(`Pausing agent ${agentData.id} until ${pauseUntil}`);
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update local state to reflect pause
            setAgentData(prev => prev ? { ...prev, pausedUntil: pauseUntil } : null);

        } catch (err: any) {
            setError(err.message || 'An error occurred while pausing the agent.');
            console.error("Pause agent error:", err);
        } finally {
            setIsPausing(false);
        }
    };

    const handleVeto = async (actionId: string, actionType: 'vote' | 'comment') => {
        // Clear any previous veto feedback messages
        setVetoFeedbackMessage(null);
        
        const reason = prompt('Please provide a reason for the veto/undo:');
        if (!reason) {
            setVetoFeedbackMessage({
                message: 'Veto reason is required.',
                isError: true
            });
            return;
        }
        
        if (!agentData) {
            setVetoFeedbackMessage({
                message: 'Agent data not loaded.',
                isError: true
            });
            return;
        }
        
        // Set loading state
        setIsVetoingAction(true);
        setVetoingActionId(actionId);
        
        try {
            console.log(`Attempting to veto ${actionType} with ID ${actionId} for agent ${agentData.id}`);
            
            // Set timeout to prevent hanging requests
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000)
            );
            
            if (actionType === 'vote') {
                // Use the already imported apiClient
                const votePromise = agents.feedback(agentData.id, {
                    voteId: actionId,
                    reason,
                });
                
                // Race between the actual request and the timeout
                await Promise.race([votePromise, timeoutPromise]);
                
            } else if (actionType === 'comment') {
                // Feedback on comments not implemented yet
                throw new Error('Veto on comments is not implemented yet.');
            }
            
            // Success - update UI without page reload
            setVetoFeedbackMessage({
                message: 'Veto/Undo submitted successfully.',
                isError: false
            });
            
            // Update local state to reflect the veto
            setRecentActions(prevActions =>
                prevActions.map(action =>
                    action.id === actionId
                        ? { ...action, isOverridden: true, canVeto: false }
                        : action
                )
            );
            
        } catch (error) {
            console.error('Veto error details:', error);
            setVetoFeedbackMessage({
                message: `Failed to submit veto/undo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                isError: true
            });
        } finally {
            setIsVetoingAction(false);
            setVetoingActionId(null);
            
            // Refresh data in the background after a short delay
            setTimeout(() => {
                fetchData();
            }, 2000);
        }
    };

    if (isLoading) return <div>Loading Dashboard...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!agentData) return <div>Agent data not found.</div>;

    const isPaused = agentData.pausedUntil && new Date(agentData.pausedUntil) > new Date();
    const alignmentPercentage = (agentData.alignmentScore * 100).toFixed(1);
    
    // Create personalized welcome message with user's name
    // Extract the first name only for more personalized feel
    const firstName = agentData.name.split(' ')[0];
    const welcomeMessage = `Hi ${firstName},`;
    
    // Handle tab switching with context awareness for chat panel
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        
        // Update chat context based on active tab
        switch (tab) {
            case 'positions':
                setChatContext({
                    type: 'positions',
                    data: { issues }
                });
                break;
            case 'activity':
                setChatContext({
                    type: 'activity',
                    data: { recentActions }
                });
                break;
            case 'proposals':
                setChatContext({
                    type: 'proposals',
                    data: {}
                });
                break;
        }
    };

    return (
        <div className="dashboard-container">
            {/* Tab Navigation */}
            <div className="dashboard-tabs">
                <button
                    className={`tab-button ${activeTab === 'positions' ? 'active' : ''}`}
                    onClick={() => handleTabChange('positions')}
                    aria-label="Positions Matrix Tab"
                >
                    Positions Matrix
                </button>
                <button
                    className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => handleTabChange('activity')}
                    aria-label="Activity Audit Tab"
                >
                    Activity Audit
                </button>
                <button
                    className={`tab-button ${activeTab === 'proposals' ? 'active' : ''}`}
                    onClick={() => handleTabChange('proposals')}
                    aria-label="Proposals Tab"
                >
                    Proposals
                </button>
            </div>
            
            {/* Tab Content Area */}
            <div className="dashboard-content">
                {activeTab === 'positions' && (
                    <PositionsMatrixTab 
                        issues={issues} 
                        welcomeMessage={welcomeMessage} 
                        agentColor={agentData.color}
                    />
                )}
                
                {activeTab === 'activity' && (
                    <ActivityAuditTab 
                        recentActions={recentActions} 
                        welcomeMessage={welcomeMessage}
                        agentColor={agentData.color}
                        handleVeto={handleVeto}
                        isVetoingAction={isVetoingAction}
                        vetoingActionId={vetoingActionId}
                        vetoFeedbackMessage={vetoFeedbackMessage}
                    />
                )}
                
                {activeTab === 'proposals' && (
                    <ProposalsTab 
                        welcomeMessage={welcomeMessage} 
                        agentColor={agentData.color}
                    />
                )}
            </div>
            
            {/* Agent Status Panel (Always Visible) */}
            <div className="agent-status-panel">
                <div className="agent-status-header" style={{ borderColor: agentData.color }}>
                    <div>
                        <span className="status-dot" style={{ 
                            backgroundColor: isPaused ? '#718096' : agentData.color 
                        }}></span>
                        <span>{isPaused ? 'Paused' : 'Active'}</span>
                    </div>
                    <div>
                        <span>Alignment: {alignmentPercentage}%</span>
                    </div>
                </div>
                <button
                    className="pause-button"
                    onClick={handlePauseAgent}
                    disabled={isPausing || !!isPaused}
                    aria-label="Pause Agent for 24 hours"
                >
                    {isPausing ? 'Pausing...' : 'Pause Agent (24h)'}
                </button>
            </div>

            {/* Agent Chat Panel - Persistent Across Tabs */}
            {agentData && (
                <AgentChatPanel
                    agentId={agentData.id}
                    minimized={isChatMinimized}
                    onMinimize={() => setIsChatMinimized(true)}
                    onMaximize={() => setIsChatMinimized(false)}
                    contextualHelp={activeTab}
                />
            )}
            
            {/* Add Dashboard CSS (using regular style tag) */}
            <style>{`
                .dashboard-container {
                    padding: 1rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .dashboard-tabs {
                    display: flex;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 1.5rem;
                    overflow-x: auto; /* Enable horizontal scroll on small screens */
                    scrollbar-width: thin;
                    -ms-overflow-style: none; /* IE and Edge */
                }
                
                .dashboard-tabs::-webkit-scrollbar {
                    height: 4px;
                }
                
                .dashboard-tabs::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }
                
                .tab-button {
                    padding: 0.75rem 1.5rem;
                    background: none;
                    border: none;
                    font-size: 1rem;
                    font-weight: 500;
                    color: #4a5568;
                    cursor: pointer;
                    position: relative;
                }
                
                .tab-button:hover {
                    color: #3182ce;
                }
                
                .tab-button.active {
                    color: #3182ce;
                    font-weight: 600;
                }
                
                .tab-button.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background-color: #3182ce;
                }
                
                .dashboard-content {
                    min-height: 400px;
                    padding-bottom: 80px; /* Make room for the status panel */
                }
                
                .agent-status-panel {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    background-color: white;
                    border-top: 1px solid #e2e8f0;
                    padding: 0.75rem 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 10;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
                }
                
                .agent-status-header {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding-left: 0.5rem;
                    border-left: 3px solid;
                }
                
                .status-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                
                .pause-button {
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    background-color: #e53e3e;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                }
                
                .pause-button:hover {
                    background-color: #c53030;
                }
                
                .pause-button:disabled {
                    background-color: #cbd5e0;
                    cursor: not-allowed;
                }
                
                @media (max-width: 640px) {
                    .dashboard-tabs {
                        overflow-x: auto;
                        white-space: nowrap;
                    }
                    
                    .tab-button {
                        padding: 0.75rem 1rem;
                    }
                    
                    .agent-status-panel {
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    
                    .dashboard-content {
                        padding-bottom: 120px; /* Increase padding for mobile status panel */
                    }
                }
                
                /* Add a smooth transition effect for panel layouts */
                .agent-chat-panel, .dashboard-content {
                    transition: all 0.3s ease;
                }
            `}</style>
        </div>
    );
};

export default DashboardPage;