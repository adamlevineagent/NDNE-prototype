import React, { useState } from 'react';

export interface Activity {
  id: string;
  type: string;
  issueId?: string;
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
  // Add other relevant fields as needed
}

interface ActivityAuditTabProps {
  filter: { type?: string; issueId?: string; dateRange?: [Date, Date] };
  activities: Activity[];
  onFilterChange: (filter: { type?: string; issueId?: string; dateRange?: [Date, Date] }) => void;
  onRespond: (activityId: string) => void;
  userName: string;
}

const ActivityAuditTab: React.FC<ActivityAuditTabProps> = ({
  filter,
  activities,
  onFilterChange,
  onRespond,
  userName,
}) => {
  const [localFilter, setLocalFilter] = useState(filter);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = { ...localFilter, type: e.target.value || undefined };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleIssueIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilter = { ...localFilter, issueId: e.target.value || undefined };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  return (
    <div>
      <h3>Activity Audit</h3>
      <p>Hello, {userName}. Filter activities:</p>
      <label>
        Type:
        <select value={localFilter.type || ''} onChange={handleTypeChange}>
          <option value="">All</option>
          <option value="vote">Vote</option>
          <option value="comment">Comment</option>
          <option value="proposal">Proposal</option>
          {/* Add other types as needed */}
        </select>
      </label>
      <label>
        Issue ID:
        <input type="text" value={localFilter.issueId || ''} onChange={handleIssueIdChange} placeholder="Filter by issue ID" />
      </label>
      <ul>
        {activities.map(activity => (
          <li key={activity.id}>
            <p><strong>{activity.type}</strong> by {activity.userName} at {new Date(activity.timestamp).toLocaleString()}</p>
            <p>{activity.description}</p>
            <button onClick={() => onRespond(activity.id)}>Respond</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityAuditTab;