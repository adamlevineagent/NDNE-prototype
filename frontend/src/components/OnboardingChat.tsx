import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatInterface, { ChatMessage } from './chat/ChatInterface'; // Import ChatMessage
import './OnboardingChat.css';

/**
 * OnboardingProgress component to show the current progress of the onboarding process
 */
interface OnboardingProgressProps {
  step: number;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ step }) => {
  return (
    <div className="onboarding-progress">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((step + 1) / 8) * 100}%` }}
        ></div>
      </div>
      <div className="stage-label">
        Step {step + 1} of 8
      </div>
    </div>
  );
};

/**
 * Main OnboardingChat component that replaces the form-based wizard
 */
const OnboardingChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [metadata, setMetadata] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false); // Declare sending state
  const [agent, setAgent] = useState<{ name: string; color: string } | null>(null); // Declare agent state

  // State to hold new messages to pass to ChatInterface
  const [newChatMessages, setNewChatMessages] = useState<ChatMessage[]>([]); // Explicitly type state

  // Get or create agent when component mounts
  // Helper to fetch agent info with JWT
  const fetchAgentInfo = async () => {
    const response = await fetch('/api/agents/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch agent');
    return response.json();
  };

  useEffect(() => {
    const getOrCreateAgent = async (triggerInitialMessage = false) => {
      try {
        setLoading(true);
        setError(null); // Clear error on new attempt
        const data = await fetchAgentInfo();
        setAgentId(data.id);
        setAgent({ name: data.name, color: data.color }); // Update agent state
        if (data.onboardingCompleted) {
          navigate('/dashboard');
          return;
        }
        // If requested, trigger initial agent message if no messages exist
        if (triggerInitialMessage) {
          const messagesRes = await fetch(`/api/agents/${data.id}/messages?onboarding=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const messagesData = await messagesRes.json();
          // Only send proactive message if there are truly no messages (from user or agent)
          if (!messagesData.messages || messagesData.messages.length === 0) {
            await fetch('/api/onboarding/message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                agentId: data.id,
                message: '', // Empty message triggers agent hello
                step: 0
              })
            });
          }
        }
      } catch (err: any) {
        if (err.message === 'Failed to fetch agent') {
          // Create new agent if doesn't exist
          const createResponse = await fetch('/api/agents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: `${user?.email?.split('@')[0]}'s Agent`,
              color: generateRandomColor()
            })
          });
          if (createResponse.ok) {
            const newAgent = await createResponse.json();
            setAgentId(newAgent.id);
            setAgent({ name: newAgent.name, color: newAgent.color }); // Update agent state
          } else {
            setError('Failed to create agent');
          }
        } else {
          setError('Failed to initialize onboarding. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      getOrCreateAgent(true); // Always trigger initial message on first load
    }
  }, [user, navigate]);

  // Handler for onboarding completion
  const handleOnboardingComplete = () => {
    navigate('/dashboard');
  };

  // Generate a random color for a new agent
  const generateRandomColor = () => {
    const colors = [
      '#4299E1', // Blue
      '#48BB78', // Green
      '#F6AD55', // Orange
      '#9F7AEA', // Purple
      '#F56565', // Red
      '#ED8936', // Deep Orange
      '#38B2AC', // Teal
      '#667EEA'  // Indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Handle sending onboarding messages and updating FSM state
  const handleSendMessage = async (message: string) => {
    if (!agentId) return;

    // Optimistically add user message to the chat
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
      metadata: { isTemp: true } // Mark as temporary
    };
    setNewChatMessages(prevMessages => [...prevMessages, tempUserMessage]);

    try {
      setSending(true); // Set sending state to true
      const response = await fetch('/api/onboarding/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          agentId,
          message,
          step: metadata.step || 0,
          selectedIssues: metadata.selectedIssues,
          issueQueue: metadata.issueQueue,
          currentIssueIndex: metadata.currentIssueIndex
        })
      });
      if (response.ok) {
        const data = await response.json();
        // Update step and metadata states immediately
        setStep(data.nextStep ?? 0);
        setMetadata(data.metadata || {});
        console.log('[OnboardingChat] State updated: step', data.nextStep, 'metadata', data.metadata);

        // Re-fetch agent info after onboarding answers to update name/color
        // This is important to get the potentially updated agent name and color
        try {
          const agentData = await fetchAgentInfo();
          // Update agent state with the new data, including the name
          if (agentData) {
             setAgentId(agentData.id); // Ensure agentId is still correct
             // Assuming agentData structure is compatible with ChatInterface's agent prop
             // ChatInterface expects { name: string; color: string }
             setAgent({ name: agentData.name, color: agentData.color });
             console.log('[OnboardingChat] Agent state updated after fetch:', { name: agentData.name, color: agentData.color });
          } else {
            console.log('[OnboardingChat] fetchAgentInfo returned no data after message.');
          }
        } catch (err) {
           console.error("Failed to re-fetch agent info after message:", err);
        }

        if (data.completedOnboarding) {
          handleOnboardingComplete();
        }
        // Pass the new messages to ChatInterface to append
        const newMessages: ChatMessage[] = []; // Explicitly type newMessages array
        if (data.userMessage) {
          newMessages.push(data.userMessage);
        }
        if (data.agentMessage) {
          newMessages.push(data.agentMessage);
        }
        if (newMessages.length > 0) {
          // Replace the temporary message with the actual user message and add the agent message
          setNewChatMessages(prevMessages => {
             const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'));
             return [...filteredMessages, ...newMessages];
          });
        }
      } else {
        throw new Error('Failed to send onboarding message');
      }
    } catch (err) {
      setError('Failed to send onboarding message. Please try again.');
      // Remove the temporary message on error
      setNewChatMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempUserMessage.id));
    } finally {
      setSending(false); // Set sending state to false
    }
  };

  if (loading) {
    return (
      <div className="onboarding-chat-container loading">
        <div className="loading-spinner"></div>
        <p>Setting up your personal agent...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding-chat-container error">
        <div className="error-message">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  // Add log to confirm when handleSendMessage is called and with what data
  const handleSendMessageWithLog = async (message: string) => {
    console.log('[OnboardingChat] handleSendMessage called with:', { message, step, metadata });
    await handleSendMessage(message);
    // Log after send to see if state changes
    setTimeout(() => {
      console.log('[OnboardingChat] After send, step:', step, 'metadata:', metadata);
    }, 100);
  };

  return (
    <div className="onboarding-chat-container">
      <div className="onboarding-header">
        <h2>Welcome to Praxis</h2>
        <p>Let's set up your personal representative agent to advance your interests.</p>
        <p><small>Praxis Agents operate under the Prime Directive of Representational Primacy</small></p>
      </div>
      <OnboardingProgress step={step} />
      {agentId && (
        <div className="chat-wrapper">
          <ChatInterface
            agentId={agentId}
            isOnboarding={true}
            onSendMessage={handleSendMessageWithLog}
            onboardingStep={step}
            onboardingMetadata={metadata}
            onComplete={handleOnboardingComplete}
            newMessages={newChatMessages} // Pass new messages to ChatInterface
            agentName={agent?.name} // Pass agent name to ChatInterface
            agentColor={agent?.color} // Pass agent color to ChatInterface
          />
        </div>
      )}
      <div className="onboarding-footer">
        <p>
          Your Praxis Agent will learn from this conversation to better represent your real interests.
          It will advance your values following the priority order: 1) Representational Primacy, 2) Transparency,
          3) Constructive-Cooperation, 4) Civility, 5) Non-Manipulation, and 6) Self-Consistency.
        </p>
        <button
          className="onboarding-reset-btn"
          style={{ marginTop: 16, background: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}
          onClick={async () => {
            if (!agentId) return;
            setLoading(true);
            setError(null);
            try {
              const response = await fetch(`/api/onboarding/reset`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ agentId })
              });
              if (!response.ok) throw new Error('Failed to reset onboarding');
              // Re-fetch agent info and reset state
              const data = await fetchAgentInfo();
              setAgentId(data.id);
              setAgent({ name: data.name, color: data.color }); // Update agent state
              setStep(0);
              setMetadata({});
              // Trigger initial agent message after reset
              await fetch('/api/onboarding/message', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  agentId: data.id,
                  message: '',
                  step: 0
                })
              });
            } catch (err) {
              setError('Failed to reset onboarding. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        >
          Reset Onboarding
        </button>
      </div>
    </div>
  );
};

export default OnboardingChat;