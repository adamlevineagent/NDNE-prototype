describe("Negotiation Thread E2E", () => {
  beforeEach(() => {
    // Assume user is already authenticated for this test
    cy.visit("/negotiations");
  });

  it("should display the negotiation list and allow viewing a thread", () => {
    cy.contains("All Negotiations");
    cy.get("ul[aria-label='Negotiation Sessions'] li").first().within(() => {
      cy.contains("View Thread").click();
    });
    cy.contains("Negotiation Thread");
  });

  it("should allow posting a message to join a negotiation", () => {
    cy.get("ul[aria-label='Negotiation Sessions'] li").first().within(() => {
      cy.contains("View Thread").click();
    });
    cy.get("textarea[aria-label='Type your message']").type("Hello, joining this negotiation!");
    cy.get("button[aria-label='Send message']").click();
    cy.contains("Message posted!");
    cy.contains("Hello, joining this negotiation!");
  });

  it("should allow adding and removing a reaction", () => {
    cy.get("ul[aria-label='Negotiation Sessions'] li").first().within(() => {
      cy.contains("View Thread").click();
    });
    cy.get(".negotiation-message").first().within(() => {
      cy.contains("👍").click();
      cy.contains("Reaction added!");
      cy.contains("👍 1");
      cy.contains("👍").click();
      cy.contains("Reaction removed.");
    });
  });
});