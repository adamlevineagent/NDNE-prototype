import React from 'react';
import ForumPostDisplay from '../forum/ForumPostDisplay';
import ForumAnalysisDisplay from '../forum/ForumAnalysisDisplay';
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

  // Check if this message contains forum content
  const hasForumPost = message.metadata?.forumPost;
  const hasForumAnalysis = message.metadata?.forumAnalysis;

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
        
        {/* Render forum post content if available */}
        {hasForumPost && (
          <div className="forum-content-wrapper">
            <ForumPostDisplay
              title={message.metadata.forumPost.title}
              body={message.metadata.forumPost.body}
              category={message.metadata.forumPost.category}
            />
          </div>
        )}
        
        {/* Render forum analysis if available */}
        {hasForumAnalysis && (
          <div className="forum-content-wrapper">
            <ForumAnalysisDisplay
              summary={message.metadata.forumAnalysis.summary}
              keyTopics={message.metadata.forumAnalysis.keyTopics || []}
              relevanceScore={message.metadata.forumAnalysis.relevanceScore || 0}
              alignmentAnalysis={message.metadata.forumAnalysis.alignmentAnalysis || ''}
              actionItems={message.metadata.forumAnalysis.actionItems || []}
              sentiment={message.metadata.forumAnalysis.sentiment}
              recommendedResponse={message.metadata.forumAnalysis.recommendedResponse}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;