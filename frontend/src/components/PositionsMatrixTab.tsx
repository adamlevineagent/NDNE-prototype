import React from 'react';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status?: 'open' | 'closed' | 'in-progress';
  createdAt?: string;
  updatedAt?: string;
  stance?: string;
  reason?: string;
  isPriority?: boolean;
  // Add other relevant fields as needed
}

interface PositionsMatrixTabProps {
  filter: 'positionsOnly' | 'all';
  issues: Issue[];
  onToggleFilter: () => void;
  onDiscuss: (issueId: string) => void;
  userName: string;
}

const PositionsMatrixTab: React.FC<PositionsMatrixTabProps> = ({
  filter,
  issues,
  onToggleFilter,
  onDiscuss,
  userName,
}) => {
  return (
    <div>
      <h3>Positions Matrix</h3>
      <p>Hello, {userName}. Current filter: {filter}</p>
      <button onClick={onToggleFilter}>
        Toggle Filter (Currently: {filter})
      </button>
      <ul>
        {issues.map(issue => (
          <li key={issue.id}>
            <h4>{issue.title}</h4>
            <p>{issue.description}</p>
            <p>Status: {issue.status}</p>
            <button onClick={() => onDiscuss(issue.id)}>Discuss</button>
          </li>
        ))}
      </ul>
    </div>
  );
}


export default PositionsMatrixTab;