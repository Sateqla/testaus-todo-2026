describe('Todo app', () => {
  afterEach(() => {
    cy.clearLocalStorage();
    cy.reload();
    cy.get('#empty-state').should('be.visible');
  });

  it('creates a task and keeps it after a reload', () => {
    cy.visit('/');
    cy.get('#topic').type('Test the app');
    cy.get('#save-btn').click();

    cy.get('#task-list').should('contain', 'Test the app');
    cy.reload();
    cy.get('#task-list').should('contain', 'Test the app');
  });
});