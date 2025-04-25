import axios from 'axios';

// Create API client with base URL
const apiClient = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      });
      return Promise.reject({
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
        originalError: error,
      });
    }

    // Handle API errors
    const { status, data } = error.response;
    
    console.error('API Error Response:', {
      status,
      data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    let errorMessage = 'An unexpected error occurred';
    
    if (data?.error) {
      errorMessage = data.error;
    } else if (data?.message) {
      errorMessage = data.message;
    }
    
    // Handle auth errors
    if (status === 401) {
      console.log('Authentication error detected, clearing token');
      // Clear token if unauthorized
      localStorage.removeItem('token');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject({
      status: 'error',
      message: errorMessage,
      code: status,
      originalError: error,
    });
  }
);

// API endpoints
export const auth = {
  register: (data: { email: string; password: string }) => {
    console.log('[DEBUG-API-FIX] Sending registration request:', { email: data.email });
    return apiClient.post('/auth/register', data)
      .then(response => {
        console.log('[DEBUG-API-FIX] Registration successful:', response.data ? {
          tokenReceived: !!response.data.token,
          tokenLength: response.data.token ? response.data.token.length : 0,
          tokenStart: response.data.token ? `${response.data.token.substring(0, 15)}...` : 'null'
        } : 'No data');
        return response;
      })
      .catch(error => {
        console.error('[DEBUG-API-FIX] Registration failed:', error);
        // Log more detailed error information
        if (error.originalError?.response) {
          console.error('[DEBUG-API-FIX] Server response:', {
            status: error.originalError.response.status,
            data: error.originalError.response.data
          });
        } else {
          console.error('[DEBUG-API-FIX] Error details:', JSON.stringify(error));
        }
        throw error;
      });
  },
  
  login: (data: { email: string; password: string }) => {
    console.log('[DEBUG-API-FIX] Sending login request:', { email: data.email });
    return apiClient.post('/auth/login', data)
      .then(response => {
        console.log('[DEBUG-API-FIX] Login successful, token received:', !!response.data.token);
        return response;
      })
      .catch(error => {
        console.error('[DEBUG-API-FIX] Login failed:', error);
        if (error.originalError?.response) {
          console.error('[DEBUG-API-FIX] Server response:', {
            status: error.originalError.response.status,
            data: error.originalError.response.data
          });
        }
        throw error;
      });
  },
  
  getUser: () => {
    const token = localStorage.getItem('token');
    console.log('[DEBUG-API-FIX] Fetching user data with token:', token ? `${token.substring(0, 15)}...` : 'none');
    return apiClient.get('/auth/me')
      .then(response => {
        console.log('[DEBUG-API-FIX] User data retrieved successfully:', response.data ? {
          id: response.data.id,
          email: response.data.email,
          agentExists: !!response.data.agent
        } : 'No data');
        return response;
      })
      .catch(error => {
        console.error('[DEBUG-API-FIX] Failed to fetch user data:', error);
        if (error.originalError?.response) {
          console.error('[DEBUG-API-FIX] Server response:', {
            status: error.originalError.response.status,
            data: error.originalError.response.data
          });
        }
        throw error;
      });
  },
};

export const agents = {
  getAgent: () =>
    apiClient.get('/agents/me'),
  
  updatePreferences: (preferences: any) =>
    apiClient.put('/agents/me/preferences', { preferences }),
  
  pauseAgent: (until: Date) =>
    apiClient.post(`/agents/me/pause`, { until: until.toISOString() }),
  
  feedback: (agentId: string, data: { voteId?: string; commentId?: string; reason: string }) =>
    apiClient.post(`/agents/${agentId}/feedback`, data)
};

// Comments API already defined above

export const proposals = {
  getAll: () =>
    apiClient.get('/proposals'),
  
  getById: (id: string) =>
    apiClient.get(`/proposals/${id}`),
  
  create: (data: any) =>
    apiClient.post('/proposals', data),
  
  vote: (proposalId: string, data: { value: string; confidence: number }) =>
    apiClient.post(`/proposals/${proposalId}/vote`, data),
  
  withdraw: (proposalId: string) =>
    apiClient.post(`/proposals/${proposalId}/withdraw`),
};

export const comments = {
  create: (data: { proposalId: string; content: string }) =>
    apiClient.post('/comments', data),
};

export const onboarding = {
  saveStep: (step: number, data: any) => 
    apiClient.post(`/onboarding/steps/${step}`, data),
};

export const chat = {
  sendMessage: (data: { agentId: string; content: string; metadata?: any }) =>
    apiClient.post('/chat/messages', data),
  
  getMessages: (agentId: string, params?: { limit?: number; before?: string; onboarding?: boolean }) =>
    apiClient.get('/chat/messages', { params: { agentId, ...params } }),
  
  getMessage: (id: string) =>
    apiClient.get(`/chat/messages/${id}`),
  
  deleteMessage: (id: string) =>
    apiClient.delete(`/chat/messages/${id}`),
};

export const negotiations = {
  // Get all negotiation sessions
  getAll: () => apiClient.get('/negotiations'),

  // Get a single negotiation session
  getById: (id: string) => apiClient.get(`/negotiations/${id}`),

  // Create a new negotiation session
  create: (data: { topic: string; description?: string; initiatorId: string }) =>
    apiClient.post('/negotiations', data),

  // Get all messages for a negotiation (with reactions)
  getMessages: (negotiationId: string) =>
    apiClient.get(`/negotiations/${negotiationId}/messages`),

  // Post a new message to a negotiation
  postMessage: (
    negotiationId: string,
    data: {
      agentId: string;
      content: string;
      messageType?: string;
      referencedMessageId?: string;
      metadata?: any;
    }
  ) => apiClient.post(`/negotiations/${negotiationId}/messages`, data),

  // Add a reaction to a message
  addReaction: (
    negotiationId: string,
    messageId: string,
    data: { agentId: string; reactionType: string }
  ) =>
    apiClient.post(
      `/negotiations/${negotiationId}/messages/${messageId}/reactions`,
      data
    ),

  // Remove a reaction from a message
  removeReaction: (
    negotiationId: string,
    messageId: string,
    data: { agentId: string; reactionType: string }
  ) =>
    apiClient.delete(
      `/negotiations/${negotiationId}/messages/${messageId}/reactions`,
      { data }
    ),
};

export default apiClient;