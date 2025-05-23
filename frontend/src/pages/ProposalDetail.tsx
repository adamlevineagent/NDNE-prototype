import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';

interface Vote {
  id: string;
  value: 'yes' | 'no' | 'abstain';
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  agentName?: string;
}

interface ProposalDetail {
  id: string;
  title: string;
  description: string;
  type: 'standard' | 'monetary';
  amount?: number;
  status: 'open' | 'closed' | 'withdrawn';
  createdAt: string;
  closeAt: string;
  votes: Vote[];
  comments: Comment[];
}

const ProposalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProposal = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<ProposalDetail>(`/api/proposals/${id}`);
        setProposal(response.data);
      } catch (error) {
        console.error('Failed to fetch proposal', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProposal();
    }
  }, [id]);

  if (loading) {
    return <p>Loading proposal...</p>;
  }

  if (!proposal) {
    return <p>Proposal not found.</p>;
  }

  return (
    <div>
      <h1>{proposal.title}</h1>
      <p>Status: {proposal.status}</p>
      <p>Type: {proposal.type}</p>
      {proposal.type === 'monetary' && proposal.amount !== undefined && (
        <p>Amount: {proposal.amount}</p>
      )}
      <p>Created At: {new Date(proposal.createdAt).toLocaleString()}</p>
      <p>Closes At: {new Date(proposal.closeAt).toLocaleString()}</p>
      <h2>Description</h2>
      <p>{proposal.description}</p>
      <h2>Votes</h2>
      <ul>
        {proposal.votes.map((vote) => (
          <li key={vote.id}>
            {vote.value.toUpperCase()} at {new Date(vote.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
      <h2>Comments</h2>
      <ul>
        {proposal.comments.map((comment) => (
          <li key={comment.id}>
            {comment.agentName ? `${comment.agentName}: ` : ''}
            {comment.content} ({new Date(comment.createdAt).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProposalDetail;