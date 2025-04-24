import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the various context types for different tabs
type PositionsContextType = {
  issues: any[];
};

type ActivityContextType = {
  recentActions: any[];
};

type ProposalsContextType = {
  // Proposal-specific context data
};

// Union type for different tab contexts
type ChatContextType = {
  type: 'positions' | 'activity' | 'proposals' | null;
  data: PositionsContextType | ActivityContextType | ProposalsContextType | null;
};

// Create the initial context state
const initialContext: ChatContextType = {
  type: null,
  data: null
};

// Create context
const ChatContext = createContext<{
  chatContext: ChatContextType;
  setChatContext: React.Dispatch<React.SetStateAction<ChatContextType>>;
}>({
  chatContext: initialContext,
  setChatContext: () => {}
});

// Create provider component
export const ChatContextProvider = ({ children }: { children: ReactNode }) => {
  const [chatContext, setChatContext] = useState<ChatContextType>(initialContext);

  return (
    <ChatContext.Provider value={{ chatContext, setChatContext }}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook for using the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatContextProvider');
  }
  return context;
};