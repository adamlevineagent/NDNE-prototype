import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // We'll create this next
import { ChatContextProvider } from './hooks/useChatContext'
import { DashboardProvider } from './context/DashboardContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardProvider>
      <ChatContextProvider>
        <App />
      </ChatContextProvider>
    </DashboardProvider>
  </React.StrictMode>,
)