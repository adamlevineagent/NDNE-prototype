import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

const NewProposalForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'standard' | 'monetary'>('standard');
  const [amount, setAmount] = useState<number | ''>('');
  const [quorum, setQuorum] = useState<number>(50);
  const [threshold, setThreshold] = useState<number>(0.5);
  const [closeAt, setCloseAt] = useState<string>('');
  const [vetoWindowEnd, setVetoWindowEnd] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    if (type === 'monetary' && (amount === '' || amount <= 0)) {
      setError('Amount must be a positive number for monetary proposals.');
      return;
    }
    if (!closeAt || !vetoWindowEnd) {
      setError('Close date and veto window end date are required.');
      return;
    }

    try {
      await apiClient.post('/api/proposals', {
        title,
        description,
        type,
        amount: type === 'monetary' ? amount : undefined,
        quorum,
        threshold,
        closeAt,
        vetoWindowEnd,
      });
      navigate('/proposals');
    } catch (err) {
      setError('Failed to create proposal.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Proposal</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>Title:</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label>Description:</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div>
        <label>Type:</label>
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="standard">Standard</option>
          <option value="monetary">Monetary</option>
        </select>
      </div>
      {type === 'monetary' && (
        <div>
          <label>Amount:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            min="0"
            step="0.01"
            required={type === 'monetary'}
          />
        </div>
      )}
      <div>
        <label>Quorum (%):</label>
        <input
          type="number"
          value={quorum}
          onChange={(e) => setQuorum(Number(e.target.value))}
          min="10"
          max="100"
          required
        />
      </div>
      <div>
        <label>Threshold (0-1):</label>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          min="0"
          max="1"
          step="0.01"
          required
        />
      </div>
      <div>
        <label>Close At (ISO datetime):</label>
        <input
          type="datetime-local"
          value={closeAt}
          onChange={(e) => setCloseAt(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Veto Window End (ISO datetime):</label>
        <input
          type="datetime-local"
          value={vetoWindowEnd}
          onChange={(e) => setVetoWindowEnd(e.target.value)}
          required
        />
      </div>
      <button type="submit">Create Proposal</button>
    </form>
  );
};

export default NewProposalForm;