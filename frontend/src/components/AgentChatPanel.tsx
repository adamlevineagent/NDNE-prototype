import React, { useState, useEffect } from 'react';
import ChatInterface from './chat/ChatInterface';
import './AgentChatPanel.css';

interface AgentChatPanelProps {
  agentId: string;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  contextualHelp?: 'positions' | 'activity' | 'proposals';
  userName?: string; // Add user name prop
}

const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  agentId,
  minimized = false,
  onMinimize,
  onMaximize,
  contextualHelp,
  userName
}) => {
  const [agent, setAgent] = useState<{
    name: string;
    color: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Fetch agent details
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true);
        
        // We're using a direct fetch here, but in a real implementation
        // this would be part of the apiClient
        const response = await fetch(`/api/agents/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("[DEBUG_NAMES] AgentChatPanel received agent data:", {
            id: data.id,
            name: data.name,           // This is agent's name
            agentName: data.agentName, // This is now explicitly the agent's name
            userName: data.userName,   // This is the user's name
            propsUserName: userName    // This is what's passed down from parent
          });
          setAgent({
            // Use the explicit agentName if available, otherwise use name
            name: data.agentName || data.name || 'Agent',
            color: data.color || '#007bff'
          });
        } else {
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgent();
  }, [agentId]);

  // This would be connected to a real-time notification system in a full implementation
  useEffect(() => {
    // Simulating checking for unread messages every 30 seconds
    const checkForUnreadMessages = () => {
      // This is a placeholder. In a real implementation, you would
      // check for unread messages from the server
      setHasUnreadMessages(false);
    };
    
    const interval = setInterval(checkForUnreadMessages, 30000);
    
    return () => clearInterval(interval);
  }, [agentId]);

  if (loading) {
    return (
      <div className={`agent-chat-panel ${minimized ? 'minimized' : ''}`}>
        <div className="loading-indicator">Loading chat...</div>
      </div>
    );
  }

  if (minimized) {
    return (
      <div 
        className="agent-chat-panel minimized"
        onClick={onMaximize}
        style={{ 
          borderColor: agent?.color || '#007bff'
        }}
      >
        <div className="minimized-header" style={{ backgroundColor: agent?.color || '#007bff' }}>
          <span>{agent?.name ? `${agent.name} (Agent)` : 'Agent'}</span> {/* Agent name displayed in minimized state */}
        </div>
        {hasUnreadMessages && <div className="unread-indicator" />}
      </div>
    );
  }

  return (
    <div className="agent-chat-panel">
      <div 
        className="chat-panel-header"
        style={{ backgroundColor: agent?.color || '#007bff' }}
      >
        <h3>{agent?.name ? `${agent.name} (Agent)` : 'Agent'}</h3> {/* Agent name displayed in maximized header */}
        <button className="minimize-button" onClick={onMinimize}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
      <div className="chat-panel-body">
        {contextualHelp && (
          <div className="contextual-help-banner" style={{ backgroundColor: agent?.color ? `${agent.color}22` : '#007bff22' }}>
            <p>
              {contextualHelp === 'positions' && 'Need help with your positions matrix? Ask me about any issue or how to update your stance.'}
              {contextualHelp === 'activity' && 'Questions about your agent activity? I can explain any action or help you understand what happened.'}
              {contextualHelp === 'proposals' && 'Want assistance with proposals? I can help you create, edit, or review your proposals.'}
            </p>
          </div>
        )}
        <ChatInterface
          agentId={agentId}
          agentName={agent?.name || 'Agent'}
          userName={userName}
          agentColor={agent?.color}
        />
        {/* Debug information - visible only in development */}
        {process.env.NODE_ENV !== 'production' && (
          <div style={{fontSize: '10px', background: '#f5f5f5', padding: '4px', color: '#666'}}>
            DEBUG: Agent name: {agent?.name}, User name: {userName}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentChatPanel;

// Add CSS for the contextual help banner
const style = document.createElement('style');
style.textContent = `
  .contextual-help-banner {
    padding: 10px 15px;
    margin: 0 0 15px 0;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  
  .contextual-help-banner p {
    margin: 0;
  }
`;
document.head.appendChild(style);