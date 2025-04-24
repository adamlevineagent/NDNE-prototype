import React from 'react';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: string;
  amount: number;
  quorum: number;
  threshold: number;
  closeAt: string;
  vetoWindowEnd: string;
  // Add other relevant fields as needed
}

export interface ProposalDraft {
  title: string;
  description: string;
  type: string;
  amount: number;
  quorum: number;
  threshold: number;
  closeAt: string;
  vetoWindowEnd: string;
}

interface ProposalsTabProps {
  proposals: Proposal[];
  currentProposalId: string | null;
  proposalDraft: ProposalDraft | null;
  onSelectProposal: (proposalId: string) => void;
  onCreateProposal: () => void;
  userName: string;
}

const ProposalsTab: React.FC<ProposalsTabProps> = ({
  proposals,
  currentProposalId,
  proposalDraft,
  onSelectProposal,
  onCreateProposal,
  userName,
}) => {
  return (
    <div>
      <h3>Proposals</h3>
      <p>Hello, {userName}. Here are the proposals:</p>
      <button onClick={onCreateProposal}>Create New Proposal</button>
      <ul>
        {proposals.map(proposal => (
          <li key={proposal.id}>
            <h4
              style={{ cursor: 'pointer', fontWeight: proposal.id === currentProposalId ? 'bold' : 'normal' }}
              onClick={() => onSelectProposal(proposal.id)}
            >
              {proposal.title}
            </h4>
            <p>{proposal.description}</p>
            <p>Type: {proposal.type}</p>
            <p>Amount: {proposal.amount}</p>
            <p>Quorum: {proposal.quorum}%</p>
            <p>Threshold: {proposal.threshold}</p>
            <p>Close At: {new Date(proposal.closeAt).toLocaleString()}</p>
            <p>Veto Window Ends: {new Date(proposal.vetoWindowEnd).toLocaleString()}</p>
          </li>
        ))}
      </ul>
      {proposalDraft && (
        <div>
          <h4>New Proposal Draft</h4>
          <p>Title: {proposalDraft.title || '(empty)'}</p>
          <p>Description: {proposalDraft.description || '(empty)'}</p>
          <p>Type: {proposalDraft.type}</p>
          <p>Amount: {proposalDraft.amount}</p>
          <p>Quorum: {proposalDraft.quorum}%</p>
          <p>Threshold: {proposalDraft.threshold}</p>
          <p>Close At: {proposalDraft.closeAt || '(not set)'}</p>
          <p>Veto Window Ends: {proposalDraft.vetoWindowEnd || '(not set)'}</p>
        </div>
      )}
    </div>
  );
};

export default ProposalsTab;