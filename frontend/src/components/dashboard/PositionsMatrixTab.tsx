import React, { useState } from 'react';
import IssuesMatrix, { Issue } from '../IssuesMatrix';

interface PositionsMatrixTabProps {
  issues: Issue[];
  welcomeMessage: string;
  agentColor: string;
}

/**
 * Tab component for the Positions Matrix view in the dashboard
 * This is an enhanced version of the IssuesMatrix component with filtering capabilities
 */
const PositionsMatrixTab: React.FC<PositionsMatrixTabProps> = ({
  issues,
  welcomeMessage,
  agentColor
}) => {
  // State for filter controls
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'priority'>('priority');
  
  // Filter issues based on current settings
  const filteredIssues = issues.filter(issue => {
    // If "Show All" is disabled, only show issues with a stance
    if (!showAllIssues && !issue.stance) {
      return false;
    }
    return true;
  });
  
  // Sort issues based on current settings
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'priority') {
      // Priority issues first, then alphabetically
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return a.title.localeCompare(b.title);
    } else {
      // We would use timestamp for recent sorting, but we're using title for this demo
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <div className="positions-matrix-tab">
      <header className="tab-header">
        <h2>{welcomeMessage} here are your positions</h2>
        <p className="tab-description">
          This is where your positions on important issues live. 
          You can filter, sort, and discuss any issue with your agent.
        </p>
      </header>
      
      <div className="matrix-controls">
        <div className="control-filters">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={showAllIssues} 
              onChange={() => setShowAllIssues(!showAllIssues)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Show all issues</span>
          </label>
        </div>
        
        <div className="control-sort">
          <label htmlFor="sort-select">Sort by:</label>
          <select 
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'priority')}
          >
            <option value="priority">Priority</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      </div>
      
      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          <p>
            {showAllIssues 
              ? "No issues found. You haven't taken positions on any issues yet." 
              : "No issues with positions found. Toggle 'Show all issues' to see all available issues."}
          </p>
          <button 
            className="action-button"
            style={{ backgroundColor: agentColor }}
            onClick={() => setShowAllIssues(true)}
          >
            Explore Available Issues
          </button>
        </div>
      ) : (
        <div className="issues-matrix-wrapper">
          <IssuesMatrix 
            selectedIssues={sortedIssues}
            step={7} // Use step 7 for dashboard view
            agentColor={agentColor}
          />
        </div>
      )}

      <div className="issue-actions">
        <button 
          className="action-button"
          style={{ backgroundColor: agentColor }}
          onClick={() => console.log("Discuss new issue")}
        >
          Discuss a New Issue
        </button>
      </div>
      
      <style>{`
        .positions-matrix-tab {
          padding: 1rem 0;
        }
        
        .tab-header {
          margin-bottom: 1.5rem;
        }
        
        .tab-header h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #2d3748;
        }
        
        .tab-description {
          color: #4a5568;
          line-height: 1.5;
        }
        
        .matrix-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 0.75rem 1rem;
          background-color: #f7fafc;
          border-radius: 8px;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          background-color: #cbd5e0;
          border-radius: 20px;
          margin-right: 10px;
          transition: 0.3s;
        }
        
        .toggle-slider:before {
          content: "";
          position: absolute;
          height: 16px;
          width: 16px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        
        input:checked + .toggle-slider {
          background-color: #4299e1;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(16px);
        }
        
        .toggle-label {
          font-size: 0.9rem;
          color: #4a5568;
        }
        
        .control-sort select {
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background-color: white;
          font-size: 0.9rem;
          margin-left: 8px;
        }
        
        .issues-matrix-wrapper {
          margin-bottom: 2rem;
        }
        
        .issue-actions {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }
        
        .action-button {
          padding: 0.75rem 1.25rem;
          border-radius: 6px;
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .action-button:hover {
          opacity: 0.9;
        }
        
        .empty-state {
          background-color: #f7fafc;
          border: 1px dashed #cbd5e0;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          color: #4a5568;
        }
        
        .empty-state p {
          margin-bottom: 1.5rem;
        }
        
        @media (max-width: 640px) {
          .matrix-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .control-sort {
            width: 100%;
            display: flex;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default PositionsMatrixTab;