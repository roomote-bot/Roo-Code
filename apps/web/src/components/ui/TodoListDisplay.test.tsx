import { render, screen, fireEvent } from '@testing-library/react';
import { TodoListDisplay, type TodoItem } from './TodoListDisplay';

describe('TodoListDisplay', () => {
  const mockTodos = [
    {
      id: '1',
      content: 'Complete the feature',
      status: 'completed' as const,
    },
    {
      id: '2',
      content: 'Write tests',
      status: 'in_progress' as const,
    },
    {
      id: '3',
      content: 'Update documentation',
      status: 'pending' as const,
    },
  ];

  it('renders todo list with header and progress', () => {
    render(<TodoListDisplay todos={mockTodos} />);

    expect(screen.getByText('Todo List Updated')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument(); // completed/total
  });

  it('shows current task in collapsed view by default', () => {
    render(<TodoListDisplay todos={mockTodos} />);

    // Should show the in-progress task by default
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    // Should not show other tasks in collapsed view
    expect(screen.queryByText('Complete the feature')).not.toBeInTheDocument();
    expect(screen.queryByText('Update documentation')).not.toBeInTheDocument();
  });

  it('shows all tasks when expanded', () => {
    render(<TodoListDisplay todos={mockTodos} />);

    // Click to expand
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    // Should show all tasks
    expect(screen.getByText('Complete the feature')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Update documentation')).toBeInTheDocument();
  });

  it('applies correct styling for completed items', () => {
    render(<TodoListDisplay todos={mockTodos} />);

    // Expand to see all items
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    const completedItem = screen.getByText('Complete the feature');
    expect(completedItem).toHaveClass('line-through');
  });

  it('shows pending task when no in-progress task exists', () => {
    const todosWithoutInProgress = [
      {
        id: '1',
        content: 'Complete the feature',
        status: 'completed' as const,
      },
      {
        id: '3',
        content: 'Update documentation',
        status: 'pending' as const,
      },
    ];

    render(<TodoListDisplay todos={todosWithoutInProgress} />);

    // Should show the pending task since no in-progress exists
    expect(screen.getByText('Update documentation')).toBeInTheDocument();
  });

  it('renders nothing when todos array is empty', () => {
    const { container } = render(<TodoListDisplay todos={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when todos is undefined', () => {
    const { container } = render(
      <TodoListDisplay todos={undefined as unknown as TodoItem[]} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
