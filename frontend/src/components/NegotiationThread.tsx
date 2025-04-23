import React, { useEffect, useState } from "react";
import { negotiations } from "../api/apiClient";
import "./Negotiation.css";

interface NegotiationThreadProps {
  negotiationId: string;
  agentId: string;
}

interface NegotiationMessage {
  id: string;
  negotiationId: string;
  agentId: string;
  content: string;
  messageType: string;
  referencedMessageId?: string;
  metadata?: any;
  timestamp: string;
  reactions: NegotiationReaction[];
}

interface NegotiationReaction {
  id: string;
  messageId: string;
  agentId: string;
  reactionType: string;
  createdAt: string;
}

const REACTION_TYPES = [
  { type: "support", label: "👍" },
  { type: "non-support", label: "👎" },
  { type: "like", label: "❤️" },
  { type: "dislike", label: "💔" },
];

const NegotiationThread: React.FC<NegotiationThreadProps> = ({
  negotiationId,
  agentId,
}) => {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await negotiations.getMessages(negotiationId);
      setMessages(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [negotiationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await negotiations.postMessage(negotiationId, {
        agentId,
        content: newMessage,
      });
      setNewMessage("");
      await fetchMessages();
      setSuccess("Message posted!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to post message.");
    } finally {
      setPosting(false);
    }
  };

  const handleAddReaction = async (
    messageId: string,
    reactionType: string
  ) => {
    try {
      await negotiations.addReaction(negotiationId, messageId, {
        agentId,
        reactionType,
      });
      await fetchMessages();
      setSuccess("Reaction added!");
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to add reaction.");
    }
  };

  const handleRemoveReaction = async (
    messageId: string,
    reactionType: string
  ) => {
    try {
      await negotiations.removeReaction(negotiationId, messageId, {
        agentId,
        reactionType,
      });
      await fetchMessages();
      setSuccess("Reaction removed.");
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to remove reaction.");
    }
  };

  const getReactionCount = (reactions: NegotiationReaction[], type: string) =>
    reactions.filter((r) => r.reactionType === type).length;

  const hasReacted = (
    reactions: NegotiationReaction[],
    type: string
  ) => reactions.some((r) => r.reactionType === type && r.agentId === agentId);

  return (
    <div className="negotiation-thread">
      <h3>Negotiation Thread</h3>
      {loading ? (
        <div>Loading messages...</div>
      ) : (
        <div className="negotiation-messages">
          {messages.map((msg) => (
            <div key={msg.id} className="negotiation-message">
              <div>
                <strong>Agent {msg.agentId}</strong> [{new Date(msg.timestamp).toLocaleString()}]
              </div>
              <div>{msg.content}</div>
              <div className="reactions-row">
                {REACTION_TYPES.map((rt) => (
                  <button
                    key={rt.type}
                    className={`reaction-btn${hasReacted(msg.reactions, rt.type) ? " reacted" : ""}`}
                    aria-pressed={hasReacted(msg.reactions, rt.type)}
                    aria-label={
                      hasReacted(msg.reactions, rt.type)
                        ? `Remove your ${rt.type} reaction`
                        : `Add ${rt.type} reaction`
                    }
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        hasReacted(msg.reactions, rt.type)
                          ? handleRemoveReaction(msg.id, rt.type)
                          : handleAddReaction(msg.id, rt.type);
                      }
                    }}
                    onClick={() =>
                      hasReacted(msg.reactions, rt.type)
                        ? handleRemoveReaction(msg.id, rt.type)
                        : handleAddReaction(msg.id, rt.type)
                    }
                  >
                    {rt.label} {getReactionCount(msg.reactions, rt.type)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="negotiation-new-message">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message to join or participate..."
          rows={2}
          disabled={posting}
          aria-label="Type your message"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              handleSendMessage();
            }
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={posting || !newMessage.trim()}
          aria-label="Send message"
        >
          {posting ? "Posting..." : "Send"}
        </button>
      </div>
      {error && (
        <div
          className="negotiation-error"
          role="alert"
          aria-live="assertive"
          style={{ color: "red", marginTop: "0.5rem" }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="negotiation-success"
          role="status"
          aria-live="polite"
          style={{ color: "green", marginTop: "0.5rem" }}
        >
          {success}
        </div>
      )}
    </div>
  );
};

export default NegotiationThread;