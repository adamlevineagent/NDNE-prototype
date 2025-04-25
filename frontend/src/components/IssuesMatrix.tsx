import React, { useMemo } from 'react';
import './IssuesMatrix.css';

export interface Issue {
  id: string;
  title: string;
  description: string;
  stance?: string | null;
  reason?: string | string[];
  summary?: string | null;
  isPriority?: boolean;
}

interface IssuesMatrixProps {
  selectedIssues: Issue[];
  step: number;
  agentColor?: string;
  onDiscussIssue?: (issueId: string, title: string) => void;
}

/**
 * Component that displays a visual matrix of user's selected issues and their positions
 * Updates dynamically during the onboarding steps 1-4
 */
const IssuesMatrix: React.FC<IssuesMatrixProps> = ({
  selectedIssues,
  step,
  agentColor = '#4299E1',
  onDiscussIssue
}) => {
  const isVisible = useMemo(() => {
    // Show after step 1 even if no issues are selected yet
    return step >= 1;
  }, [step]);

  // Determine appropriate heading based on the current step
  const getHeading = () => {
    if (step === 1) return "Selected Issues";
    if (step === 2) return "Your Stances on Issues";
    if (step >= 3) return "Your Positions Matrix";
    return "Positions Matrix";
  };

  if (!isVisible) return null;

  return (
    <div className="issues-matrix" data-step={step}>
      <h3 className="issues-matrix-heading">{getHeading()}</h3>
      <div className="issues-matrix-content">
        {selectedIssues.length === 0 ? (
          <div className="issues-matrix-empty-state">
            <p className="issues-matrix-empty">
              {step === 1 ? "Select issues you care about to build your perspective matrix." :
               "No issues selected yet. The matrix will populate as the conversation progresses."}
            </p>
            <div className="issues-matrix-empty-placeholder">
              <div className="empty-placeholder-card" style={{ borderColor: agentColor }}>
                <div className="empty-placeholder-header"></div>
                <div className="empty-placeholder-body"></div>
              </div>
            </div>
          </div>
        ) : (
          <ul className="issues-list">
            {selectedIssues.map((issue) => {
              // Pre-compute the stance display text and styling
              const stanceText = issue.stance 
                ? issue.stance.toString().replace('APPROACH_', 'Approach ') 
                : 'Custom';
              
              const stanceKey = issue.stance 
                ? issue.stance.toString().toLowerCase() 
                : '';
              
              // Determine the background color based on approach
              let backgroundColor = '#A0AEC0'; // Default gray
              
              if (issue.stance === 'APPROACH_A' || issue.stance?.toString().toUpperCase() === 'A') {
                backgroundColor = '#48BB78'; // Green
              } else if (issue.stance === 'APPROACH_B' || issue.stance?.toString().toUpperCase() === 'B') {
                backgroundColor = '#F56565'; // Red
              } else if (issue.stance === 'APPROACH_C' || issue.stance?.toString().toUpperCase() === 'C') {
                backgroundColor = '#F6AD55'; // Orange
              }
              
              return (
                <li
                  key={issue.id}
                  className={`issue-item ${issue.isPriority ? 'priority-issue' : ''}`}
                  style={issue.isPriority ? { borderColor: agentColor } : {}}
                >
                  <div className="issue-header">
                    <span className="issue-title">{issue.title}</span>
                    {issue.stance && (
                      <span
                        className={`issue-stance stance-${stanceKey}`}
                        style={{ backgroundColor }}
                      >
                        {stanceText}
                      </span>
                    )}
                  </div>
                  {issue.description && (
                    <div className="issue-description">
                      <span className="description-label">Description:</span>
                      <span className="description-text">{issue.description}</span>
                    </div>
                  )}
                  {(issue.summary ||
                    (issue.reason &&
                      typeof issue.reason === 'string' &&
                      issue.reason !== null &&
                      !/^\d+(,\s*\d+)*$/.test(issue.reason.trim())
                    )
                  ) && (
                    <div className="issue-reason">
                      <span className="reason-label">Perspective:</span>
                      {issue.summary && (
                        <div className="summary-text">
                          {issue.summary}
                        </div>
                      )}
                      {issue.reason && issue.reason !== issue.summary && (
                        Array.isArray(issue.reason) ? (
                          <ul className="reason-bullets">
                            {issue.reason.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="reason-text">{issue.reason}</span>
                        )
                      )}
                    </div>
                  )}
                  {issue.isPriority && (
                    <div className="priority-badge" style={{ backgroundColor: agentColor }}>
                      Top Priority
                    </div>
                  )}
                  {onDiscussIssue && (
                    <div className="issue-discuss-action">
                      <button
                        className="discuss-issue-button"
                        style={{ backgroundColor: agentColor, color: '#fff', marginTop: '0.5rem' }}
                        onClick={() => onDiscussIssue(issue.id, issue.title)}
                      >
                        Discuss
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="issues-matrix-footer">
        <small>Your perspective matrix will update as the conversation continues</small>
      </div>
    </div>
  );
};

export default IssuesMatrix;