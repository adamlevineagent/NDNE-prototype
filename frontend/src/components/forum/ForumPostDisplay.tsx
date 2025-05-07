import React from 'react';
import './ForumStyles.css';

interface ForumPostDisplayProps {
  title: string;
  body: string;
  category: string;
}

const ForumPostDisplay: React.FC<ForumPostDisplayProps> = ({
  title,
  body,
  category
}) => {
  return (
    <div className="forum-post-container">
      <div className="forum-post-header">
        <h3 className="forum-post-title">{title}</h3>
        <div className="forum-post-category">{category}</div>
      </div>
      <div className="forum-post-body">
        {body}
      </div>
      <div className="forum-post-instructions">
        <h4>Manual Posting Instructions:</h4>
        <ol>
          <li>Navigate to your Discourse forum</li>
          <li>Select the "{category}" category</li>
          <li>Click "New Topic"</li>
          <li>Copy and paste the title and body content above</li>
          <li>Click "Create Topic" to publish your post</li>
        </ol>
      </div>
    </div>
  );
};

export default ForumPostDisplay;