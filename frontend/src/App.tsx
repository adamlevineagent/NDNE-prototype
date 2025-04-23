import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import OnboardingChat from './components/OnboardingChat';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProposalList from './pages/ProposalList';
import ProposalDetail from './pages/ProposalDetail';
import NegotiationList from './components/NegotiationList';
import { agents } from './api/apiClient';
import NewProposalForm from './components/NewProposalForm';
import FeedbackModal from './components/FeedbackModal';

// Temporary placeholders for missing pages
const SettingsPage = () => <div>Settings Placeholder</div>;
const AdminPanel = () => <div>Admin Panel Placeholder</div>;

// AppRoutes component to use auth context
const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [agentId, setAgentId] = React.useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      agents.getAgent()
        .then(res => setAgentId(res.data.id))
        .catch(() => setAgentId(null));
    }
  }, [isAuthenticated]);

  // Show loading indicator while checking auth
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <>
      <nav>
        <ul>
          {isAuthenticated ? (
            <>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/proposals">Proposals</Link></li>
              <li><Link to="/negotiations">Negotiations</Link></li>
              <li><Link to="/settings">Settings</Link></li>
              {/* Admin link could be conditionally shown based on user role */}
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </nav>
      <hr />
      <main>
        <Routes>
          {/* Redirect root to login or dashboard based on auth */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route path="/onboarding" element={isAuthenticated ? <OnboardingChat /> : <Navigate to="/login" />} />
          {/* Protected Routes */}
          <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/proposals" element={isAuthenticated ? <ProposalList /> : <Navigate to="/login" />} />
          <Route path="/proposal/:id" element={isAuthenticated ? <ProposalDetail /> : <Navigate to="/login" />} />
          <Route path="/proposal/new" element={isAuthenticated ? <NewProposalForm /> : <Navigate to="/login" />} />
          <Route path="/negotiations" element={isAuthenticated && agentId ? <NegotiationList agentId={agentId} /> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={isAuthenticated ? <AdminPanel /> : <Navigate to="/login" />} />
          {/* Add a 404 or catch-all route */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
      <hr />
      <footer>
        <small>
          <a href="/tos" target="_blank" rel="noopener noreferrer">Terms of Service</a> |{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> |{' '}
          <button
            style={{ background: "none", border: "none", color: "blue", textDecoration: "underline", cursor: "pointer", padding: 0 }}
            onClick={() => setFeedbackOpen(true)}
            aria-label="Open Feedback Form"
          >
            Feedback
          </button>
        </small>
      </footer>
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;