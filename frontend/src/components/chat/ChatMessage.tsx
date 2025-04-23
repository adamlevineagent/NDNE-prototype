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
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  agentColor = '#007bff', 
  agentName = 'Agent' 
}) => {
  const isAgent = message.sender === 'agent';
  
  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`chat-message ${isAgent ? 'agent-message' : 'user-message'}`}>
      <div 
        className="message-content"
        style={{ 
          backgroundColor: isAgent ? `${agentColor}22` : undefined,
          borderLeftColor: isAgent ? agentColor : undefined
        }}
      >
        <div className="message-header">
          <span className="message-sender">
            {isAgent ? agentName : 'You'}
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