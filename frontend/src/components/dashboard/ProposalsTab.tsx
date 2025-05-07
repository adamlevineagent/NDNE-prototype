import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useChatContext } from '../../hooks/useChatContext';

interface Proposal {
    id: string;
    title: string;
    description: string;
    status: 'draft' | 'open' | 'closed' | 'approved' | 'rejected';
    createdAt: string;
    closeAt?: string;
    isNegotiated?: boolean;
}

interface ProposalsTabProps {
    welcomeMessage: string;
    agentColor: string;
    onChatMaximize?: () => void; // Add prop to maximize chat when discussing a proposal
}

/**
 * Tab component for the Proposals view in the dashboard
 * Manages proposal creation and existing proposals
 */
const ProposalsTab: React.FC<ProposalsTabProps> = ({
    welcomeMessage,
    agentColor,
    onChatMaximize
}) => {
    // Get data from context
    const { currentTabData, selectProposal } = useDashboard();
    const { setChatContext } = useChatContext();

    // State for filter controls
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
    const [filterType, setFilterType] = useState<'all' | 'negotiated' | 'direct'>('all');
    
    // State for the proposal creation dialog
    const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
    
    // Get proposals from context or use default if not available
    const proposals = currentTabData.proposals?.proposals || [];
    
    // Filter proposals based on current settings
    const filteredProposals = proposals.filter(proposal => {
        // Filter by status
        if (filterStatus !== 'all') {
            if (filterStatus === 'open' && (proposal.status !== 'open' && proposal.status !== 'draft')) {
                return false;
            }
            if (filterStatus === 'closed' && (proposal.status !== 'closed' && proposal.status !== 'approved' && proposal.status !== 'rejected')) {
                return false;
            }
        }
        
        // Filter by type
        if (filterType !== 'all') {
            if (filterType === 'negotiated' && !proposal.isNegotiated) {
                return false;
            }
            if (filterType === 'direct' && proposal.isNegotiated) {
                return false;
            }
        }
        
        return true;
    });
    
    // Format dates
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };
    
    // Calculate days remaining
    const getDaysRemaining = (closeDate?: string) => {
        if (!closeDate) return 'No deadline';
        
        const now = new Date();
        const close = new Date(closeDate);
        const diffTime = close.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Closed';
        if (diffDays === 0) return 'Closes today';
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
    };
    
    // Get status badge style
    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'draft':
                return { backgroundColor: '#cbd5e0', color: '#2d3748' };
            case 'open':
                return { backgroundColor: '#90cdf4', color: '#2c5282' };
            case 'closed':
                return { backgroundColor: '#e2e8f0', color: '#4a5568' };
            case 'approved':
                return { backgroundColor: '#9ae6b4', color: '#276749' };
            case 'rejected':
                return { backgroundColor: '#fed7d7', color: '#9b2c2c' };
            default:
                return { backgroundColor: '#e2e8f0', color: '#4a5568' };
        }
    };
    
    return (
        <div className="proposals-tab">
            <header className="tab-header">
                <h2>{welcomeMessage} this is where your ideas take shape</h2>
                <p className="tab-description">
                    Create and manage proposals, from initial draft to final result.
                    You can work directly or collaborate with your agent to refine your ideas.
                </p>
            </header>
            
            <div className="proposal-controls">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label htmlFor="status-filter">Status:</label>
                        <select
                            id="status-filter"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
                        >
                            <option value="all">All Statuses</option>
                            <option value="open">Active</option>
                            <option value="closed">Completed</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label htmlFor="type-filter">Type:</label>
                        <select
                            id="type-filter"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'all' | 'negotiated' | 'direct')}
                        >
                            <option value="all">All Types</option>
                            <option value="negotiated">Agent-Negotiated</option>
                            <option value="direct">Direct</option>
                        </select>
                    </div>
                </div>
                
                <button
                    className="new-proposal-button"
                    style={{ backgroundColor: agentColor }}
                    onClick={() => setShowNewProposalDialog(true)}
                >
                    New Proposal
                </button>
            </div>
            
            {filteredProposals.length === 0 ? (
                <div className="empty-state">
                    <p>No proposals found with the current filter settings.</p>
                    <button
                        className="action-button"
                        style={{ backgroundColor: agentColor }}
                        onClick={() => {
                            setFilterStatus('all');
                            setFilterType('all');
                        }}
                    >
                        Show All Proposals
                    </button>
                    <p>- or -</p>
                    <button
                        className="action-button"
                        style={{ backgroundColor: agentColor }}
                        onClick={() => setShowNewProposalDialog(true)}
                    >
                        Create New Proposal
                    </button>
                </div>
            ) : (
                <div className="proposals-list">
                    {filteredProposals.map(proposal => (
                        <div className="proposal-card" key={proposal.id}>
                            <div className="proposal-header">
                                <h3 className="proposal-title">{proposal.title}</h3>
                                <div className="proposal-badges">
                                    <span className="status-badge" style={getStatusBadgeStyle(proposal.status)}>
                                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                                    </span>
                                    {proposal.isNegotiated && (
                                        <span className="type-badge">
                                            Agent-Negotiated
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <p className="proposal-description">{proposal.description}</p>
                            
                            <div className="proposal-footer">
                                <div className="proposal-dates">
                                    <span>Created: {formatDate(proposal.createdAt)}</span>
                                    {proposal.closeAt && (
                                        <span className="proposal-deadline">
                                            {getDaysRemaining(proposal.closeAt)}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="proposal-actions">
                                    <button className="view-button">
                                        View Details
                                    </button>
                                    {(proposal.status === 'draft' || proposal.status === 'open') && (
                                        <button className="edit-button">
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        className="discuss-button"
                                        style={{ backgroundColor: agentColor }}
                                        onClick={() => {
                                            // Update UI state
                                            selectProposal(proposal.id);
                                            
                                            // Update chat context
                                            setChatContext({
                                                type: 'proposals',
                                                data: {
                                                    selectedProposal: proposal
                                                }
                                            });
                                            
                                            // Maximize chat panel if handler provided
                                            if (onChatMaximize) {
                                                onChatMaximize();
                                            }
                                        }}
                                    >
                                        Discuss
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* New Proposal Dialog (simple mockup) */}
            {showNewProposalDialog && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h3>Create New Proposal</h3>
                            <button className="close-button" onClick={() => setShowNewProposalDialog(false)}>×</button>
                        </div>
                        <div className="dialog-body">
                            <div className="creation-options">
                                <button 
                                    className="creation-option" 
                                    style={{ borderColor: agentColor }}
                                    onClick={() => setShowNewProposalDialog(false)}
                                >
                                    <div className="option-icon" style={{ backgroundColor: agentColor }}>
                                        💬
                                    </div>
                                    <div className="option-text">
                                        <h4>Collaborative Creation</h4>
                                        <p>Work with your agent to refine your idea through conversation</p>
                                    </div>
                                </button>
                                
                                <button 
                                    className="creation-option"
                                    style={{ borderColor: agentColor }}
                                    onClick={() => setShowNewProposalDialog(false)}
                                >
                                    <div className="option-icon" style={{ backgroundColor: agentColor }}>
                                        📝
                                    </div>
                                    <div className="option-text">
                                        <h4>Direct Creation</h4>
                                        <p>Create a proposal directly using the form editor</p>
                                    </div>
                                </button>
                                
                                <button 
                                    className="creation-option"
                                    style={{ borderColor: agentColor }}
                                    onClick={() => setShowNewProposalDialog(false)}
                                >
                                    <div className="option-icon" style={{ backgroundColor: agentColor }}>
                                        🤝
                                    </div>
                                    <div className="option-text">
                                        <h4>Start Negotiation</h4>
                                        <p>Begin a multi-agent negotiation that will become a proposal</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .proposals-tab {
                    padding: 1rem 0;
                    position: relative;
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
                
                .proposal-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding: 0.75rem 1rem;
                    background-color: #f7fafc;
                    border-radius: 8px;
                }
                
                .filter-controls {
                    display: flex;
                    gap: 1rem;
                }
                
                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .filter-group select {
                    padding: 0.35rem 0.5rem;
                    border-radius: 4px;
                    border: 1px solid #e2e8f0;
                    background-color: white;
                    font-size: 0.9rem;
                }
                
                .new-proposal-button {
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    color: white;
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                }
                
                .proposals-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .proposal-card {
                    background-color: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    padding: 1.25rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                }
                
                .proposal-card:hover {
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }
                
                .proposal-header {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 0.75rem;
                }
                
                .proposal-title {
                    margin: 0 0 0.75rem;
                    font-size: 1.1rem;
                    color: #2d3748;
                    line-height: 1.3;
                }
                
                .proposal-badges {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .status-badge, .type-badge {
                    font-size: 0.75rem;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    font-weight: 600;
                }
                
                .type-badge {
                    background-color: #e9d8fd;
                    color: #553c9a;
                }
                
                .proposal-description {
                    color: #4a5568;
                    font-size: 0.9rem;
                    line-height: 1.5;
                    margin: 0.5rem 0 1rem;
                    flex-grow: 1;
                }
                
                .proposal-footer {
                    border-top: 1px solid #e2e8f0;
                    padding-top: 1rem;
                    margin-top: auto;
                }
                
                .proposal-dates {
                    display: flex;
                    justify-content: space-between;
                    color: #718096;
                    font-size: 0.85rem;
                    margin-bottom: 0.75rem;
                }
                
                .proposal-deadline {
                    font-weight: 600;
                }
                
                .proposal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                }
                
                .view-button, .edit-button, .discuss-button {
                    padding: 0.4rem 0.75rem;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .view-button {
                    background-color: #e2e8f0;
                    color: #2d3748;
                    border: none;
                }
                
                .view-button:hover {
                    background-color: #cbd5e0;
                }
                
                .edit-button {
                    background-color: #4299e1;
                    color: white;
                    border: none;
                }
                
                .edit-button:hover {
                    background-color: #3182ce;
                }
                
                .discuss-button {
                    color: white;
                    border: none;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                }
                
                .discuss-button:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                
                .discuss-button::before {
                    content: "💬";
                    font-size: 0.9rem;
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
                    margin: 0 auto;
                    display: block;
                }
                
                .dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .dialog-content {
                    background-color: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                }
                
                .dialog-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .dialog-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #2d3748;
                }
                
                .close-button {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #718096;
                    cursor: pointer;
                }
                
                .dialog-body {
                    padding: 1.5rem;
                }
                
                .creation-options {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .creation-option {
                    display: flex;
                    align-items: center;
                    padding: 1.25rem;
                    border-radius: 8px;
                    border: 2px solid;
                    background-color: white;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s ease;
                }
                
                .creation-option:hover {
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }
                
                .option-icon {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1rem;
                    flex-shrink: 0;
                    font-size: 1.25rem;
                }
                
                .option-text {
                    flex-grow: 1;
                }
                
                .option-text h4 {
                    margin: 0 0 0.25rem;
                    font-size: 1.1rem;
                    color: #2d3748;
                }
                
                .option-text p {
                    margin: 0;
                    font-size: 0.9rem;
                    color: #4a5568;
                }
                
                @media (max-width: 640px) {
                    .proposal-controls {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .filter-controls {
                        flex-direction: column;
                        width: 100%;
                    }
                    
                    .filter-group {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .new-proposal-button {
                        width: 100%;
                    }
                    
                    .proposals-list {
                        grid-template-columns: 1fr;
                    }
                    
                    .proposal-actions {
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }
                    
                    .proposal-actions button {
                        flex: 1;
                        min-width: calc(50% - 0.25rem);
                        justify-content: center;
                    }
                    
                    .proposal-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .proposal-badges {
                        margin-top: 0.5rem;
                    }
                    
                    .dialog-content {
                        width: 95%;
                    }
                    
                    .creation-option {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .option-icon {
                        margin-right: 0;
                        margin-bottom: 0.5rem;
                    }
                }
                
                /* Tablet responsiveness */
                @media (min-width: 641px) and (max-width: 1024px) {
                    .proposals-list {
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    }
                    
                    .proposal-actions {
                        flex-wrap: wrap;
                    }
                }
                
                /* Data refresh animation */
                @keyframes refreshPulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
                
                .refreshing {
                    animation: refreshPulse 1.5s infinite;
                }
            `}</style>
        </div>
    );
};

export default ProposalsTab;