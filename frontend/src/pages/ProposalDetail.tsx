import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './ProposalDetail.css';
import apiClient, { agents } from '../api/apiClient';
import NegotiationThread from '../components/NegotiationThread';
import NegotiationFeedback from '../components/NegotiationFeedback';
import NegotiationHistory from '../components/NegotiationHistory';

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
  negotiationId?: string;
  isNegotiated: boolean;
  negotiationSummary?: string;
}

const ProposalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [agentId, setAgentId] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await agents.getAgent();
        setAgentId(res.data.id);
      } catch (err) {
        setAgentId(null);
      }
    };
    fetchAgent();
  }, []);

  if (loading) {
    return <p>Loading proposal...</p>;
  }

  if (!proposal) {
    return <p>Proposal not found.</p>;
  }

  return (
    <div className="proposal-detail">
      <h1>{proposal.title}</h1>
      
      <div className="proposal-meta">
        <p><strong>Status:</strong> {proposal.status}</p>
        <p><strong>Type:</strong> {proposal.type}</p>
        {proposal.type === 'monetary' && proposal.amount !== undefined && (
          <p><strong>Amount:</strong> ${proposal.amount.toLocaleString()}</p>
        )}
        <p><strong>Created:</strong> {new Date(proposal.createdAt).toLocaleString()}</p>
        <p><strong>Closes:</strong> {new Date(proposal.closeAt).toLocaleString()}</p>
      </div>

      <h2>Description</h2>
      <div className="proposal-description">
        {proposal.description.split('\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      
      {/* Negotiation Summary (if proposal came from negotiation) */}
      {proposal.isNegotiated && proposal.negotiationSummary && (
        <div className="negotiation-summary">
          <h2>Negotiation Summary</h2>
          <div className="summary-content">
            <p>{proposal.negotiationSummary}</p>
          </div>
        </div>
      )}

      <h2>Votes</h2>
      <ul className="votes-list">
        {proposal.votes.map((vote) => (
          <li key={vote.id}>
            {vote.value.toUpperCase()} at {new Date(vote.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>

      <h2>Comments</h2>
      <ul className="comments-list">
        {proposal.comments.map((comment) => (
          <li key={comment.id}>
            {comment.agentName ? `${comment.agentName}: ` : ''}
            {comment.content} ({new Date(comment.createdAt).toLocaleString()})
          </li>
        ))}
      </ul>

      {/* Negotiation Details Section */}
      {proposal.negotiationId && (
        <div className="negotiation-section">
          <h2>Negotiation Details</h2>
          
          {/* Negotiation History Component */}
          <NegotiationHistory negotiationId={proposal.negotiationId} />
          
          {/* Live Negotiation Thread */}
          {agentId && (
            <div className="live-negotiation">
              <h3>Participate in Negotiation</h3>
              <NegotiationThread negotiationId={proposal.negotiationId} agentId={agentId} />
            </div>
          )}
          
          {/* Feedback Component */}
          {agentId && proposal.isNegotiated && (
            <div className="negotiation-feedback-container">
              <NegotiationFeedback
                negotiationId={proposal.negotiationId}
                agentId={agentId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProposalDetail;