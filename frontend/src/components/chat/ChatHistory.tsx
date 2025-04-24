import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import './ChatHistory.css';

export interface ChatHistoryProps {
  messages: Array<{
    id: string;
    content: string;
    sender: "user" | "agent";
    timestamp: string;
    metadata?: any;
  }>;
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  agentColor?: string;
  agentName?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  loadMore,
  hasMore,
  loading,
  agentColor,
  agentName,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef<number>(0);

  // Add debug logging for messages
  useEffect(() => {
    console.log('[ChatHistory] Messages updated:', {
      count: messages.length,
      messageIds: messages.map(m => m.id),
      firstMessageContent: messages.length > 0 ? messages[0].content.substring(0, 30) + '...' : 'No messages',
      agentName
    });
  }, [messages, agentName]);

  // Scroll to bottom when new messages are added (but not when loading more history)
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // Handle scroll to load more messages
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    
    if (!container || loading || !hasMore) return;
    
    // Load more when scrolled near the top
    if (container.scrollTop < 100) {
      // Save current scroll position and height
      const scrollHeight = container.scrollHeight;
      
      loadMore();
      
      // After loading more messages, adjust scroll position to maintain the same view
      // (This will be applied after the messages are rendered)
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - scrollHeight;
        }
      }, 100);
    }
  };

  return (
    <div 
      className="chat-history"
      ref={messagesContainerRef}
      onScroll={handleScroll}
    >
      {loading && hasMore && (
        <div className="loading-indicator">
          Loading previous messages...
        </div>
      )}
      
      {hasMore && !loading && (
        <button 
          className="load-more-button"
          onClick={loadMore}
        >
          Load more messages
        </button>
      )}
      
      {messages.length === 0 ? (
        <div className="empty-chat"
             onLoad={() => console.log('[ChatHistory] Rendering empty state placeholder')}>
          <div className="loading-spinner"></div>
          <p>Initializing your Praxis Agent...</p>
          <p><small>If no message appears after a few seconds, try refreshing the page.</small></p>
        </div>
      ) : (
        <>
          {/* Add debug overlay for development */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="debug-info" style={{ fontSize: '10px', color: '#666', padding: '4px', background: '#f9f9f9' }}>
              Messages: {messages.length} | Agent: {agentName}
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              agentColor={agentColor}
              agentName={agentName}
            />
          ))}
        </>
      )}
      
      {/* Invisible element to scroll to when new messages arrive */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;