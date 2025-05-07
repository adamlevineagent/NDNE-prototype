# NDNE Automated Testing

This document describes the automated testing infrastructure for the NDNE prototype, including how to run existing tests and add new ones.

## Overview

The NDNE prototype includes both backend and frontend automated tests:

- **Backend Tests**: Unit and integration tests using Jest
- **Frontend Tests**: End-to-end (E2E) tests using Cypress

These tests serve different purposes and complement the manual testing procedures.

## Backend Tests

### Location

Backend tests are located in the `backend/src/tests/` directory. The test files are typically named with a `.spec.ts` suffix, indicating they are test specifications for Jest.

### Key Test Files

The following test files have been identified in the backend:

- `commentTone.spec.ts`: Tests for comment tone analysis functionality
- `negotiation-reaction.spec.ts`: Tests for negotiation reaction functionality
- `agent-service.spec.ts` (mentioned in the plan, may exist)

### Note on Test Relevance

Some backend tests may be outdated due to the architectural shift to a forum-based interaction model. In particular, tests like `negotiation-reaction.spec.ts` may reference pre-forum system interactions. However, tests related to core agent functionality (like `agent-service.spec.ts`) should still be relevant.

### Running Backend Tests

To run the backend tests:

```bash
# From the repository root
cd backend
npm test
```

To run a specific test file:

```bash
npm test -- src/tests/commentTone.spec.ts
```

To run tests with code coverage:

```bash
npm test -- --coverage
```

### Backend Test Structure

A typical backend test file looks like this:

```typescript
import { expect } from 'chai';
import * as sinon from 'sinon';
import { analyzeCommentTone } from '../services/some-service';

describe('Comment Tone Analysis', () => {
  afterEach(() => {
    // Clean up any stubs or mocks
    sinon.restore();
  });

  it('should identify positive tone in a comment', async () => {
    // Arrange
    const comment = "This is a really great idea!";
    
    // Act
    const result = await analyzeCommentTone(comment);
    
    // Assert
    expect(result.tone).to.equal('positive');
  });

  it('should handle empty comments', async () => {
    // Arrange
    const comment = "";
    
    // Act & Assert
    await expect(analyzeCommentTone(comment)).to.be.rejectedWith('Comment cannot be empty');
  });
});
```

## Frontend Tests

### Location

Frontend end-to-end tests should be located in the `frontend/cypress/e2e/` directory. As noted in the documentation plan, the following files have been identified:

- `dashboard.cy.ts`
- `negotiation.cy.ts`
- `onboarding.cy.ts`

### Note on Test Relevance

As with the backend tests, some frontend tests may be outdated due to architectural changes. Specifically:

- `onboarding.cy.ts` is likely still relevant as it covers user preference setup
- `negotiation.cy.ts` may be outdated if it covers pre-forum system interactions
- Other E2E tests should be thoroughly reviewed to ensure they align with the current forum-based interaction model

### Running Frontend Tests

The documentation plan notes that the exact command to run Cypress tests needs to be confirmed with the development team, as it's not defined in `frontend/package.json`. However, typical commands would be:

```bash
# From the repository root
cd frontend

# Open Cypress Test Runner (interactive mode)
npx cypress open

# Run tests headlessly
npx cypress run
```

### Frontend Test Structure

A typical Cypress E2E test file looks like this:

```typescript
describe('User Onboarding', () => {
  beforeEach(() => {
    // Set up a clean testing state
    cy.visit('/');
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should complete the onboarding process', () => {
    // Navigate to registration
    cy.visit('/register');
    
    // Fill out registration form
    cy.get('[data-cy=email-input]').type('test-user@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=submit-button]').click();
    
    // Verify redirect to onboarding
    cy.url().should('include', '/onboarding');
    
    // Complete first onboarding step (agent name)
    cy.get('[data-cy=agent-name-input]').type('Test Agent');
    cy.get('[data-cy=next-button]').click();
    
    // Continue with other onboarding steps...
    
    // Verify completion
    cy.url().should('include', '/chat');
    cy.get('[data-cy=welcome-message]').should('be.visible');
  });
});
```

## Adding New Tests

### Adding Backend Tests

To add a new backend test:

1. Create a new file in `backend/src/tests/` with the `.spec.ts` suffix
2. Import the necessary testing utilities and the module to test
3. Structure your tests using `describe` and `it` blocks
4. Use assertions to verify expected behavior
5. Run the test to verify it works correctly

Example of a new backend test file:

```typescript
import { expect } from 'chai';
import * as forumService from '../services/forum-interaction-service';
import * as discourseApiService from '../services/discourse-api-service';
import * as sinon from 'sinon';

describe('Forum Interaction Service', () => {
  // Set up mocks
  let discourseApiStub;
  
  beforeEach(() => {
    // Mock the Discourse API service to avoid actual API calls
    discourseApiStub = sinon.stub(discourseApiService.default, 'postToDiscourse');
    discourseApiStub.resolves({ success: true, postUrlOrId: 'https://discourse.example.com/t/123/1' });
  });
  
  afterEach(() => {
    // Clean up stubs
    sinon.restore();
  });
  
  it('should generate forum post content based on agent preferences', async () => {
    // Mock data for test
    const agentId = 'test-agent-id';
    const directive = 'Create a post about climate action';
    
    // Call the service
    const result = await forumService.generateDiscoursePostContent(agentId, directive);
    
    // Assertions
    expect(result).to.have.property('body');
    expect(result.body).to.be.a('string');
    if (result.title) {
      expect(result.title).to.be.a('string');
    }
  });
});
```

### Adding Frontend Tests

To add a new frontend E2E test:

1. Create a new file in `frontend/cypress/e2e/` with the `.cy.ts` suffix
2. Structure your tests using `describe` and `it` blocks
3. Use Cypress commands to interact with the application
4. Add assertions to verify expected behavior
5. Run the test to verify it works correctly

Example of a new frontend test file:

```typescript
describe('Forum Integration', () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('test-user@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=submit-button]').click();
    
    // Wait for login to complete
    cy.url().should('include', '/dashboard');
  });
  
  it('should create a forum post through agent directive', () => {
    // Navigate to chat
    cy.visit('/chat');
    
    // Send directive to create forum post
    cy.get('[data-cy=chat-input]')
      .type('Please create a post about renewable energy in the forum');
    cy.get('[data-cy=send-button]').click();
    
    // Wait for agent response
    cy.get('[data-cy=agent-message]', { timeout: 10000 })
      .should('contain.text', 'I\'ve created a post');
    
    // Verify the post link is provided
    cy.get('[data-cy=agent-message]')
      .should('contain.text', 'discourse.example.com');
  });
});
```

### Test Data and Mocking

For effective automated testing:

1. **Create Test Data**: Use fixtures for consistent test data
   ```typescript
   // In Cypress
   cy.fixture('agent-preferences.json').then((prefs) => {
     // Use preferences in the test
   });
   
   // In Jest
   const testPreferences = require('./fixtures/agent-preferences.json');
   ```

2. **Mock API Responses**: For external dependencies like the Discourse API
   ```typescript
   // In Jest
   jest.mock('../services/discourse-api-service', () => ({
     postToDiscourse: jest.fn().mockResolvedValue({ success: true, postUrlOrId: 'https://example.com/t/123' })
   }));
   
   // In Cypress
   cy.intercept('POST', '/api/forum/post-directive', {
     statusCode: 200,
     body: { success: true, postUrl: 'https://example.com/t/123' }
   }).as('postDirective');
   ```

3. **Isolate Tests**: Ensure each test is independent and does not rely on the state from other tests

## Test Coverage and Gaps

Based on the available information, the current automated testing may have the following gaps:

1. **Forum Interaction**: The recent shift to a forum-based interaction model means that automated tests for this functionality may be limited or outdated.

2. **Agent Behavior**: Tests for complex agent behavior, particularly around forum content processing, may need enhancement.

3. **End-to-End Flows**: Tests that cover the complete flow from user onboarding to forum interaction and monitoring may be incomplete.

### Recommended Testing Enhancements

To improve test coverage:

1. **Update E2E Tests**: Revise existing E2E tests to align with the current forum-based architecture

2. **Add Integration Tests**: Create tests that verify the interaction between services, particularly:
   - Agent service with forum interaction service
   - Forum polling service with chat notifications

3. **Mock Discourse API**: Create comprehensive mocks for Discourse API to test forum functionality without requiring an actual Discourse instance

4. **Test Preference Extraction**: Add tests for the knowledge extraction capabilities of the agent

## Continuous Integration

Ideally, automated tests should run in a CI/CD pipeline. While the specifics of the current CI setup are not detailed in the provided documentation, a typical configuration would include:

- Running backend tests on each pull request
- Running frontend E2E tests on each pull request or merge to main
- Generating test coverage reports

## Conclusion

Automated testing is a critical component of the NDNE prototype's quality assurance. By maintaining and extending the test suite, you can ensure that new features and changes do not introduce regressions and that the system behaves as expected.

When adding new features or making significant changes, consider writing automated tests first (Test-Driven Development) to clarify requirements and ensure correctness.