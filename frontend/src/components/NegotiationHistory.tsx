import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import './NegotiationHistory.css';

interface NegotiationHistoryProps {
  negotiationId: string;
}

interface NegotiationMessage {
  id: string;
  agentId: string;
  content: string;
  messageType: string;
  timestamp: string;
  referencedMessageId?: string;
  agent: {
    name: string;
    color: string;
  };
  reactions: Array<{
    id: string;
    agentId: string;
    reactionType: string;
  }>;
}

interface NegotiationSession {
  id: string;
  topic: string;
  description?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

const NegotiationHistory: React.FC<NegotiationHistoryProps> = ({ negotiationId }) => {
  const [session, setSession] = useState<NegotiationSession | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    const fetchNegotiation = async () => {
      setLoading(true);
      try {
        // Fetch negotiation session details
        const sessionResponse = await apiClient.get(`/api/negotiations/${negotiationId}`);
        setSession(sessionResponse.data);
        
        // Fetch negotiation messages
        const messagesResponse = await apiClient.get(`/api/negotiations/${negotiationId}/messages`);
        setMessages(messagesResponse.data);
      } catch (err) {
        console.error('Failed to fetch negotiation history', err);
        setError('Failed to load negotiation history');
      } finally {
        setLoading(false);
      }
    };

    if (negotiationId) {
      fetchNegotiation();
    }
  }, [negotiationId]);

  if (loading) {
    return <div className="negotiation-history-loading">Loading negotiation history...</div>;
  }

  if (error) {
    return <div className="negotiation-history-error">{error}</div>;
  }

  if (!session) {
    return <div className="negotiation-history-error">Negotiation not found</div>;
  }

  // Get unique agent IDs to show participant count
  const participantIds = [...new Set(messages.map(message => message.agentId))];

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Group reactions by type for display
  const getReactionSummary = (reactions: any[]) => {
    const reactionCounts = reactions.reduce((acc: Record<string, number>, reaction) => {
      acc[reaction.reactionType] = (acc[reaction.reactionType] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(reactionCounts).map(([type, count]) => (
      <span key={type} className="reaction-badge">
        {type} {count > 1 ? `× ${count}` : ''}
      </span>
    ));
  };

  // Calculate consensus status
  const consensusStatus = session.status === 'completed' ? 'Consensus Reached' : 'No Consensus Yet';

  return (
    <div className="negotiation-history-container">
      <div className="negotiation-history-header">
        <h3>Negotiation History</h3>
        <button
          className="toggle-details-button"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <div className="negotiation-history-meta">
        <div className="meta-item">
          <span className="meta-label">Topic:</span>
          <span className="meta-value">{session.topic}</span>
        </div>
        
        <div className="meta-item">
          <span className="meta-label">Status:</span>
          <span className={`meta-value status-${session.status}`}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
        </div>
        
        <div className="meta-item">
          <span className="meta-label">Consensus:</span>
          <span className={`meta-value ${session.status === 'completed' ? 'status-completed' : ''}`}>
            {consensusStatus}
          </span>
        </div>
        
        <div className="meta-item">
          <span className="meta-label">Participants:</span>
          <span className="meta-value">{participantIds.length} agents</span>
        </div>
        
        <div className="meta-item">
          <span className="meta-label">Started:</span>
          <span className="meta-value">{formatTimestamp(session.startedAt)}</span>
        </div>
        
        {session.completedAt && (
          <div className="meta-item">
            <span className="meta-label">Completed:</span>
            <span className="meta-value">{formatTimestamp(session.completedAt)}</span>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="negotiation-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message-container ${message.messageType === 'agreement' ? 'agreement-message' : ''}`}
            >
              <div className="message-header">
                <span 
                  className="agent-name"
                  style={{ color: message.agent?.color || '#666' }}
                >
                  {message.agent?.name || `Agent ${message.agentId.substring(0, 4)}`}
                </span>
                <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
              </div>
              
              <div className="message-content">
                {message.content}
              </div>
              
              {message.reactions && message.reactions.length > 0 && (
                <div className="message-reactions">
                  {getReactionSummary(message.reactions)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NegotiationHistory;