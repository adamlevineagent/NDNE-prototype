import React, { useState, useEffect, useCallback } from 'react';
import { chat } from '../../api/apiClient';
import ChatHistory from './ChatHistory';
import ChatInput from './ChatInput';
import './ChatInterface.css';

export interface ChatInterfaceProps {
  agentId: string;
  isOnboarding?: boolean;
  onComplete?: () => void;  // For onboarding completion
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: string;
  metadata?: any;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  agentId,
  isOnboarding = false,
  onComplete
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<{ name: string; color: string } | null>(null);
  
  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get agent details to display name and color
        const agentResponse = await (window as any).fetch(`/api/agents/${agentId}`);
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          setAgent({
            name: agentData.name || 'Agent',
            color: agentData.color || '#007bff'
          });
        }
        
        // Get chat messages
        const messagesResponse = await chat.getMessages(agentId, {
          limit: 20,
          onboarding: isOnboarding
        });
        
        const data = messagesResponse.data;
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
      } catch (err: any) {
        console.error('Failed to load messages:', err);
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
  }, [agentId, isOnboarding]);
  
  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || messages.length === 0) return;
    
    try {
      setLoading(true);
      
      const oldestMessage = messages[0];
      const response = await chat.getMessages(agentId, {
        limit: 20,
        before: oldestMessage.timestamp,
        onboarding: isOnboarding
      });
      
      const data = response.data;
      
      setMessages(prevMessages => [
        ...(data.messages || []),
        ...prevMessages
      ]);
      
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Failed to load more messages:', err);
      setError('Failed to load more messages. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [agentId, hasMore, isOnboarding, loading, messages]);
  
  // Send a new message
  const sendMessage = async (content: string) => {
    if (sending || !content.trim()) return;
    
    try {
      setSending(true);
      setError(null);
      
      // Create a temporary user message to show immediately
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, tempUserMessage]);
      
      // Send message to API
      const response = await chat.sendMessage({
        agentId,
        content,
        metadata: { isOnboarding }
      });
      
      const data = response.data;
      
      // Replace temporary message with actual one and add agent response
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => msg.id !== tempUserMessage.id);
        return [
          ...filteredMessages,
          data.userMessage,
          data.agentMessage
        ];
      });
      
      // Check if onboarding is completed from agent response metadata
      if (isOnboarding && 
          data.agentMessage.metadata && 
          data.agentMessage.metadata.onboardingComplete && 
          onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again later.');
      
      // Remove the temporary message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== `temp-${Date.now()}`)
      );
    } finally {
      setSending(false);
    }
  };
  
  return (
    <div className="chat-interface">
      {error && (
        <div className="chat-error">
          {error}
          <button 
            className="dismiss-error"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="chat-container">
        <ChatHistory
          messages={messages}
          loadMore={loadMoreMessages}
          hasMore={hasMore}
          loading={loading}
          agentColor={agent?.color}
          agentName={agent?.name}
        />
        
        <ChatInput
          onSendMessage={sendMessage}
          disabled={sending}
          placeholder={sending ? "Waiting for response..." : "Type your message..."}
        />
      </div>
    </div>
  );
};

export default ChatInterface;