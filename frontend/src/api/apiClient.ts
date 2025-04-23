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
      return Promise.reject({
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
        originalError: error,
      });
    }

    // Handle API errors
    const { status, data } = error.response;
    
    let errorMessage = 'An unexpected error occurred';
    
    if (data?.error) {
      errorMessage = data.error;
    } else if (data?.message) {
      errorMessage = data.message;
    }
    
    // Handle auth errors
    if (status === 401) {
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
  register: (data: { email: string; password: string }) => 
    apiClient.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) => 
    apiClient.post('/auth/login', data),
  
  getUser: () =>
    apiClient.get('/auth/me'),
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

export default apiClient;