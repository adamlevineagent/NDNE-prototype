import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatInterface from './chat/ChatInterface';
import './OnboardingChat.css';

/**
 * OnboardingProgress component to show the current progress of the onboarding process
 */
interface OnboardingProgressProps {
  stage: 'initial' | 'preferences' | 'priorities' | 'confirmation';
  progress: number; // 0-100
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ stage, progress }) => {
  const stageLabels = {
    initial: 'Getting Started',
    preferences: 'Preferences',
    priorities: 'Priorities',
    confirmation: 'Confirmation'
  };

  return (
    <div className="onboarding-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="stage-label">
        {stageLabels[stage]} ({Math.round(progress)}%)
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
  const [stage, setStage] = useState<'initial' | 'preferences' | 'priorities' | 'confirmation'>('initial');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get or create agent when component mounts
  useEffect(() => {
    const getOrCreateAgent = async () => {
      try {
        setLoading(true);
        
        // Try to get existing agent
        const response = await fetch('/api/agents/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setAgentId(data.id);
          
          // If agent already has onboardingCompleted, redirect to dashboard
          if (data.onboardingCompleted) {
            navigate('/dashboard');
            return;
          }
          
          // Estimate progress based on existing data
          const preferences = data.preferences || {};
          const preferenceCount = Object.keys(preferences).length;
          
          if (preferenceCount > 5) {
            setStage('confirmation');
            setProgress(90);
          } else if (preferenceCount > 2) {
            setStage('priorities');
            setProgress(50);
          } else if (preferenceCount > 0) {
            setStage('preferences');
            setProgress(20);
          } else {
            setStage('initial');
            setProgress(5);
          }
        } else if (response.status === 404) {
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
            setStage('initial');
            setProgress(0);
          } else {
            throw new Error('Failed to create agent');
          }
        } else {
          throw new Error('Failed to fetch agent');
        }
      } catch (err: any) {
        console.error('Error in onboarding setup:', err);
        setError('Failed to initialize onboarding. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      getOrCreateAgent();
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
        <h2>Welcome to NDNE</h2>
        <p>Let's set up your personal agent to represent your interests.</p>
      </div>
      
      <OnboardingProgress stage={stage} progress={progress} />
      
      {agentId && (
        <div className="chat-wrapper">
          <ChatInterface 
            agentId={agentId}
            isOnboarding={true}
            onComplete={handleOnboardingComplete}
          />
        </div>
      )}
      
      <div className="onboarding-footer">
        <p>
          Your agent will learn from this conversation to better represent your interests.
          Feel free to ask questions about how the system works.
        </p>
      </div>
    </div>
  );
};

export default OnboardingChat;