import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import './NegotiationFeedback.css';

interface NegotiationFeedbackProps {
  negotiationId: string;
  agentId: string;
  onFeedbackSubmitted?: () => void;
}

interface FeedbackData {
  id: string;
  rating: number;
  representationAccuracy: number;
  comments: string;
  createdAt: string;
}

const NegotiationFeedback: React.FC<NegotiationFeedbackProps> = ({ 
  negotiationId, 
  agentId,
  onFeedbackSubmitted 
}) => {
  const [rating, setRating] = useState<number>(5);
  const [representationAccuracy, setRepresentationAccuracy] = useState<number>(5);
  const [comments, setComments] = useState<string>('');
  const [existingFeedback, setExistingFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Fetch existing feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/feedback/negotiation/${negotiationId}?agentId=${agentId}`);
        if (response.data.length > 0) {
          setExistingFeedback(response.data[0]);
          setRating(response.data[0].rating);
          setRepresentationAccuracy(response.data[0].representationAccuracy);
          setComments(response.data[0].comments);
        }
      } catch (err) {
        console.error('Failed to fetch feedback', err);
        setError('Failed to load existing feedback');
      } finally {
        setLoading(false);
      }
    };

    if (negotiationId && agentId) {
      fetchFeedback();
    }
  }, [negotiationId, agentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      await apiClient.post(`/api/feedback/negotiation/${negotiationId}`, {
        agentId,
        rating,
        representationAccuracy,
        comments
      });
      
      setSuccess(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
      
      // Reset success message after a delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to submit feedback', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="feedback-loading">Loading feedback...</div>;
  }

  return (
    <div className="negotiation-feedback">
      <h3>Agent Feedback</h3>
      {existingFeedback && (
        <div className="feedback-notice">
          You've already provided feedback on {new Date(existingFeedback.createdAt).toLocaleDateString()}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="feedback-field">
          <label>
            <span>Overall Rating:</span>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`star-button ${value <= rating ? 'selected' : ''}`}
                  onClick={() => setRating(value)}
                  aria-label={`Rate ${value} out of 5`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="feedback-field">
          <label>
            <span>Representation Accuracy:</span>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`star-button ${value <= representationAccuracy ? 'selected' : ''}`}
                  onClick={() => setRepresentationAccuracy(value)}
                  aria-label={`Rate representation ${value} out of 5`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
          <div className="hint-text">
            How accurately did the agent represent your preferences?
          </div>
        </div>

        <div className="feedback-field">
          <label>
            <span>Comments:</span>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your thoughts on the agent's negotiation performance..."
              rows={4}
            />
          </label>
        </div>

        {error && <div className="feedback-error">{error}</div>}
        {success && <div className="feedback-success">Feedback submitted successfully!</div>}
        
        <button 
          type="submit" 
          className="feedback-submit-button"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default NegotiationFeedback;