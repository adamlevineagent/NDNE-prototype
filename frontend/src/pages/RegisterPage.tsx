import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/apiClient';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await auth.register({
        email: formData.email,
        password: formData.password,
      });

      // Flag that this is a new registration
      localStorage.setItem('just_registered', 'true');
      
      // Get the token and validate it
      const token = response.data.token;
      if (!token) {
        console.error('[DEBUG-CRITICAL] Registration returned success but no token was received');
        setError('Registration completed but authentication failed. Please try logging in.');
        return;
      }
      
      // Log registration success with token details
      console.log('[DEBUG-CRITICAL] Registration successful, token info:', {
        tokenPrefix: token.substring(0, 15) + '...',
        tokenLength: token.length
      });
      
      // Use the login function from context and handle errors
      try {
        console.log('[DEBUG-CRITICAL] Calling login with token...');
        login(token);
        
        // Add a longer delay to ensure login processing & token validation completes
        console.log('[DEBUG-CRITICAL] Will navigate to onboarding in 1000ms...');
        setTimeout(() => {
          // Double check token is still in localStorage before navigating
          const storedToken = localStorage.getItem('token');
          if (!storedToken) {
            console.error('[DEBUG-CRITICAL] Token missing from localStorage before navigation');
            setError('Authentication issue occurred. Please try logging in manually.');
            return;
          }
          
          console.log('[DEBUG-CRITICAL] Token verified, navigating to /onboarding now');
          // New users should be directed to onboarding
          navigate('/onboarding');
          
          // As a fallback, if navigation fails, force a hard redirect
          setTimeout(() => {
            console.log('[DEBUG-CRITICAL] Fallback navigation check triggered');
            if (window.location.pathname !== '/onboarding') {
              console.log('[DEBUG-CRITICAL] Forcing hard navigation to /onboarding');
              window.location.href = '/onboarding';
            }
          }, 500);
        }, 1000);
      } catch (loginErr) {
        console.error('[DEBUG-CRITICAL] Error during login process:', loginErr);
        setError('Failed to complete authentication. Please try logging in manually.');
      }
    } catch (err: any) {
      console.error('[DEBUG-REG-FIX] Registration error:', err);
      console.error('[DEBUG-REG-FIX] Error details:', JSON.stringify(err));
      setError(err.message || 'Failed to register. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h1>Create Account</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={8}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
      
      <div className="login-link">
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
};

export default RegisterPage;