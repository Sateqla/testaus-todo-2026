import { name, version } from '../../package.json';

const storageKey = 'todo_tasks_v1';

function createTask({ topic, priority, status, description }) {
  cy.get('#topic').type(topic, { parseSpecialCharSequences: false });
  if (priority) cy.get('#priority').select(priority);
  if (status) cy.get('#status').select(status);
  if (description) {
    cy.get('#description').type(description, { parseSpecialCharSequences: false });
  }
  cy.get('#save-btn').click();
}

function task(topic) {
  return cy.contains('#task-list .title', topic).closest('.task');
}

function expectCreateForm() {
  cy.get('#form-title').should('have.text', 'Create Task');
  cy.get('#save-btn').should('have.text', 'Save Task');
  cy.get('#topic').should('have.value', '');
  cy.get('#description').should('have.value', '');
  cy.get('#priority').should('have.value', 'medium');
  cy.get('#status').should('have.value', 'todo');
}

describe('Todo app', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('shows an empty list and the default form with all supported choices', () => {
    cy.get('#task-list .task').should('not.exist');
    cy.get('#empty-state')
      .should('be.visible')
      .and('have.text', 'No tasks yet. Add your first task above.');
    expectCreateForm();
    cy.get('#priority option').then(($options) => {
      expect([...$options].map((option) => option.textContent)).to.deep.equal([
        'Low', 'Medium', 'High',
      ]);
    });
    cy.get('#status option').then(($options) => {
      expect([...$options].map((option) => option.textContent)).to.deep.equal([
        'To do', 'In progress', 'Blocked', 'Done',
      ]);
    });
  });

  it('rejects empty and whitespace-only topics and limits input to 120 characters', () => {
    cy.get('#save-btn').click();
    cy.get('#topic').then(($input) => {
      expect($input[0].validity.valueMissing).to.equal(true);
    });
    cy.get('#topic').type('   ');
    cy.get('#save-btn').click();
    cy.get('#topic').should('be.focused');
    cy.get('#task-list .task').should('not.exist');
    cy.get('#empty-state').should('be.visible');

    cy.get('#topic').clear().type('x'.repeat(121));
    cy.get('#topic').should('have.value', 'x'.repeat(120));
    cy.get('#save-btn').click();
    task('x'.repeat(120)).should('exist');
  });

  it('resets unsaved input and cancels editing without changing the task', () => {
    cy.get('#topic').type('Unsaved');
    cy.get('#priority').select('high');
    cy.get('#status').select('blocked');
    cy.get('#description').type('Draft');
    cy.get('#reset-btn').click();
    expectCreateForm();
    cy.get('#task-list .task').should('not.exist');

    createTask({ topic: 'Original', priority: 'low', status: 'blocked', description: 'Details' });
    task('Original').find('[data-action="edit"]').click();
    cy.get('#form-title').should('have.text', 'Edit Task');
    cy.get('#save-btn').should('have.text', 'Update Task');
    cy.get('#topic').should('have.value', 'Original').clear().type('Changed');
    cy.get('#priority').should('have.value', 'low').select('high');
    cy.get('#status').should('have.value', 'blocked').select('done');
    cy.get('#description').should('have.value', 'Details').clear().type('Changed details');
    cy.get('#reset-btn').click();
    expectCreateForm();
    cy.reload();
    task('Original').should('contain', 'Details').and('contain', 'Low').and('contain', 'Blocked');
    cy.get('#task-list .task').should('have.length', 1);
    cy.contains('#task-list .title', 'Changed').should('not.exist');
  });

  [
    { topic: 'Default task', priority: 'medium', status: 'todo', label: 'To do', completed: false, useDefaults: true },
    { topic: 'Low task', priority: 'low', status: 'in-progress', label: 'In progress', completed: false },
    { topic: 'High task', priority: 'high', status: 'blocked', label: 'Blocked', completed: false },
    { topic: 'Finished task', priority: 'medium', status: 'done', label: 'Done', completed: true },
  ].forEach(({ topic, priority, status, label, completed, useDefaults }) => {
    it(`creates and displays a ${status} task with ${priority} priority`, () => {
      createTask({ topic, priority: useDefaults ? undefined : priority, status: useDefaults ? undefined : status });
      task(topic).should(completed ? 'have.class' : 'not.have.class', 'done');
      task(topic).find('.badge').first().should('contain', priority[0].toUpperCase() + priority.slice(1));
      task(topic).find('.badge').last().should('have.text', label);
      task(topic).find('[data-action="complete"]').should('contain', completed ? 'Undo' : 'Complete');
      cy.get('#empty-state').should('not.be.visible');
      expectCreateForm();
      cy.reload();
      task(topic).should(completed ? 'have.class' : 'not.have.class', 'done');
      task(topic).find('.badge').first().should('contain', priority[0].toUpperCase() + priority.slice(1));
      task(topic).find('.badge').last().should('have.text', label);
      task(topic).find('[data-action="complete"]').should('contain', completed ? 'Undo' : 'Complete');
    });
  });

  it('trims input and displays HTML-like topic and description as text', () => {
    const topic = '<img src=x> & "quoted"';
    const description = "<b>Details</b> & 'more'";
    createTask({ topic: `  ${topic}  `, description: `  ${description}  ` });
    cy.get('#task-list .title').should('have.text', topic);
    cy.get('#task-list .desc').should('have.text', description);
    cy.get('#task-list img, #task-list .desc b').should('not.exist');
    cy.reload();
    cy.get('#task-list .title').should('have.text', topic);
    cy.get('#task-list .desc').should('have.text', description);
  });

  it('edits every field and persists the update without creating another task', () => {
    createTask({ topic: 'Before', priority: 'low', status: 'todo', description: 'Old details' });
    task('Before').find('[data-action="edit"]').click();
    cy.get('#topic').should('have.value', 'Before').clear().type('After');
    cy.get('#priority').should('have.value', 'low').select('high');
    cy.get('#status').should('have.value', 'todo').select('in-progress');
    cy.get('#description').should('have.value', 'Old details').clear().type('New details');
    cy.get('#save-btn').click();
    expectCreateForm();
    cy.get('#task-list .task').should('have.length', 1);
    cy.contains('#task-list .title', 'Before').should('not.exist');
    cy.reload();
    task('After').should('contain', 'New details').and('contain', 'High').and('contain', 'In progress');
    cy.get('#task-list .task').should('have.length', 1);
  });

  it('persists completion and undo, changing Done back to To do', () => {
    createTask({ topic: 'Complete me', status: 'blocked' });
    task('Complete me').find('[data-action="complete"]').click();
    cy.reload();
    task('Complete me').should('have.class', 'done').and('contain', 'Done');
    task('Complete me').find('[data-action="complete"]').should('contain', 'Undo').click();
    cy.reload();
    task('Complete me').should('not.have.class', 'done').and('contain', 'To do');
    task('Complete me').find('[data-action="complete"]').should('contain', 'Complete');
  });

  it('keeps a task completed when editing Done to another status, then preserves that status on undo', () => {
    createTask({ topic: 'Change status' });
    task('Change status').find('[data-action="edit"]').click();
    cy.get('#status').select('done');
    cy.get('#save-btn').click();
    task('Change status').should('have.class', 'done').and('contain', 'Done');
    task('Change status').find('[data-action="edit"]').click();
    cy.get('#status').select('blocked');
    cy.get('#save-btn').click();
    cy.reload();
    task('Change status').should('have.class', 'done').and('contain', 'Blocked');
    task('Change status').find('[data-action="complete"]').should('contain', 'Undo').click();
    cy.reload();
    task('Change status').should('not.have.class', 'done').and('contain', 'Blocked');
    task('Change status').find('[data-action="complete"]').should('contain', 'Complete');
  });

  it('confirms deletion, preserves cancelled tasks, and restores the empty state', () => {
    createTask({ topic: 'Keep for now' });
    createTask({ topic: 'Remove first' });
    const confirm = cy.stub();
    confirm.onFirstCall().returns(false);
    confirm.onSecondCall().returns(true);
    confirm.onThirdCall().returns(true);
    cy.on('window:confirm', confirm);

    task('Keep for now').find('[data-action="delete"]').click();
    cy.wrap(confirm).should('have.been.calledWith', 'Delete this task?');
    cy.reload();
    cy.get('#task-list .task').should('have.length', 2);
    task('Keep for now').should('exist');

    task('Remove first').find('[data-action="delete"]').click();
    cy.reload();
    cy.get('#task-list .task').should('have.length', 1);
    task('Keep for now').should('exist');
    cy.contains('#task-list .title', 'Remove first').should('not.exist');
    task('Keep for now').find('[data-action="delete"]').click();
    cy.reload();
    cy.get('#task-list .task').should('not.exist');
    cy.get('#empty-state').should('be.visible');
    cy.window().then((win) => {
      expect(JSON.parse(win.localStorage.getItem(storageKey))).to.deep.equal([]);
    });
  });

  it('orders by completion, priority, and creation time, including after reload', () => {
    const tasks = [
      { id: '1', topic: 'Done high', priority: 'high', status: 'done', completed: true, createdAt: 5 },
      { id: '2', topic: 'Open low', priority: 'low', status: 'todo', completed: false, createdAt: 6 },
      { id: '3', topic: 'Open high old', priority: 'high', status: 'todo', completed: false, createdAt: 1 },
      { id: '4', topic: 'Done low', priority: 'low', status: 'done', completed: true, createdAt: 7 },
      { id: '5', topic: 'Open medium', priority: 'medium', status: 'todo', completed: false, createdAt: 8 },
      { id: '6', topic: 'Open high new', priority: 'high', status: 'todo', completed: false, createdAt: 2 },
      { id: '7', topic: 'Done medium', priority: 'medium', status: 'done', completed: true, createdAt: 9 },
    ].map((item) => ({ ...item, description: '', updatedAt: item.createdAt }));
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem(storageKey, JSON.stringify(tasks));
      },
    });
    const expected = [
      'Open high new', 'Open high old', 'Open medium', 'Open low',
      'Done high', 'Done medium', 'Done low',
    ];
    const checkOrder = (order) => {
      cy.get('#task-list .title').should(($titles) => {
        expect([...$titles].map((title) => title.textContent)).to.deep.equal(order);
      });
    };
    checkOrder(expected);
    cy.reload();
    checkOrder(expected);
    task('Open high new').find('[data-action="complete"]').click();
    const afterCompletion = [
      'Open high old', 'Open medium', 'Open low',
      'Done high', 'Open high new', 'Done medium', 'Done low',
    ];
    checkOrder(afterCompletion);
    cy.reload();
    checkOrder(afterCompletion);
  });

  ['{invalid json', '{"topic":"not an array"}'].forEach((value) => {
    it(`starts with an empty list for invalid saved data: ${value}`, () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem(storageKey, value);
        },
      });
      cy.get('#task-list .task').should('not.exist');
      cy.get('#empty-state').should('be.visible');
    });
  });

  it('exposes health and version endpoints', () => {
    cy.request('/health').its('body').should('deep.equal', { status: 'ok' });
    cy.request('/version').its('body').should('deep.equal', { name, version });
  });
});
