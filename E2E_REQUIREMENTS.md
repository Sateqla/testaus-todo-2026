# End-to-end requirements

These requirements describe the current app behavior and are intended as a
baseline for Cypress tests, not as a proposal for new features. Tests should
start with a known localStorage state and use distinct task topics to identify
tasks.

## Initial state and form

- **E2E-01**: With no saved tasks, the task list is empty and displays
  "No tasks yet. Add your first task above."
- **E2E-02**: The create form provides Topic, Priority, Status, and Description.
  Priority defaults to Medium, status defaults to To do, and description is
  optional.
- **E2E-03**: A task cannot be saved with an empty or whitespace-only topic.
  Topic accepts at most 120 characters through the form.
- **E2E-04**: Reset clears the form and returns it to create mode, with the
  default priority and status. Resetting while editing does not save changes.

## Create and display

- **E2E-05**: Saving a valid task adds it to the list and hides the empty-state
  message. The list displays its topic, description, priority, and status.
- **E2E-06**: Leading and trailing whitespace is removed from the topic and
  description when a task is saved.
- **E2E-07**: The form supports Low, Medium, and High priorities and To do,
  In progress, Blocked, and Done statuses. The chosen values are displayed
  on the task.
- **E2E-08**: A new task with status Done is completed and shows an Undo
  action. A new task with any other status is not completed and shows a
  Complete action.
- **E2E-09**: After a successful save, the form returns to its empty create
  state with the default priority and status.
- **E2E-10**: Topic and description containing HTML special characters are
  displayed as text, not interpreted as markup.
- **E2E-25**: Task list backgrounds indicate priority: green for Low, blue
  for Medium, and pink for High. High-priority task topics also have a
  distinct highlighted background. Editing a task's priority updates its
  row and topic backgrounds, which remain consistent after completion and
  reload.

## Editing and completion

- **E2E-11**: Edit loads the selected task's current topic, priority, status,
  and description into the form. The heading becomes "Edit Task" and the
  submit button becomes "Update Task".
- **E2E-12**: Updating a task changes its displayed fields without adding
  another task. The form then returns to create mode.
- **E2E-13**: Updating a task's status to Done marks it completed. Changing
  a completed task's status to another value through Edit does **not** clear
  its completed state; it continues to show Undo.
- **E2E-14**: Complete marks a task completed, sets its status to Done, and
  changes the action to Undo.
- **E2E-15**: Undo marks a completed task not completed and changes the
  action to Complete. If its status was Done, the status becomes To do;
  otherwise, its existing status remains unchanged.

## Deletion

- **E2E-16**: Delete asks for confirmation with "Delete this task?". Accepting
  removes only the selected task; cancelling leaves it unchanged.
- **E2E-17**: Deleting the last task restores the empty-state message.

## Ordering and persistence

- **E2E-18**: The list orders incomplete tasks before completed tasks.
- **E2E-19**: Within each completion group, tasks are ordered by priority:
  High, then Medium, then Low.
- **E2E-20**: Within the same completion group and priority, newer tasks
  appear before older tasks. No order is specified for equal creation times.
- **E2E-21**: Creating, editing, completing, undoing, and deleting tasks
  persists the resulting state in browser localStorage under `todo_tasks_v1`.
  Reloading the page restores the saved tasks and their displayed state and
  order, including removals.
- **E2E-22**: If the saved value is malformed JSON or is not an array, the app
  starts with an empty task list.

## Service endpoints

- **E2E-23**: `GET /health` responds with JSON containing `"status": "ok"`.
- **E2E-24**: `GET /version` responds with the application name and version.

The Cypress suite in `cypress/e2e/spec.cy.js` exercises these requirements.
