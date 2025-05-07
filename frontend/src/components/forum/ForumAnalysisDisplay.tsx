import React from 'react';
import './ForumStyles.css';

interface ForumAnalysisDisplayProps {
  summary: string;
  keyTopics: string[];
  relevanceScore: number;
  alignmentAnalysis: string;
  actionItems: string[];
  sentiment?: string;
  recommendedResponse?: string;
}

const ForumAnalysisDisplay: React.FC<ForumAnalysisDisplayProps> = ({
  summary,
  keyTopics,
  relevanceScore,
  alignmentAnalysis,
  actionItems,
  sentiment,
  recommendedResponse
}) => {
  // Function to get the color based on the relevance score
  const getRelevanceColor = (score: number): string => {
    if (score >= 80) return '#2ecc71'; // High relevance - green
    if (score >= 40) return '#f39c12'; // Medium relevance - orange
    return '#e74c3c'; // Low relevance - red
  };
  
  return (
    <div className="forum-analysis-container">
      <div className="forum-analysis-header">
        <h3>Forum Content Analysis</h3>
        <div 
          className="relevance-score" 
          style={{ backgroundColor: getRelevanceColor(relevanceScore) }}
        >
          Relevance: {relevanceScore}%
        </div>
      </div>
      
      <div className="forum-analysis-section">
        <h4>Summary</h4>
        <p>{summary}</p>
      </div>
      
      <div className="forum-analysis-section">
        <h4>Key Topics</h4>
        <ul className="key-topics-list">
          {keyTopics.map((topic, index) => (
            <li key={index}>{topic}</li>
          ))}
        </ul>
      </div>
      
      <div className="forum-analysis-section">
        <h4>Alignment Analysis</h4>
        <p>{alignmentAnalysis}</p>
      </div>
      
      {sentiment && (
        <div className="forum-analysis-section">
          <h4>Overall Sentiment</h4>
          <p>{sentiment}</p>
        </div>
      )}
      
      <div className="forum-analysis-section">
        <h4>Recommended Actions</h4>
        <ul className="action-items-list">
          {actionItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
      
      {recommendedResponse && (
        <div className="forum-analysis-section">
          <h4>Recommended Response</h4>
          <p>{recommendedResponse}</p>
        </div>
      )}
    </div>
  );
};

export default ForumAnalysisDisplay;