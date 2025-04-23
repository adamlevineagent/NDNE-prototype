import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NegotiationThread from "../NegotiationThread";

jest.mock("../../api/apiClient", () => ({
  negotiations: {
    getMessages: jest.fn().mockResolvedValue({ data: [
      {
        id: "msg1",
        negotiationId: "neg1",
        agentId: "agent1",
        content: "Test message",
        messageType: "statement",
        timestamp: new Date().toISOString(),
        reactions: [],
      }
    ]}),
    postMessage: jest.fn().mockResolvedValue({}),
    addReaction: jest.fn().mockResolvedValue({}),
    removeReaction: jest.fn().mockResolvedValue({}),
  }
}));

describe("NegotiationThread", () => {
  it("renders messages and allows posting", async () => {
    render(<NegotiationThread negotiationId="neg1" agentId="agent1" />);
    expect(screen.getByText(/Negotiation Thread/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Test message/i)).toBeInTheDocument());

    // Simulate typing and posting a message
    fireEvent.change(screen.getByLabelText(/Type your message/i), { target: { value: "Hello world" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));
    await waitFor(() => expect(screen.getByText(/Message posted!/i)).toBeInTheDocument());
  });

  it("allows adding and removing a reaction", async () => {
    render(<NegotiationThread negotiationId="neg1" agentId="agent1" />);
    await waitFor(() => expect(screen.getByText(/Test message/i)).toBeInTheDocument());

    // Add a reaction
    fireEvent.click(screen.getByText("👍 0"));
    await waitFor(() => expect(screen.getByText(/Reaction added!/i)).toBeInTheDocument());

    // Remove a reaction
    fireEvent.click(screen.getByText("👍 0"));
    await waitFor(() => expect(screen.getByText(/Reaction removed./i)).toBeInTheDocument());
  });
});