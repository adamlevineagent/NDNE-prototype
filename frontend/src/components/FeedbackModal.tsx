import React, { useState } from "react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send feedback to backend or log it
    setSubmitted(true);
    setTimeout(() => {
      setFeedback("");
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="feedback-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Feedback Form"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="feedback-modal-content"
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "8px",
          minWidth: "300px",
          maxWidth: "90vw",
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2>Submit Feedback</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Describe your issue or suggestion..."
            rows={5}
            style={{ width: "100%" }}
            aria-label="Feedback"
            required
          />
          <div style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={submitted || !feedback.trim()}>
              {submitted ? "Submitted!" : "Submit"}
            </button>
            <button type="button" onClick={onClose} style={{ marginLeft: "1rem" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;