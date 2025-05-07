describe('Dashboard and Chat Integration', () => {
  beforeEach(() => {
    // Mock the auth state
    cy.intercept('GET', '/api/agents/me', {
      statusCode: 200,
      body: {
        id: 'test-agent-id',
        name: 'Test Agent',
        agentName: 'Praxis',
        userName: 'Test User',
        color: '#4299e1',
        alignmentScore: 0.85,
      },
    }).as('getAgent');

    // Mock the issues data
    cy.intercept('GET', '/api/issues/user', {
      statusCode: 200,
      body: [
        {
          id: 'issue-1',
          title: 'Climate Change',
          description: 'Policies to address climate change',
          stance: 'Supportive',
          isPriority: true,
        },
        {
          id: 'issue-2',
          title: 'Healthcare',
          description: 'Universal healthcare coverage',
          stance: null,
          isPriority: false,
        },
      ],
    }).as('getIssues');

    // Visit the dashboard page (assuming a logged-in state)
    cy.visit('/dashboard');
    cy.wait('@getAgent');
    cy.wait('@getIssues');
  });

  it('should navigate between tabs and correctly update content', () => {
    // Verify we start on positions tab
    cy.contains('Positions Matrix').should('have.class', 'active');
    cy.contains('This is where your positions live').should('be.visible');

    // Switch to activity tab
    cy.contains('button', 'Activity Audit').click();
    cy.contains('Activity Audit').should('have.class', 'active');
    cy.contains('This is a record of all actions').should('be.visible');

    // Switch to proposals tab
    cy.contains('button', 'Proposals').click();
    cy.contains('Proposals').should('have.class', 'active');
    cy.contains('this is where your ideas take shape').should('be.visible');

    // Switch back to positions tab
    cy.contains('button', 'Positions Matrix').click();
    cy.contains('Positions Matrix').should('have.class', 'active');
  });

  it('should open chat panel when clicking discuss buttons', () => {
    // The chat panel should be minimized initially
    cy.get('.agent-chat-panel.minimized').should('exist');

    // On positions tab, click "Discuss a New Issue"
    cy.contains('Discuss a New Issue').click();
    
    // Chat panel should be maximized
    cy.get('.agent-chat-panel').should('exist');
    cy.get('.agent-chat-panel.minimized').should('not.exist');
    
    // Minimize chat panel
    cy.get('.minimize-button').click();
    cy.get('.agent-chat-panel.minimized').should('exist');
    
    // Switch to activity tab
    cy.contains('button', 'Activity Audit').click();
    
    // Find a Discuss button if it exists and click it
    cy.get('body').then(($body) => {
      if ($body.find('.discuss-button').length > 0) {
        cy.get('.discuss-button').first().click();
        
        // Chat panel should be maximized again
        cy.get('.agent-chat-panel.minimized').should('not.exist');
      }
    });
  });

  it('should maintain chat context when switching tabs', () => {
    // Click "Discuss a New Issue" on positions tab
    cy.contains('Discuss a New Issue').click();
    
    // Chat panel should show contextual help for positions
    cy.get('.contextual-help-banner').contains('positions').should('be.visible');
    
    // Switch to proposals tab
    cy.contains('button', 'Proposals').click();
    
    // Contextual help should update
    cy.get('.contextual-help-banner').contains('proposals').should('be.visible');
  });

  it('should have proper mobile responsiveness', () => {
    // Test on mobile viewport
    cy.viewport('iphone-x');
    
    // Tabs should be scrollable
    cy.get('.dashboard-tabs').should('have.css', 'overflow-x', 'auto');
    
    // Agent status panel should stack vertically
    cy.get('.agent-status-panel').should('have.css', 'flex-direction', 'column');
    
    // Check if the buttons take full width
    cy.get('.pause-button').invoke('outerWidth').should('be.closeTo', 
      cy.get('.agent-status-panel').invoke('outerWidth').then(parseInt), 10);
  });
});