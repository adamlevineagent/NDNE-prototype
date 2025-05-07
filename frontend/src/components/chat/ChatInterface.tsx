import React, { useState, useEffect, useCallback } from 'react';
import { chat } from '../../api/apiClient';
import ChatHistory from './ChatHistory';
import ChatInput from './ChatInput';
import { useChatContext } from '../../hooks/useChatContext';
import ForumPostDisplay from '../forum/ForumPostDisplay';
import ForumAnalysisDisplay from '../forum/ForumAnalysisDisplay';
import './ChatInterface.css';

export interface ChatInterfaceProps {
  agentId: string;
  isOnboarding?: boolean;
  onComplete?: () => void;  // For onboarding completion
  onSendMessage?: (message: string) => Promise<void>;
  onboardingStep?: number;
  onboardingMetadata?: any;
  newMessages?: ChatMessage[]; // New prop to receive messages to append
  agentName?: string; // Add agentName prop
  agentColor?: string; // Add agentColor prop
  userName?: string; // Add userName prop
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: string;
  metadata?: {
    isOnboarding?: boolean;
    stage?: 'initial' | 'preferences' | 'priorities' | 'confirmation' | 'complete';
    nextStage?: 'initial' | 'preferences' | 'priorities' | 'confirmation' | 'complete';
    onboardingComplete?: boolean;
    forumPost?: {
      title: string;
      body: string;
      category: string;
    };
    forumAnalysis?: {
      summary: string;
      keyTopics: string[];
      relevanceScore: number;
      alignmentAnalysis: string;
      actionItems: string[];
      sentiment?: string;
      recommendedResponse?: string;
    };
    [key: string]: any;
  };
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  agentId,
  isOnboarding = false,
  onComplete,
  onSendMessage,
  onboardingStep,
  onboardingMetadata,
  newMessages, // Receive newMessages prop
  agentName, // Receive agentName prop
  agentColor, // Receive agentColor prop
  userName // Receive userName prop
}) => {
  // Get chat context from the hook
  const { chatContext } = useChatContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Remove local agent state as it's now passed via props
  // const [agent, setAgent] = useState<{ name: string; color: string } | null>(null);

  // Log whenever props change
  React.useEffect(() => {
    // Removed debug log
  }, [agentId, isOnboarding, onboardingStep, onboardingMetadata, onSendMessage, newMessages, agentName, agentColor, userName]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        // Agent details are now passed via props, no need to fetch here
        // if (!agentName || !agentColor) {
        //   // Optionally handle case where agent info is not yet available
        // }

        // Get chat messages
        const messagesResponse = await fetch(`/api/agents/${agentId}/messages?onboarding=${isOnboarding ? 'true' : 'false'}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await messagesResponse.json();
        setMessages(data.messages || []);
        setHasMore(false); // Pagination not implemented for custom endpoint
      } catch (err: any) {
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [agentId, isOnboarding]); // Removed reloadKey from dependency array, keep agentId and isOnboarding

  // Effect to append new messages when the newMessages prop changes
  useEffect(() => {
    // Roo Debug: Log newMessages and agentName when newMessages changes - Attempt 5
    console.log('[ChatInterface] useEffect [newMessages] triggered. newMessages:', newMessages, 'agentName:', agentName, 'userName:', userName);
    if (newMessages && newMessages.length > 0) {
      setMessages(prevMessages => {
        console.log('[ChatInterface] Before appending newMessages:', prevMessages.map(msg => msg.id)); // Log keys before update
        // Filter out any temporary messages before appending
        const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'));
        
        // Create a map of existing message IDs for quick lookup
        const existingMessageIds = new Set(filteredMessages.map(msg => msg.id));

        // Filter out new messages that are already in the existing list
        const uniqueNewMessages = newMessages.filter(msg => !existingMessageIds.has(msg.id));

        const updatedMessages = [...filteredMessages, ...uniqueNewMessages];
        console.log('[ChatInterface] Appending new messages:', uniqueNewMessages.map(msg => msg.id), 'Updated messages:', updatedMessages.map(msg => msg.id)); // Log keys after update
        return updatedMessages;
      });
    }
  }, [newMessages, agentName]); // Depend on newMessages and agentName prop

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
      setError('Failed to load more messages. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [agentId, hasMore, isOnboarding, loading, messages]);

  // Helper function to parse forum post command
  const parseForumPostCommand = (content: string) => {
    const regex = /\/discourse_post in category "([^"]+)" title "([^"]+)" using my preferences on "([^"]+)"/;
    const match = content.match(regex);
    
    if (match) {
      return {
        category: match[1],
        title: match[2],
        topic: match[3]
      };
    }
    
    return null;
  };
  
  // Helper function to parse forum read command
  const parseForumReadCommand = (content: string) => {
    const regex = /\/discourse_read from "([^"]+)" topic "([^"]+)": "(.*?)"/s;
    const match = content.match(regex);
    
    if (match) {
      return {
        category: match[1],
        topic: match[2],
        content: match[3]
      };
    }
    
    return null;
  };

  // Send a new message
  const sendMessage = async (content: string) => {
    if (onSendMessage) {
      setSending(true);
      setError(null);
      try {
        // onSendMessage is now responsible for updating messages state in parent
        await onSendMessage(content);
      } catch (err) {
        setError('Failed to send message. Please try again.');
      } finally {
        setSending(false);
      }
      return;
    }

    // Default legacy message sending logic (should not be used in OnboardingChat)
    if (sending || !content.trim()) return;
    try {
      setSending(true);
      setError(null);

      // Create a temporary user message to show immediately
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        content,
        sender: 'user',
        timestamp: new Date().toISOString(),
        metadata: { userName } // Add userName to metadata
      };

      setMessages(prevMessages => {
        const updated = [...prevMessages, tempUserMessage];
        return updated;
      });

      // Create metadata for the API request
      let requestMetadata: any = { isOnboarding, userName };
      
      // Check if this is a forum command
      const forumPostCommand = parseForumPostCommand(content);
      const forumReadCommand = parseForumReadCommand(content);
      
      // Set command type in metadata if it's a forum command
      if (forumPostCommand) {
        requestMetadata.commandType = 'forum_post';
        requestMetadata.forumCommand = forumPostCommand;
      } else if (forumReadCommand) {
        requestMetadata.commandType = 'forum_read';
        requestMetadata.forumCommand = forumReadCommand;
      }
      
      // Add context data from chatContext
      if (chatContext?.type && chatContext?.data) {
        console.log('[ChatInterface] Including context data in message:', {
          contextType: chatContext.type,
          data: chatContext.data
        });
        
        requestMetadata.contextType = chatContext.type;
        
        // Add specific contextual data based on type
        if (chatContext.type === 'positions') {
          const positionsData = chatContext.data as any;
          if (positionsData && positionsData.selectedIssue) {
            requestMetadata.selectedIssue = positionsData.selectedIssue;
          }
        } else if (chatContext.type === 'activity') {
          const activityData = chatContext.data as any;
          if (activityData && activityData.selectedAction) {
            requestMetadata.selectedAction = activityData.selectedAction;
          }
        } else if (chatContext.type === 'proposals') {
          const proposalData = chatContext.data as any;
          if (proposalData && proposalData.selectedProposal) {
            requestMetadata.selectedProposal = proposalData.selectedProposal;
          }
        }
        
        // Always include the context data for the LLM to use
        requestMetadata.context = chatContext.data;
      }

      // Include current stage information if available from previous messages
      if (isOnboarding && messages.length > 0) {
        // Find the most recent agent message with stage info in metadata
        const recentAgentMessages = [...messages]
          .reverse()
          .filter(m => m.sender === 'agent' && m.metadata);

        const lastAgentWithStage = recentAgentMessages.find(m =>
          m.metadata?.stage || m.metadata?.nextStage
        );

        if (lastAgentWithStage?.metadata) {
          // Use nextStage if available, otherwise fallback to current stage
          requestMetadata.stage = lastAgentWithStage.metadata.nextStage ||
                                 lastAgentWithStage.metadata.stage ||
                                 'initial';
        }
      }

      // For forum commands, call the appropriate API endpoints
      let response;
      if (forumPostCommand) {
        // Call forum post generation API
        response = await fetch(`/api/forum/generate-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            agentId,
            category: forumPostCommand.category,
            title: forumPostCommand.title,
            topic: forumPostCommand.topic
          })
        });
        
        const forumData = await response.json();
        
        // Create response including the forum post data
        response = {
          data: {
            userMessage: {
              ...tempUserMessage,
              id: `user-${Date.now()}`
            },
            agentMessage: {
              id: `agent-${Date.now()}`,
              content: `I've generated a forum post for "${forumPostCommand.title}" in the ${forumPostCommand.category} category. Here's the content:`,
              sender: 'agent',
              timestamp: new Date().toISOString(),
              metadata: {
                forumPost: {
                  title: forumData.title || forumPostCommand.title,
                  body: forumData.body,
                  category: forumPostCommand.category
                }
              }
            }
          }
        };
      } else if (forumReadCommand) {
        // Call forum content processing API
        response = await fetch(`/api/forum/process-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            agentId,
            category: forumReadCommand.category,
            topic: forumReadCommand.topic,
            content: forumReadCommand.content
          })
        });
        
        const analysisData = await response.json();
        
        // Parse the forum analysis from the response
        let forumAnalysis;
        try {
          // Check if the response is already a parsed object
          if (typeof analysisData === 'object' && analysisData.summary) {
            forumAnalysis = analysisData;
          } else {
            // Try to extract JSON from the text response
            const jsonMatch = analysisData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              forumAnalysis = JSON.parse(jsonMatch[0]);
            } else {
              // Fallback for plain text response
              forumAnalysis = {
                summary: analysisData,
                keyTopics: [],
                relevanceScore: 50,
                alignmentAnalysis: "Analysis not available in structured format",
                actionItems: ["Review the full analysis manually"]
              };
            }
          }
        } catch (error) {
          console.error("Error parsing forum analysis:", error);
          forumAnalysis = {
            summary: "Failed to parse analysis result",
            keyTopics: [],
            relevanceScore: 0,
            alignmentAnalysis: "Error occurred during analysis",
            actionItems: ["Try again with different content"]
          };
        }
        
        // Create response including the forum analysis data
        response = {
          data: {
            userMessage: {
              ...tempUserMessage,
              id: `user-${Date.now()}`
            },
            agentMessage: {
              id: `agent-${Date.now()}`,
              content: `Here's my analysis of the forum content from "${forumReadCommand.topic}" in the ${forumReadCommand.category} category:`,
              sender: 'agent',
              timestamp: new Date().toISOString(),
              metadata: {
                forumAnalysis
              }
            }
          }
        };
      } else {
        // Regular chat message
        response = await chat.sendMessage({
          agentId,
          content,
          metadata: requestMetadata
        });
      }

      const data = response.data;

      // Update messages state: replace temporary message and add agent response
      setMessages(prevMessages => {
        console.log('[ChatInterface] Before API response update (legacy):', prevMessages.map(msg => msg.id)); // Log keys before update
        // Find and replace the temporary user message with the actual saved user message
        const updatedMessages = prevMessages.map(msg =>
          msg.id.startsWith('temp-') && msg.content === data.userMessage.content && msg.sender === 'user'
            ? data.userMessage
            : msg
        );

        // Check if the agent message is already in the list (can happen with initial load + real-time updates)
        const agentMessageExists = updatedMessages.some(msg => msg.id === data.agentMessage.id);

        // Append the agent message only if it's not already present
        if (!agentMessageExists) {
          updatedMessages.push(data.agentMessage);
        }
        console.log('[ChatInterface] After API response update (legacy):', updatedMessages.map(msg => msg.id)); // Log keys after update
        return updatedMessages;
      });

      // Check if onboarding is completed from agent response metadata
      if (isOnboarding &&
          data.agentMessage.metadata &&
          (data.agentMessage.metadata.onboardingComplete ||
           data.agentMessage.metadata.completedOnboarding) &&
          onComplete) {
        // Allow a small delay to see the completion message before redirecting
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } catch (err: any) {
      setError('Failed to send message. Please try again.');

      // Remove the temporary message on error and add an error message
      setMessages(prevMessages => {
        // Use a safer approach that doesn't rely on the specific tempUserMessage variable
        const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'));
        return [
          ...filteredMessages,
          {
            id: `error-${Date.now()}`,
            content: "I'm sorry, there was an error processing your message. Please try again.",
            sender: "agent",
            timestamp: new Date().toISOString(),
            metadata: { isError: true }
          }
        ];
      });
    } finally {
      setSending(false);
    }
  };

  // Custom renderer for messages with forum content
  const renderCustomMessage = (message: ChatMessage) => {
    if (message.metadata?.forumPost) {
      const post = message.metadata.forumPost;
      return (
        <ForumPostDisplay
          title={post.title}
          body={post.body}
          category={post.category}
        />
      );
    }
    
    if (message.metadata?.forumAnalysis) {
      const analysis = message.metadata.forumAnalysis;
      return (
        <ForumAnalysisDisplay
          summary={analysis.summary}
          keyTopics={analysis.keyTopics}
          relevanceScore={analysis.relevanceScore}
          alignmentAnalysis={analysis.alignmentAnalysis}
          actionItems={analysis.actionItems}
          sentiment={analysis.sentiment}
          recommendedResponse={analysis.recommendedResponse}
        />
      );
    }
    
    return null;
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
          agentColor={agentColor} // Use prop
          agentName={agentName} // Use prop
          userName={userName} // Pass userName to ChatHistory
        />

        <ChatInput
          onSendMessage={sendMessage}
          disabled={sending}
          placeholder={sending ? "Waiting for response..." : "Type your message or use /discourse_post or /discourse_read commands..."}
        />
      </div>
    </div>
  );
};

export default ChatInterface;