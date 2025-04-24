describe('Onboarding Flow', () => {
  beforeEach(() => {
    // Create test user and log in (assumes custom Cypress commands exist)
    cy.createTestUser();
    cy.login();
  });

  it('should complete all onboarding steps', () => {
    // Step 0: Provide agent name
    cy.findByRole('textbox').type('Spark{enter}');

    // Step 1: Select issues
    cy.findByText(/Here are the issues/i).should('be.visible');
    cy.findByRole('textbox').type('1,3{enter}');

    // Step 2: Provide stance on first issue
    cy.findByText(/SUPPORT, OPPOSE, or DEPENDS/i).should('be.visible');
    cy.findByRole('textbox').type('Support, clean water is essential{enter}');

    // Step 2: Provide stance on second issue
    cy.findByText(/SUPPORT, OPPOSE, or DEPENDS/i).should('be.visible');
    cy.findByRole('textbox').type('Oppose, too expensive{enter}');

    // Step 3: Top priority
    cy.findByText(/which ONE matters most/i).should('be.visible');
    cy.findByRole('textbox').type('Clean water{enter}');

    // Step 4: Deal-breakers
    cy.findByText(/absolutely could NOT accept/i).should('be.visible');
    cy.findByRole('textbox').type('Cost increases over 10%{enter}');

    // Step 5: Display color
    cy.findByText(/highlight color/i).should('be.visible');
    cy.findByRole('textbox').type('blue{enter}');

    // Step 6: Notification preference
    cy.findByText(/How often should I brief you/i).should('be.visible');
    cy.findByRole('textbox').type('B{enter}');

    // Step 7: Proposal idea
    cy.findByText(/Any idea or proposal/i).should('be.visible');
    cy.findByRole('textbox').type('Explore community-funded water project{enter}');

    // Step 8: Summary and completion
    cy.findByText(/All set!/i).should('be.visible');
    
    // Verify no JSON appears in final message
    cy.get('.agent-message')
      .last()
      .should('not.contain', '{')
      .should('not.contain', '"agentNickname"')
      .should('not.contain', '"selectedIssues"');

    // Verify redirection to dashboard
    cy.url().should('include', '/dashboard');
  });
});