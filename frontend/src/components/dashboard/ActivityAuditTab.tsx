import React, { useState } from 'react';

interface RecentAction {
    id: string;
    type: 'vote' | 'comment';
    proposalTitle: string;
    proposalId: string;
    actionDetails: string;
    timestamp: string;
    canVeto: boolean;
    isOverridden: boolean;
}

interface VetoFeedbackMessage {
    message: string;
    isError: boolean;
}

interface ActivityAuditTabProps {
    recentActions: RecentAction[];
    welcomeMessage: string;
    agentColor: string;
    handleVeto: (actionId: string, actionType: 'vote' | 'comment') => Promise<void>;
    isVetoingAction: boolean;
    vetoingActionId: string | null;
    vetoFeedbackMessage: VetoFeedbackMessage | null;
}

/**
 * Tab component for the Activity Audit view in the dashboard
 * Displays a chronological feed of all agent activity with filtering capabilities
 */
const ActivityAuditTab: React.FC<ActivityAuditTabProps> = ({
    recentActions,
    welcomeMessage,
    agentColor,
    handleVeto,
    isVetoingAction,
    vetoingActionId,
    vetoFeedbackMessage
}) => {
    // State for filter controls
    const [filterType, setFilterType] = useState<'all' | 'vote' | 'comment'>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    
    // Filter actions based on current settings
    const filteredActions = recentActions.filter(action => {
        if (filterType === 'all') return true;
        return action.type === filterType;
    });
    
    // Sort actions based on current settings
    const sortedActions = [...filteredActions].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Format timestamp to a more readable format
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Group actions by date for better visualization
    const groupActionsByDate = (actions: RecentAction[]) => {
        const groups: { [key: string]: RecentAction[] } = {};
        
        actions.forEach(action => {
            const date = new Date(action.timestamp);
            const dateKey = date.toLocaleDateString();
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            
            groups[dateKey].push(action);
        });
        
        return groups;
    };
    
    const actionGroups = groupActionsByDate(sortedActions);

    return (
        <div className="activity-audit-tab">
            <header className="tab-header">
                <h2>{welcomeMessage} here's what you and your agent have been up to</h2>
                <p className="tab-description">
                    This is a record of all actions your agent has taken on your behalf.
                    You can review, filter, and veto recent actions if needed.
                </p>
            </header>
            
            <div className="activity-controls">
                <div className="control-filters">
                    <label htmlFor="filter-select">Filter:</label>
                    <select 
                        id="filter-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'vote' | 'comment')}
                    >
                        <option value="all">All Activities</option>
                        <option value="vote">Votes Only</option>
                        <option value="comment">Comments Only</option>
                    </select>
                </div>
                
                <div className="control-sort">
                    <label htmlFor="sort-select">Sort:</label>
                    <select 
                        id="sort-select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>
            
            {Object.keys(actionGroups).length === 0 ? (
                <div className="empty-state">
                    <p>No activity found with the current filter settings.</p>
                    {filterType !== 'all' && (
                        <button 
                            className="action-button"
                            style={{ backgroundColor: agentColor }}
                            onClick={() => setFilterType('all')}
                        >
                            Show All Activities
                        </button>
                    )}
                </div>
            ) : (
                <div className="activity-timeline">
                    {Object.entries(actionGroups).map(([date, actions]) => (
                        <div className="activity-date-group" key={date}>
                            <div className="date-header" style={{ borderColor: agentColor }}>
                                <h3>{date}</h3>
                            </div>
                            <ul className="activity-list">
                                {actions.map(action => (
                                    <li key={action.id} className="activity-item">
                                        <div className="activity-icon" style={{ backgroundColor: agentColor }}>
                                            {action.type === 'vote' ? '✓' : '💬'}
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-header">
                                                <h4>
                                                    <strong>{action.type === 'vote' ? 'Vote' : 'Comment'}</strong> on "{action.proposalTitle}"
                                                </h4>
                                                <span className="activity-time">
                                                    {new Date(action.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="activity-details">{action.actionDetails}</p>
                                            {action.isOverridden && (
                                                <span className="badge override-badge">Overridden by You</span>
                                            )}
                                            {action.canVeto && !action.isOverridden && (
                                                <button
                                                    className="veto-button"
                                                    onClick={() => handleVeto(action.id, action.type)}
                                                    disabled={isVetoingAction}
                                                >
                                                    {isVetoingAction && vetoingActionId === action.id ? 'Processing...' : 'Veto/Undo'}
                                                </button>
                                            )}
                                            {vetoFeedbackMessage && vetoingActionId === action.id && (
                                                <div className={`feedback-message ${vetoFeedbackMessage.isError ? 'error' : 'success'}`}>
                                                    {vetoFeedbackMessage.message}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
            
            <style>{`
                .activity-audit-tab {
                    padding: 1rem 0;
                }
                
                .tab-header {
                    margin-bottom: 1.5rem;
                }
                
                .tab-header h2 {
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                    color: #2d3748;
                }
                
                .tab-description {
                    color: #4a5568;
                    line-height: 1.5;
                }
                
                .activity-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding: 0.75rem 1rem;
                    background-color: #f7fafc;
                    border-radius: 8px;
                }
                
                .activity-controls select {
                    padding: 0.35rem 0.5rem;
                    border-radius: 4px;
                    border: 1px solid #e2e8f0;
                    background-color: white;
                    font-size: 0.9rem;
                    margin-left: 8px;
                }
                
                .activity-timeline {
                    margin-bottom: 2rem;
                }
                
                .date-header {
                    margin: 1.5rem 0 1rem;
                    padding-left: 0.75rem;
                    border-left: 3px solid;
                }
                
                .date-header h3 {
                    font-size: 1rem;
                    color: #4a5568;
                    font-weight: 600;
                    margin: 0;
                }
                
                .activity-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .activity-item {
                    display: flex;
                    margin-bottom: 1.5rem;
                    position: relative;
                }
                
                .activity-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1rem;
                    flex-shrink: 0;
                }
                
                .activity-content {
                    flex-grow: 1;
                    background-color: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    padding: 1rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }
                
                .activity-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                }
                
                .activity-header h4 {
                    margin: 0;
                    font-size: 0.95rem;
                    color: #2d3748;
                    font-weight: 500;
                }
                
                .activity-time {
                    color: #718096;
                    font-size: 0.85rem;
                }
                
                .activity-details {
                    margin: 0.5rem 0;
                    font-size: 0.9rem;
                    color: #4a5568;
                }
                
                .veto-button {
                    margin-top: 0.75rem;
                    padding: 0.4rem 0.75rem;
                    background-color: #e53e3e;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                
                .veto-button:hover {
                    background-color: #c53030;
                }
                
                .veto-button:disabled {
                    background-color: #cbd5e0;
                    cursor: not-allowed;
                }
                
                .badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 4px;
                    margin-top: 0.5rem;
                }
                
                .override-badge {
                    background-color: #fed7d7;
                    color: #9b2c2c;
                }
                
                .feedback-message {
                    margin-top: 0.75rem;
                    padding: 0.5rem;
                    border-radius: 4px;
                    font-size: 0.85rem;
                }
                
                .feedback-message.error {
                    background-color: #fed7d7;
                    color: #9b2c2c;
                }
                
                .feedback-message.success {
                    background-color: #c6f6d5;
                    color: #276749;
                }
                
                .empty-state {
                    background-color: #f7fafc;
                    border: 1px dashed #cbd5e0;
                    border-radius: 8px;
                    padding: 2rem;
                    text-align: center;
                    color: #4a5568;
                }
                
                .empty-state p {
                    margin-bottom: 1.5rem;
                }
                
                .action-button {
                    padding: 0.75rem 1.25rem;
                    border-radius: 6px;
                    border: none;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                
                .action-button:hover {
                    opacity: 0.9;
                }
                
                @media (max-width: 640px) {
                    .activity-controls {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .control-filters, .control-sort {
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    
                    .activity-item {
                        flex-direction: column;
                    }
                    
                    .activity-icon {
                        margin-bottom: 0.5rem;
                    }
                    
                    .activity-header {
                        flex-direction: column;
                    }
                    
                    .activity-time {
                        margin-top: 0.25rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default ActivityAuditTab;