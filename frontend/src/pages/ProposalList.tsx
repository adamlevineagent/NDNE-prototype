import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

interface Proposal {
  id: string;
  title: string;
  status: 'open' | 'closed' | 'withdrawn';
  type: 'standard' | 'monetary';
  createdAt: string;
  closeAt: string;
}

const ProposalList: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'withdrawn'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<Proposal[]>('/api/proposals');
        setProposals(response.data);
      } catch (error) {
        console.error('Failed to fetch proposals', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, []);

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  return (
    <div>
      <h1>Proposals</h1>
      <div>
        <label>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>
      {loading ? (
        <p>Loading proposals...</p>
      ) : (
        <ul>
          {filteredProposals.map((proposal) => (
            <li key={proposal.id}>
              <Link to={`/proposal/${proposal.id}`}>
                {proposal.title} [{proposal.status}] [{proposal.type}]
              </Link>
              <div>
                Created: {new Date(proposal.createdAt).toLocaleDateString()} | Closes: {new Date(proposal.closeAt).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/proposal/new">
        <button>Create New Proposal</button>
      </Link>
    </div>
  );
};

export default ProposalList;