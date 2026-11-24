import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTask,
  escapeHtml,
  loadTasks,
  saveTasks,
  sortTasks,
  statusLabel,
  toggleTaskCompletion,
  updateTask,
} from '../public/taskStore.js';

const taskInput = {
  topic: 'Write tests',
  priority: 'medium',
  status: 'todo',
  description: 'Cover task behavior',
};

function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    ...taskInput,
    completed: false,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe('statusLabel', () => {
  it.each([
    ['todo', 'To do'],
    ['in-progress', 'In progress'],
    ['blocked', 'Blocked'],
    ['done', 'Done'],
    ['unknown', 'unknown'],
  ])('displays %s as %s', (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });
});

describe('createTask', () => {
  it.each([
    ['todo', false],
    ['in-progress', false],
    ['blocked', false],
    ['done', true],
  ])('creates a task with status %s and completed %s', (status, completed) => {
    const input = { ...taskInput, status };

    const task = createTask(input, 123);

    expect(task).toEqual({
      ...input,
      id: expect.any(String),
      completed,
      createdAt: 123,
      updatedAt: 123,
    });
    expect(task.id).not.toBe('');
  });
});

describe('updateTask', () => {
  it('updates all editable fields while preserving identity and creation time', () => {
    const original = makeTask();
    const changes = {
      topic: 'Review tests',
      priority: 'high',
      status: 'blocked',
      description: 'Ask for review',
    };

    const updated = updateTask(original, changes, 200);

    expect(updated).toEqual({
      ...original,
      ...changes,
      updatedAt: 200,
    });
    expect(original).toEqual(makeTask());
  });

  it.each([
    [false, 'done', true],
    [false, 'in-progress', false],
    [true, 'blocked', true],
  ])('preserves completion rules when completed is %s and status is %s', (completed, status, expected) => {
    const updated = updateTask(
      makeTask({ completed }),
      { ...taskInput, status },
      200,
    );

    expect(updated).toMatchObject({ status, completed: expected, updatedAt: 200 });
  });
});

describe('toggleTaskCompletion', () => {
  it('marks an incomplete task done without mutating the original', () => {
    const original = makeTask({ status: 'blocked' });

    const completed = toggleTaskCompletion(original, 200);

    expect(completed).toEqual({
      ...original,
      status: 'done',
      completed: true,
      updatedAt: 200,
    });
    expect(original).toEqual(makeTask({ status: 'blocked' }));
  });

  it.each([
    ['done', 'todo'],
    ['blocked', 'blocked'],
  ])('undoes a completed task with status %s to status %s', (status, expectedStatus) => {
    const task = makeTask({ status, completed: true });

    expect(toggleTaskCompletion(task, 200)).toEqual({
      ...task,
      status: expectedStatus,
      completed: false,
      updatedAt: 200,
    });
  });
});

describe('sortTasks', () => {
  it('orders by completion, priority, then creation time without mutating the input', () => {
    const tasks = [
      makeTask({ id: 'done-high', completed: true, priority: 'high', createdAt: 500 }),
      makeTask({ id: 'todo-low', priority: 'low', createdAt: 500 }),
      makeTask({ id: 'todo-high-old', priority: 'high', createdAt: 100 }),
      makeTask({ id: 'done-low', completed: true, priority: 'low', createdAt: 600 }),
      makeTask({ id: 'todo-medium', priority: 'medium', createdAt: 600 }),
      makeTask({ id: 'todo-high-new', priority: 'high', createdAt: 200 }),
      makeTask({ id: 'done-medium', completed: true, priority: 'medium', createdAt: 700 }),
    ];
    const originalOrder = tasks.map((task) => task.id);

    const sorted = sortTasks(tasks);

    expect(sorted.map((task) => task.id)).toEqual([
      'todo-high-new',
      'todo-high-old',
      'todo-medium',
      'todo-low',
      'done-high',
      'done-medium',
      'done-low',
    ]);
    expect(tasks.map((task) => task.id)).toEqual(originalOrder);
  });
});

describe('escapeHtml', () => {
  it('renders special characters as text rather than HTML', () => {
    const text = `<img src="x" onerror='alert(1)'>&`;
    const element = document.createElement('div');

    element.innerHTML = escapeHtml(text);

    expect(element.textContent).toBe(text);
    expect(element.querySelector('img')).toBeNull();
    expect(escapeHtml(text)).toBe('&lt;img src=&quot;x&quot; onerror=&#039;alert(1)&#039;&gt;&amp;');
  });
});

describe('task storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('saves and reloads tasks, including changes and removals', () => {
    const first = makeTask();
    const second = makeTask({ id: 'task-2', topic: 'Another task' });
    saveTasks([first, second]);
    expect(loadTasks()).toEqual([first, second]);

    const updated = updateTask(second, { ...taskInput, status: 'done' }, 200);
    saveTasks([updated]);

    expect(JSON.parse(localStorage.getItem('todo_tasks_v1'))).toEqual([updated]);
    expect(loadTasks()).toEqual([updated]);
  });

  it('returns an empty list when no tasks have been saved', () => {
    expect(loadTasks()).toEqual([]);
  });

  it.each(['{invalid json', '{"topic":"not an array"}', 'null'])(
    'returns an empty list for invalid stored value %s',
    (storedValue) => {
      localStorage.setItem('todo_tasks_v1', storedValue);

      expect(loadTasks()).toEqual([]);
    },
  );

  it('returns an empty list when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    expect(loadTasks()).toEqual([]);
  });

  it('propagates errors when tasks cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    expect(() => saveTasks([makeTask()])).toThrow('Storage unavailable');
  });
});