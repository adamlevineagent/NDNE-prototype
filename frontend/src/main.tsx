import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // We'll create this next
import { ChatContextProvider } from './hooks/useChatContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChatContextProvider>
      <App />
    </ChatContextProvider>
  </React.StrictMode>,
)