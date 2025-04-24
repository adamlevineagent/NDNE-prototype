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
          style={{ width: `${((step + 1) / 7) * 100}%` }}
        ></div>
      </div>
      <div className="stage-label">
        Step {step + 1} of 7
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
  console.log('[HookDebug] Initializing hooks');
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
    console.log('[IssuesMatrixDebug] Matrix updated:', {
      count: issueMatrix.length,
      issues: issueMatrix.map(i => ({
        id: i.id,
        title: i.title,
        stance: i.stance || 'NONE',
        hasReason: !!i.reason,
        isPriority: i.isPriority
      }))
    });
  }, [issueMatrix]);
  
  console.log('[HookDebug] All basic hooks initialized');

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
        console.log('[OnboardingDebug] Fetching agent info...');
        
        const data = await fetchAgentInfo();
        console.log('[OnboardingDebug] Agent info fetched:', {
          id: data.id,
          name: data.name,
          onboardingCompleted: data.onboardingCompleted
        });
        
        setAgentId(data.id);
        setAgent({ name: data.name, color: data.color }); // Update agent state with fetched data
        
        if (data.onboardingCompleted) {
          console.log('[OnboardingDebug] Onboarding already completed, navigating to dashboard');
          navigate('/dashboard');
          return;
        }
        
        // If requested, trigger initial agent message if no messages exist
        if (triggerInitialMessage) {
          console.log('[OnboardingDebug] Checking for existing messages...');
          try {
            const messagesRes = await fetch(`/api/agents/${data.id}/messages?onboarding=true`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!messagesRes.ok) {
              throw new Error(`Failed to fetch messages: ${messagesRes.status}`);
            }
            
            const messagesData = await messagesRes.json();
            console.log('[OnboardingDebug] Messages fetched:', {
              count: messagesData.messages ? messagesData.messages.length : 0
            });
            
            // Only send proactive message if there are truly no messages (from user or agent)
            if (!messagesData.messages || messagesData.messages.length === 0) {
              console.log('[OnboardingDebug] No messages found, sending initial greeting...');
              
              // Create a temporary agent message to show immediately
              const tempAgentMessage: ChatMessage = {
                id: `temp-greeting-${Date.now()}`,
                content: "(1/7) Welcome! I'm your Praxis Agent. Pick a short name for me when we chat.",
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
              console.log('[OnboardingDebug] Initial message sent, response:', {
                messageId: initData.agentMessage?.id,
                step: initData.nextStep
              });
              
              // Replace the temporary message with the real one
              if (initData.agentMessage) {
                setNewChatMessages(prev => {
                  const filtered = prev.filter(msg => !msg.id.startsWith('temp-greeting-'));
                  return [...filtered, initData.agentMessage];
                });
              }
            } else {
              console.log('[OnboardingDebug] Found existing messages, not sending initial greeting');
            }
          } catch (err) {
            console.error('[OnboardingDebug] Error while handling initial message:', err);
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

        // Add detailed logging about the message content for issue extraction
        console.log('[Issues-Matrix-Debug] Processing message response:', {
          step: data.nextStep ?? 0,
          userMessage: message,
          agentMessageContent: data.agentMessage?.content?.substring(0, 100) + '...',
          selectedIssues: data.metadata?.selectedIssues,
          issueQueue: data.metadata?.issueQueue,
          currentMatrixSize: issueMatrix.length
        });

        // Add transaction log for easier tracing
        console.log('[IssuesMatrix-Transaction]', {
          timestamp: new Date().toISOString(),
          event: 'message_processed',
          fromStep: step,
          toStep: data.nextStep ?? 0,
          matrixSizeBefore: issueMatrix.length,
          messageContent: data.agentMessage?.content?.substring(0, 200)
        });

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
        } else {
          // Update issues matrix based on the current step and response content
          updateIssueMatrix(data.nextStep ?? 0, data.metadata || {}, message, data.agentMessage?.content);
        }

        // Re-fetch agent info after onboarding answers to update name/color
        // This is important to get the potentially updated agent name and color
        try {
          const agentData = await fetchAgentInfo();
          if (agentData) {
             setAgentId(agentData.id); // Ensure agentId is still correct
             setAgent({ name: agentData.name, color: agentData.color });
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

  // Add log to confirm when handleSendMessage is called and with what data
  const handleSendMessageWithLog = async (message: string) => {
    console.log('[OnboardingChat] handleSendMessage called with:', { message, step, metadata });
    await handleSendMessage(message);
    // Log after send to see if state changes
    setTimeout(() => {
      console.log('[OnboardingChat] After send, step:', step, 'metadata:', metadata);
    }, 100);
  };

  // Function to parse and update issue matrix based on conversation state
  // IMPORTANT: This hook must be declared before any conditional returns
  console.log('[HookDebug] Defining updateIssueMatrix with useCallback');
  const updateIssueMatrix = useCallback((currentStep: number, currentMetadata: any, userMessage: string, agentResponse?: string) => {
    console.log('[IssuesMatrix] Updating issue matrix for step', currentStep, 'with metadata', currentMetadata);
    console.log('[IssuesMatrix] Current matrix state:', issueMatrix);
    
    // Log step transition to help with debugging
    console.log('[IssuesMatrix] Step transition:', {
      from: currentStep - 1,
      to: currentStep,
      issueMatrixLength: issueMatrix.length,
      selectedIssues: currentMetadata.selectedIssues
    });
    
    // Helper function to extract issue title from responses
    const extractIssueTitleFromResponse = (response: string, issueNumber: string) => {
      // Enhanced pattern to look for various formats of issue titles
      const patterns = [
        new RegExp(`Issue\\s*${issueNumber}\\s*[–-]\\s*([^:]+)`, 'i'),  // Matches "Issue 1 - Title"
        new RegExp(`Issue\\s*${issueNumber}\\s*:\\s*(.+?)(?:SUPPORT|OPPOSE|DEPENDS|$)`, 'i'),  // Matches "Issue 1: Title SUPPORT"
        new RegExp(`Issue\\s*#?${issueNumber}\\s*[:\\s]\\s*(.+?)\\s*$`, 'i')  // Matches "Issue #1: Title" or "Issue 1 Title"
      ];
      
      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      // Fallback if no pattern matches
      return `Issue ${issueNumber}`;
    };
    
    // Extract issue information based on the current step in the FSM
    switch (currentStep) {
      case 1: // User has selected issues
        if (currentMetadata.selectedIssues?.length > 0) {
          // For step 1, we just have the issue IDs, but need to get titles from the agent response
          if (agentResponse) {
            const selectedIssueIds = currentMetadata.selectedIssues as string[];
            
            console.log('[IssuesMatrix] Processing step 1 with selectedIssues:', selectedIssueIds);
            
            // Create placeholder titles using hardcoded issues database if pattern matching fails
            const fallbackIssueTitles: Record<string, string> = {
              '1': 'AI Content Moderation Policies',
              '2': 'Sustainable Urban Development Standards',
              '3': 'Universal Basic Income Implementation',
              '4': 'Genetic Engineering Regulations',
              '5': 'Decentralized Digital Identity Systems',
              '6': 'Autonomous Vehicle Traffic Laws',
              '7': 'Space Resource Mining Rights',
              '8': 'Algorithmic Decision Transparency',
              '9': 'Digital Education Standards',
              '10': 'Wildlife Conservation Incentives'
            };
            
            // Create or update the issue matrix
            const newIssueMatrix: Issue[] = [];
            
            // Extract issue titles from agent response using enhanced pattern matching
            const issueMatches = agentResponse.match(/Issue\s*\d+\s*[\-–:]\s*[^\n:]+/gi) || [];
            console.log('[IssuesMatrix] Found issue matches in agent response:', issueMatches);
            
            // Process each selected issue ID
            selectedIssueIds.forEach((id: string) => {
              // Try to find a title for this issue ID in the agent response
              let title = extractIssueTitleFromResponse(agentResponse, id);
              
              // If no title found, use fallback
              if (!title || title === `Issue ${id}`) {
                title = fallbackIssueTitles[id] || `Issue ${id}`;
              }
              
              // Check if we already have this issue in our matrix
              const existingIssue = issueMatrix.find(issue => issue.id === id);
              if (existingIssue) {
                // Keep existing data but update title if we found a better one
                newIssueMatrix.push({
                  ...existingIssue,
                  title: title || existingIssue.title
                });
              } else {
                // Create new issue entry
                newIssueMatrix.push({
                  id,
                  title,
                  stance: undefined,
                  reason: undefined,
                  isPriority: false
                });
              }
            });
            
            console.log('[IssuesMatrix] Issues extracted for matrix:', newIssueMatrix);
            setIssueMatrix(newIssueMatrix);
          } else {
            // If no agent response but we have selectedIssues, create placeholders
            console.log('[IssuesMatrix] No agent response but have selectedIssues, creating placeholders');
            const selectedIssueIds = currentMetadata.selectedIssues as string[];
            const placeholderMatrix = selectedIssueIds.map(id => ({
              id,
              title: `Issue ${id}`,
              stance: undefined,
              reason: undefined,
              isPriority: false
            }));
            setIssueMatrix(placeholderMatrix);
          }
        }
        break;
        
      case 2: // User has provided a stance on an issue
        if (currentMetadata.selectedIssues?.length > 0) {
          // Enhanced stance extraction - handle both traditional format and "approach" format
          // Handle standard SUPPORT/OPPOSE/DEPENDS format
          const traditionalStanceRegex = /\b(SUPPORT|OPPOSE|DEPENDS)\b/i;
          // Handle Approach A/B/C format
          const approachStanceRegex = /\b(APPROACH\s+[A-C]|[A-C])\b/i;
          
          const traditionalMatch = userMessage.match(traditionalStanceRegex);
          const approachMatch = userMessage.match(approachStanceRegex);
          
          let stance: string | undefined;
          
          if (traditionalMatch) {
            stance = traditionalMatch[0].toUpperCase();
            console.log('[IssuesMatrix] Extracted traditional stance:', stance);
          } else if (approachMatch) {
            stance = approachMatch[0].toUpperCase();
            console.log('[IssuesMatrix] Extracted approach stance:', stance);
          }
          
          // Get reason (everything after the stance with better cleanup)
          let reason = '';
          if (stance && userMessage.indexOf(stance) !== -1) {
            reason = userMessage.substring(userMessage.indexOf(stance) + stance.length).trim();
            // Clean up the reason by removing punctuation at the beginning
            reason = reason.replace(/^[,.:;-]\s*/, '');
          } else if (userMessage.trim()) {
            // If no stance word found, try to infer from context with enhanced approach detection
            if (userMessage.toLowerCase().includes('support') ||
                userMessage.toLowerCase().includes('agree') ||
                userMessage.toLowerCase().includes('yes') ||
                userMessage.toLowerCase().includes('approach a') ||
                userMessage.toLowerCase().includes('for it')) {
              reason = userMessage.trim();
              stance = 'SUPPORT';
            } else if (userMessage.toLowerCase().includes('oppose') ||
                      userMessage.toLowerCase().includes('disagree') ||
                      userMessage.toLowerCase().includes('no') ||
                      userMessage.toLowerCase().includes('approach b') ||
                      userMessage.toLowerCase().includes('against')) {
              reason = userMessage.trim();
              stance = 'OPPOSE';
            } else if (userMessage.toLowerCase().includes('depends') ||
                      userMessage.toLowerCase().includes('conditional') ||
                      userMessage.toLowerCase().includes('sometimes') ||
                      userMessage.toLowerCase().includes('approach c') ||
                      userMessage.toLowerCase().includes('maybe')) {
              reason = userMessage.trim();
              stance = 'DEPENDS';
            } else {
              // If still can't determine stance, use whole message as reason
              reason = userMessage.trim();
            }
          }
          
          console.log('[IssuesMatrix] Final extracted stance:', stance, 'with reason:', reason?.substring(0, 50));
          
          // Find which issue is being discussed
          let currentIssueId: string | undefined;
          
          // Check if agent's response mentions a specific issue
          if (agentResponse) {
            const issueNumberMatch = agentResponse.match(/Issue\s*(\d+)/i);
            if (issueNumberMatch && issueNumberMatch[1]) {
              currentIssueId = issueNumberMatch[1];
            }
          }
          
          // Fallback: Get from metadata
          if (!currentIssueId) {
            currentIssueId = currentMetadata.issueQueue?.[0] ||
                           (currentMetadata.issueQueue && currentMetadata.issueQueue.length > 0
                            ? currentMetadata.issueQueue[0]
                            : currentMetadata.selectedIssues[0]);
          }
          
          if (currentIssueId) {
            console.log(`[IssuesMatrix] Updating issue #${currentIssueId} with stance: ${stance}, reason: ${reason}`);
            // Update the issue with the stance and reason
            setIssueMatrix(prevMatrix => {
              // Make a deep copy of the previous matrix
              const updatedMatrix = JSON.parse(JSON.stringify(prevMatrix));
              
              // Find the issue to update
              const issueIndex = updatedMatrix.findIndex((issue: Issue) => issue.id === currentIssueId);
              
              if (issueIndex >= 0) {
                // Update existing issue
                updatedMatrix[issueIndex] = {
                  ...updatedMatrix[issueIndex],
                  stance: stance || updatedMatrix[issueIndex].stance,
                  reason: reason || updatedMatrix[issueIndex].reason
                };
                console.log('[IssuesMatrix] Updated existing issue:', updatedMatrix[issueIndex]);
              } else {
                // Issue might be missing - create it
                console.log('[IssuesMatrix] Issue not found in matrix, creating new entry');
                const fallbackTitle = `Issue ${currentIssueId}`;
                updatedMatrix.push({
                  id: currentIssueId,
                  title: fallbackTitle,
                  stance: stance,
                  reason: reason,
                  isPriority: false
                });
              }
              console.log('[IssuesMatrix] Updated matrix after stance:', updatedMatrix);
              return updatedMatrix;
            });
          }
        }
        break;
        
      case 3: // User has indicated their priority issue
        // Extract the priority issue from the user message with enhanced pattern matching
        if (issueMatrix.length > 0 && userMessage.trim()) {
          // Find which issue the user mentioned as priority
          setIssueMatrix(prevMatrix => {
            // Reset priorities
            const resetPriorities: Issue[] = prevMatrix.map(issue => ({
              ...issue,
              isPriority: false
            }));
            
            // Try to find the issue based on title, number, or key terms
            const lowerMessage = userMessage.toLowerCase();
            let priorityIssue: Issue | undefined;
            
            // First try to match by title or explicit reference
            priorityIssue = resetPriorities.find(issue =>
              lowerMessage.includes(issue.title.toLowerCase()) ||
              lowerMessage.includes(`issue ${issue.id}`) ||
              lowerMessage.includes(`issue #${issue.id}`) ||
              lowerMessage.includes(`issue number ${issue.id}`) ||
              lowerMessage.includes(`#${issue.id}`)
            );
            
            // If no match, try keyword extraction from the message
            if (!priorityIssue) {
              // Extract key phrases that might indicate the issue topic
              const keyPhrases = lowerMessage.split(/\W+/).filter(word => word.length > 3);
              
              // Find issue with highest match count for keywords
              let bestMatchCount = 0;
              let bestIssue: Issue | undefined;
              
              resetPriorities.forEach(issue => {
                const issueText = (issue.title + " " + (issue.reason || "")).toLowerCase();
                let matchCount = 0;
                keyPhrases.forEach(phrase => {
                  if (issueText.includes(phrase)) matchCount++;
                });
                
                if (matchCount > bestMatchCount) {
                  bestMatchCount = matchCount;
                  bestIssue = issue;
                }
              });
              
              // Set the priorityIssue to the best match
              priorityIssue = bestIssue;
              
              console.log('[IssuesMatrix] Keyword matching results:', {
                bestMatchCount,
                bestIssueTitle: bestIssue?.title || 'None'
              });
            }
            
            console.log('[IssuesMatrix] Priority matching results:', {
              userMessage: lowerMessage,
              matchedIssue: priorityIssue?.title || 'No match found'
            });
            
            // If no specific match, use the first issue as a fallback
            if (!priorityIssue && resetPriorities.length > 0) {
              // Find the first issue with a stance as default
              priorityIssue = resetPriorities.find(issue => issue.stance !== undefined);
              
              // If still no match, just use the first issue
              if (!priorityIssue) {
                priorityIssue = resetPriorities[0];
              }
            }
            
            // Mark the priority issue
            if (priorityIssue) {
              const finalMatrix = resetPriorities.map(issue =>
                issue.id === priorityIssue?.id ? {...issue, isPriority: true} : issue
              );
              console.log('[IssuesMatrix] Final matrix with priority issue marked:', finalMatrix);
              return finalMatrix;
            }
            
            return resetPriorities;
          });
        }
        break;

      case 4: // Deal-Breakers - Store any absolute deal-breakers mentioned
        // This step doesn't directly update the issues matrix, but we could
        // add a note to relevant issues if the deal-breaker mentions them
        if (userMessage && userMessage.trim() && userMessage.toLowerCase() !== 'none') {
          console.log('[IssuesMatrix] Processing deal-breakers:', userMessage);
          // We could highlight issues that are mentioned in deal-breakers
          // For now, we'll just keep the existing matrix
        }
        break;
        
      // Steps 5-7 don't update the issue matrix directly
    }
    
    console.log('[IssuesMatrix] Matrix after update for step', currentStep, issueMatrix);
  }, [issueMatrix]);
  console.log('[HookDebug] All hooks defined successfully');

  // Conditional returns must come after all hooks are defined
  console.log('[HookDebug] Starting conditional returns check');
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
                  console.log('[IssuesMatrix] Debug button clicked, trying to create placeholder issues');
                  if (metadata?.selectedIssues?.length > 0) {
                    // Create placeholder issues for debugging
                    const placeholders = (metadata.selectedIssues as string[]).map(id => ({
                      id,
                      title: `Issue ${id}`,
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