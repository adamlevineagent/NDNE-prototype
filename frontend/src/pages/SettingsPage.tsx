import React, { useState, useEffect } from 'react';
import { auth, agents, onboarding } from '../api/apiClient';

const SettingsPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentColor, setAgentColor] = useState('#000000');
  const [digestFrequency, setDigestFrequency] = useState(24);
  const [digestTone, setDigestTone] = useState('neutral');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const userRes = await auth.getUser();
        const agentRes = await agents.getAgent();
        setEmail(userRes.data.email);
        setDigestFrequency(userRes.data.digestFrequency || 24);
        setDigestTone(userRes.data.digestTone || 'neutral');
        setAgentName(agentRes.data.name || '');
        setAgentColor(agentRes.data.color || '#000000');
      } catch (err) {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      await agents.updatePreferences({
        name: agentName,
        color: agentColor,
        preferences: {}, // Extend as needed
      });
      await onboarding.saveStep(3, {
        digestFrequency,
        digestTone,
      });
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError('Failed to save settings.');
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div>
      <h1>Settings</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <section>
        <h2>Profile Settings</h2>
        <label>Email (read-only):</label>
        <input type="email" value={email} readOnly />
      </section>

      <section>
        <h2>Agent Settings</h2>
        <label>Name:</label>
        <input value={agentName} onChange={e => setAgentName(e.target.value)} />
        <label>Color:</label>
        <input type="color" value={agentColor} onChange={e => setAgentColor(e.target.value)} />
      </section>

      <section>
        <h2>Notification Settings</h2>
        <label>Digest Frequency (hours):</label>
        <input
          type="number"
          value={digestFrequency}
          onChange={e => setDigestFrequency(Number(e.target.value))}
          min={1}
          max={168}
        />
        <label>Digest Tone:</label>
        <select value={digestTone} onChange={e => setDigestTone(e.target.value)}>
          <option value="neutral">Neutral</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
      </section>

      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
};

export default SettingsPage;