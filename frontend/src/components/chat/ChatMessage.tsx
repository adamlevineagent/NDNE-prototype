import React from 'react';
import './ChatMessage.css';

export interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: "user" | "agent";
    timestamp: string;
    metadata?: any;
  };
  agentColor?: string;
  agentName?: string;
  userName?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  agentColor = '#007bff',
  agentName = 'Agent',
  userName = 'You'
}) => {
  const isAgent = message.sender === 'agent';
  
  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Debug the names passed to ChatMessage
  console.log(`[DEBUG_NAMES] ChatMessage rendering:`, {
    isAgent,
    sender: message.sender,
    messageName: isAgent ? (message.metadata?.agentName || agentName) : (message.metadata?.userName || userName),
    agentName,
    userName,
    hasMetadata: !!message.metadata,
    metadataAgentName: message.metadata?.agentName,
    metadataUserName: message.metadata?.userName
  });

  return (
    <div className={`chat-message ${isAgent ? 'agent-message' : 'user-message'}`}>
      <div
        className="message-content"
        style={{
          backgroundColor: isAgent ? `${agentColor}22` : undefined,
          borderLeftColor: isAgent ? agentColor : undefined
        }}
        onClick={() => {
          // Log the applied styles when clicked for debugging
        }}
      >
        <div className="message-header">
          <span className="message-sender">
            {isAgent ?
              // For agent messages: use metadata.agentName if available, otherwise use props agentName
              (message.metadata?.agentName ? `${message.metadata.agentName} (Agent)` : `${agentName} (Agent)`) :
              // For user messages: use metadata.userName if available, otherwise use props userName
              (message.metadata?.userName ? `${message.metadata.userName} (you)` : `${userName} (you)`)}
          </span>
          <span className="message-time">{formattedTime}</span>
        </div>
        <div className="message-text">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;