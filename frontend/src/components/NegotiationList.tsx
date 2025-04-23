import React, { useEffect, useState } from "react";
import { negotiations } from "../api/apiClient";
import "./Negotiation.css";
import NegotiationThread from "./NegotiationThread";

interface NegotiationSession {
  id: string;
  topic: string;
  description?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  initiatorId: string;
}

interface NegotiationListProps {
  agentId: string;
}

const NegotiationList: React.FC<NegotiationListProps> = ({ agentId }) => {
  const [negotiationsList, setNegotiationsList] = useState<NegotiationSession[]>([]);
  const [selectedNegotiationId, setSelectedNegotiationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for creating a negotiation
  const [createOpen, setCreateOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchNegotiations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await negotiations.getAll();
      setNegotiationsList(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load negotiations.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await negotiations.create({
        topic: newTopic,
        description: newDescription,
        initiatorId: agentId,
      });
      setCreateOpen(false);
      setNewTopic("");
      setNewDescription("");
      await fetchNegotiations();
    } catch (err: any) {
      setError(err.message || "Failed to create negotiation.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchNegotiations();
  }, []);

  return (
    <div className="negotiation-list" role="region" aria-label="Negotiation List">
      <h2>All Negotiations</h2>
      <button
        style={{ marginBottom: "1rem" }}
        onClick={() => setCreateOpen(true)}
        aria-label="Create New Negotiation"
      >
        + Create Negotiation
      </button>
      {createOpen && (
        <div
          className="negotiation-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Create Negotiation"
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="negotiation-modal-content"
            style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: "8px",
              minWidth: "300px",
              maxWidth: "90vw",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Create New Negotiation</h3>
            <form onSubmit={handleCreateNegotiation}>
              <label>
                Topic:
                <input
                  type="text"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  required
                  style={{ width: "100%", marginBottom: "0.5rem" }}
                  aria-label="Negotiation Topic"
                />
              </label>
              <label>
                Description:
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={3}
                  style={{ width: "100%" }}
                  aria-label="Negotiation Description"
                />
              </label>
              <div style={{ marginTop: "1rem" }}>
                <button type="submit" disabled={creating || !newTopic.trim()}>
                  {creating ? "Creating..." : "Create"}
                </button>
                <button type="button" onClick={() => setCreateOpen(false)} style={{ marginLeft: "1rem" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {loading ? (
        <div>Loading negotiations...</div>
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <ul role="list" tabIndex={0} aria-label="Negotiation Sessions">
          {negotiationsList.map((neg, idx) => (
            <li
              key={neg.id}
              style={{ marginBottom: "1rem" }}
              tabIndex={0}
              aria-label={`Negotiation: ${neg.topic}, status ${neg.status}`}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && document.activeElement === e.currentTarget) {
                  setSelectedNegotiationId(neg.id);
                }
              }}
            >
              <strong>{neg.topic}</strong> (Status: {neg.status})
              <br />
              Started: {new Date(neg.startedAt).toLocaleString()}
              <br />
              {neg.description && <span>{neg.description}</span>}
              <br />
              <button
                onClick={() => setSelectedNegotiationId(neg.id)}
                aria-label={`View thread for negotiation ${neg.topic}`}
              >
                View Thread
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedNegotiationId && (
        <div style={{ marginTop: "2rem" }} role="region" aria-label="Negotiation Thread">
          <button
            onClick={() => setSelectedNegotiationId(null)}
            aria-label="Back to Negotiation List"
          >
            Back to List
          </button>
          <NegotiationThread negotiationId={selectedNegotiationId} agentId={agentId} />
        </div>
      )}
    </div>
  );
};

export default NegotiationList;