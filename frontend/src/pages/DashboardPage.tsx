import React, { useState, useEffect } from 'react';
import apiClient, { agents } from '../api/apiClient';
import AgentChatPanel from '../components/AgentChatPanel';

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
    const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPausing, setIsPausing] = useState(false);
    const [isVetoingAction, setIsVetoingAction] = useState(false);
    const [vetoingActionId, setVetoingActionId] = useState<string | null>(null);
    const [vetoFeedbackMessage, setVetoFeedbackMessage] = useState<{message: string, isError: boolean} | null>(null);
    
    // Chat panel state
    const [isChatMinimized, setIsChatMinimized] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
            try {
                // --- TODO: Replace with actual API calls ---
                console.log('Fetching dashboard data...');
                // 1. Fetch agent data (/api/agents/me)
                // const agentRes = await fetch('/api/agents/me', { headers: { 'Authorization': `Bearer YOUR_TOKEN` } });
                // if (!agentRes.ok) throw new Error('Failed to fetch agent data');
                // const fetchedAgentData: AgentData = await agentRes.json();
                const fetchedAgentData: AgentData = { // Placeholder data
                    id: 'agent-123', name: 'Test Agent', color: '#ff0000', alignmentScore: 0.85, pausedUntil: null
                };
                setAgentData(fetchedAgentData);

                // 2. Fetch recent actions (e.g., last 10 votes/comments for this agent)
                // This might require a dedicated endpoint or fetching votes/comments and filtering
                const fetchedActions: RecentAction[] = [ // Placeholder data
                    { id: 'v1', type: 'vote', proposalTitle: 'Increase Budget', proposalId: 'p1', actionDetails: 'Voted YES (Confidence: 90%)', timestamp: new Date(Date.now() - 3600000).toISOString(), canVeto: true, isOverridden: false },
                    { id: 'c1', type: 'comment', proposalTitle: 'New Policy', proposalId: 'p2', actionDetails: 'Commented: "Looks good."', timestamp: new Date(Date.now() - 7200000).toISOString(), canVeto: false, isOverridden: false },
                     { id: 'v2', type: 'vote', proposalTitle: 'Old Proposal', proposalId: 'p3', actionDetails: 'Voted NO (Confidence: 75%)', timestamp: new Date(Date.now() - 86400000).toISOString(), canVeto: false, isOverridden: true },
                ];
                setRecentActions(fetchedActions);
                // --- End of placeholder API calls ---

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

            // --- TODO: Replace with actual API call ---
            console.log(`Pausing agent ${agentData.id} until ${pauseUntil}`);
            // const token = 'YOUR_JWT_TOKEN';
            // const response = await fetch(`/api/agents/${agentData.id}/pause`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${token}`,
            //     },
            //     body: JSON.stringify({ until: pauseUntil }),
            // });
            // if (!response.ok) {
            //     const errorData = await response.json();
            //     throw new Error(errorData.error || 'Failed to pause agent');
            // }
            // --- End of placeholder API call ---

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

    return (
        <div>
            <h2>{agentData.name}'s Dashboard</h2>
            <p style={{ color: agentData.color }}>Agent Color: ■</p>

            {/* Alignment Score */}
            <div>
                <h3>Alignment Score: {alignmentPercentage}%</h3>
                <progress value={agentData.alignmentScore} max="1" style={{ width: '100%' }} />
            </div>

            {/* Pause Control */}
            <div>
                <h3>Agent Status</h3>
                {isPaused ? (
                    <p>Agent is paused until: {new Date(agentData.pausedUntil!).toLocaleString()}</p>
                    // TODO: Add button to unpause? Requires API endpoint.
                ) : (
                    <p>Agent is active.</p>
                )}
                <button onClick={handlePauseAgent} disabled={isPausing || !!isPaused}>
                    {isPausing ? 'Pausing...' : 'Pause Agent (24h)'}
                </button>
            </div>

            {/* Recent Actions */}
            <div>
                <h3>Recent Actions</h3>
                {recentActions.length === 0 ? (
                    <p>No recent actions found.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {recentActions.map(action => (
                            <li key={action.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px', position: 'relative' }}>
                                <strong>{action.type === 'vote' ? 'Vote' : 'Comment'}</strong> on "{action.proposalTitle}" (ID: {action.proposalId.substring(0,8)})
                                <br />
                                Details: {action.actionDetails}
                                <br />
                                Timestamp: {new Date(action.timestamp).toLocaleString()}
                                <br />
                                {action.isOverridden && <span style={{ color: 'red', fontWeight: 'bold' }}> (Overridden by You)</span>}
                                {action.canVeto && !action.isOverridden && (
                                    <button
                                        onClick={() => handleVeto(action.id, action.type)}
                                        disabled={isVetoingAction}
                                        style={{
                                            marginLeft: '10px',
                                            opacity: isVetoingAction ? 0.7 : 1
                                        }}
                                    >
                                        {isVetoingAction && vetoingActionId === action.id ? 'Processing...' : 'Veto/Undo'}
                                    </button>
                                )}
                                {vetoFeedbackMessage && vetoingActionId === action.id && (
                                    <div style={{
                                        marginTop: '5px',
                                        padding: '5px',
                                        backgroundColor: vetoFeedbackMessage.isError ? '#ffebee' : '#e8f5e9',
                                        color: vetoFeedbackMessage.isError ? '#c62828' : '#2e7d32',
                                        borderRadius: '4px'
                                    }}>
                                        {vetoFeedbackMessage.message}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {/* Agent Chat Panel */}
            {agentData && (
                <AgentChatPanel
                    agentId={agentData.id}
                    minimized={isChatMinimized}
                    onMinimize={() => setIsChatMinimized(true)}
                    onMaximize={() => setIsChatMinimized(false)}
                />
            )}
        </div>
    );
};

export default DashboardPage;