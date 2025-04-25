import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatInterface, { ChatMessage } from './chat/ChatInterface'; // Import ChatMessage
import IssuesMatrix, { Issue } from './IssuesMatrix'; // Import the IssuesMatrix component
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
          style={{ width: `${((step + 1) / 9) * 100}%` }}
        ></div>
      </div>
      <div className="stage-label">
        Step {step + 1} of 9
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
  // Important: All hooks must be called here at the top level, before any conditional returns
  const [agentId, setAgentId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [metadata, setMetadata] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false); // Declare sending state
  const [agent, setAgent] = useState<{ name: string; color: string } | null>(null); // Declare agent state
  const [issueMatrix, setIssueMatrix] = useState<Issue[]>([]); // State for issues matrix
  
  // Add diagnostic logging whenever issueMatrix changes
  useEffect(() => {
  }, [issueMatrix]);
  

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
        setAgent({ name: data.name, color: data.color }); // Update agent state with fetched data
        
        // Enhanced check for initial page load
        console.log('[OnboardingChat] Initial agent fetch - onboardingCompleted status:', data.onboardingCompleted);
        
        if (data.onboardingCompleted) {
          console.log('[OnboardingChat] Onboarding already completed, redirecting to dashboard');
          handleOnboardingComplete();
          return;
        }
        
        // If requested, trigger initial agent message if no messages exist
        if (triggerInitialMessage) {
          try {
            const messagesRes = await fetch(`/api/agents/${data.id}/messages?onboarding=true`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!messagesRes.ok) {
              throw new Error(`Failed to fetch messages: ${messagesRes.status}`);
            }
            
            const messagesData = await messagesRes.json();
            
            // Only send proactive message if there are truly no messages (from user or agent)
            if (!messagesData.messages || messagesData.messages.length === 0) {
              
              // Create a temporary agent message to show immediately
              const tempAgentMessage: ChatMessage = {
                id: `temp-greeting-${Date.now()}`,
                content: "(1/9) Welcome! What is your name?",
                sender: 'agent',
                timestamp: new Date().toISOString(),
                metadata: {
                  step: 0,
                  nextStep: 1,
                  agentName: 'Agent',
                  isOnboarding: true,
                  completedOnboarding: false
                }
              };
              
              // Show a temporary message immediately while the real message loads
              setNewChatMessages(prev => [...prev, tempAgentMessage]);
              
              // Send actual request to get the real initial message
              const initResponse = await fetch('/api/onboarding/message', {
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
              
              if (!initResponse.ok) {
                throw new Error(`Failed to send initial message: ${initResponse.status}`);
              }
              
              const initData = await initResponse.json();
              
              // Replace the temporary message with the real one
              if (initData.agentMessage) {
                setNewChatMessages(prev => {
                  const filtered = prev.filter(msg => !msg.id.startsWith('temp-greeting-'));
                  return [...filtered, initData.agentMessage];
                });
              }
            } else {
            }
          } catch (err) {
            // Don't fail the whole component if just the initial message fails
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
            setAgent({ name: newAgent.name, color: newAgent.color }); // Update agent state with new agent data
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
    console.log('[OnboardingChat] handleOnboardingComplete called, navigating to dashboard');
    
    // Update local state to indicate completion
    try {
      // Force agent refresh on dashboard load
      localStorage.setItem('agent_refresh_needed', 'true');
      
      // Navigate to dashboard
      navigate('/dashboard');
      
      // Set a timeout just in case the navigation doesn't trigger
      setTimeout(() => {
        console.log('[OnboardingChat] Navigation timeout, forcing redirect');
        window.location.href = '/dashboard';
      }, 500);
    } catch (err) {
      console.error('[OnboardingChat] Error during navigation to dashboard:', err);
      // Force direct navigation if React router fails
      window.location.href = '/dashboard';
    }
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


        // LIVE POSITIONS MATRIX UPDATE: If extractedPreferences.issuesMatrix is present, update immediately
        if (data.extractedPreferences && Array.isArray(data.extractedPreferences.issuesMatrix)) {
          // Log what we received from backend
          console.log('[OnboardingChat] Received issuesMatrix from backend:',
                     JSON.stringify(data.extractedPreferences.issuesMatrix));
          
          // Map backend issuesMatrix to Issue[] for the component
          const liveMatrix: Issue[] = data.extractedPreferences.issuesMatrix.map((issue: any) => ({
            id: issue.id,
            title: issue.title || `Issue ${issue.id}`,
            stance: issue.stance,
            reason: issue.reason || issue.summary, // Use summary as fallback for reason
            description: issue.description || '',
            isPriority: !!issue.isPriority
          }));
          
          console.log('[OnboardingChat] Updated issue matrix:', JSON.stringify(liveMatrix));
          setIssueMatrix(liveMatrix);
        }

        // If onboarding is completed, build the positions matrix from extractedPreferences.issueStances
        if (data.completedOnboarding && data.extractedPreferences && Array.isArray(data.extractedPreferences.issueStances)) {
          // Map issue numbers to titles using the latest issue list from metadata or fallback
          const issueNumberToTitle: Record<string, string> = {};
          if (data.metadata && data.metadata.selectedIssues && data.metadata.issueQueue && data.metadata.issueDetails) {
            // If backend provides issueDetails, use it
            Object.entries(data.metadata.issueDetails).forEach(([num, detail]: [string, any]) => {
              issueNumberToTitle[num] = detail.title || `Issue ${num}`;
            });
          } else if (data.metadata && data.metadata.selectedIssues) {
            // Fallback: use generic titles
            data.metadata.selectedIssues.forEach((num: string) => {
              issueNumberToTitle[num] = `Issue ${num}`;
            });
          }
          // Build the positions matrix
          const positionsMatrix: Issue[] = data.extractedPreferences.issueStances.map((stanceObj: any, idx: number) => {
            // Split reason into bullet points if possible
            let bulletPoints: string[] = [];
            if (stanceObj.reason) {
              bulletPoints = stanceObj.reason.split(/[\n•\-•]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            }
            return {
              id: stanceObj.issue,
              title: issueNumberToTitle[stanceObj.issue] || stanceObj.issue,
              stance: stanceObj.stance,
              reason: bulletPoints.length > 1 ? bulletPoints : stanceObj.reason,
              isPriority: data.extractedPreferences.topPriorityIssue === stanceObj.issue
            };
          });
          setIssueMatrix(positionsMatrix);
        } else if (!(
          data.extractedPreferences && Array.isArray(data.extractedPreferences.issuesMatrix)
        )) {
          // Removed fallback call to updateIssueMatrix
        }

        // Re-fetch agent info after onboarding answers to update name/color
        // This is important to get the potentially updated agent name and color
        try {
          const agentData = await fetchAgentInfo();
          if (agentData) {
             setAgentId(agentData.id); // Ensure agentId is still correct
             setAgent({ name: agentData.name, color: agentData.color });
          } else {
          }
        } catch (err) {
        }

        // Enhanced onboarding completion detection with extra logging
        console.log('[DEBUG-FRONTEND] Checking onboarding completion flags:', {
          completedOnboarding: data.completedOnboarding,
          currentStep: step,
          nextStep: data.nextStep,
          messageMetadata: data.agentMessage?.metadata,
          hasExtractedPreferences: !!data.extractedPreferences,
          agentMessageId: data.agentMessage?.id
        });

        // Fetch the agent info directly to verify onboardingCompleted status
        try {
          console.log('[DEBUG-FRONTEND] Fetching latest agent info to verify onboardingCompleted status');
          const agentVerifyResponse = await fetch('/api/agents/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (agentVerifyResponse.ok) {
            const agentData = await agentVerifyResponse.json();
            console.log('[DEBUG-FRONTEND] Latest agent data:', {
              id: agentData.id,
              name: agentData.name,
              onboardingCompleted: agentData.onboardingCompleted
            });
            
            // If agent data shows onboarding is completed, redirect
            if (agentData.onboardingCompleted) {
              console.log('[DEBUG-FRONTEND] Agent data shows onboardingCompleted=true, redirecting to dashboard');
              handleOnboardingComplete();
              return; // Immediately return to ensure redirection happens
            }
          } else {
            console.error('[DEBUG-FRONTEND] Failed to fetch agent data:', await agentVerifyResponse.text());
          }
        } catch (agentError) {
          console.error('[DEBUG-FRONTEND] Error fetching agent data:', agentError);
        }

        if (data.completedOnboarding || step >= 8 || data.nextStep >= 8) {
          console.log('[DEBUG-FRONTEND] Detected completedOnboarding flag from message response, redirecting to dashboard');
          handleOnboardingComplete();
          return; // Immediately return to ensure redirection happens
        }

        // Additional check for the metadata of the agent message
        if (data.agentMessage &&
            data.agentMessage.metadata &&
            (data.agentMessage.metadata.completedOnboarding ||
             data.agentMessage.metadata.onboardingComplete ||
             data.agentMessage.metadata.step >= 8)) {
          console.log('[DEBUG-FRONTEND] Detected completion in agent message metadata, redirecting to dashboard');
          handleOnboardingComplete();
          return; // Immediately return to ensure redirection happens
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

  // Add log to confirm when handleSendMessage is called and with what data
  const handleSendMessageWithLog = async (message: string) => {
    await handleSendMessage(message);
  };

  // Removed updateIssueMatrix function as it's no longer needed

  // Conditional returns must come after all hooks are defined
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

  return (
    <div className="onboarding-chat-container">
      <div className="onboarding-header">
        <h2>Welcome to Praxis</h2>
        <p>Let's set up your personal representative agent to advance your interests.</p>
        <p><small>Praxis Agents operate under the Prime Directive of Representational Primacy</small></p>
      </div>
      <OnboardingProgress step={step} />
      
      {/* Display issues matrix - always show after step 1 even if empty */}
      {step > 0 && (
        <div className="issues-matrix-container">
          <IssuesMatrix
            selectedIssues={issueMatrix}
            step={step}
            agentColor={agent?.color || "#4299E1"}
          />
          {issueMatrix.length === 0 && step > 1 && (
            <div className="matrix-debug-info">
              <p><small>Matrix is empty. Selected issues count: {metadata?.selectedIssues?.length || 0}</small></p>
              <button
                className="debug-button"
                onClick={() => {
                  if (metadata?.selectedIssues?.length > 0) {
                    // Create placeholder issues for debugging
                    const placeholders = (metadata.selectedIssues as string[]).map(id => ({
                      id,
                      title: `Issue ${id}`,
                      description: '',
                      stance: undefined,
                      reason: undefined,
                      isPriority: false
                    }));
                    setIssueMatrix(placeholders);
                  }
                }}
              >
                Force Load Matrix
              </button>
            </div>
          )}
        </div>
      )}
      
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
              setAgent({ name: data.name, color: data.color }); // Update agent state with fetched data
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