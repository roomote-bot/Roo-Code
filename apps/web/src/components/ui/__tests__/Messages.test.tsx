import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { Messages } from '@/app/(authenticated)/usage/Messages';
import type { Message } from '@/actions/analytics/messages';

// Mock the hooks and dependencies
vi.mock('@/hooks/useAutoScroll', () => ({
  useAutoScroll: () => ({
    containerRef: { current: null },
    scrollToBottom: vi.fn(),
    autoScrollToBottom: vi.fn(),
    userHasScrolled: false,
  }),
}));

vi.mock('@/lib/formatters', () => ({
  formatTimestamp: (timestamp: number) => new Date(timestamp).toLocaleString(),
}));

describe('Messages Component - Newline Handling', () => {
  const createMockMessage = (text: string, id = '1'): Message => ({
    id,
    orgId: null,
    userId: 'test-user',
    taskId: 'test-task',
    text,
    timestamp: Date.now(),
    ts: Date.now(),
    type: 'say',
    say: 'text',
    ask: null,
    mode: 'code',
    reasoning: null,
    partial: null,
  });

  it('should render messages with newlines properly', () => {
    const messageWithNewlines = createMockMessage('Line 1\nLine 2\nLine 3');

    render(<Messages messages={[messageWithNewlines]} />);

    // The text should be present in the document
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();
  });

  it('should handle multiple consecutive newlines', () => {
    const messageWithMultipleNewlines = createMockMessage(
      'Paragraph 1\n\nParagraph 2\n\n\nParagraph 3',
    );

    render(<Messages messages={[messageWithMultipleNewlines]} />);

    expect(screen.getByText(/Paragraph 1/)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph 2/)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph 3/)).toBeInTheDocument();
  });

  it('should handle mixed content with newlines', () => {
    const mixedContent = createMockMessage(
      'Regular text\n**Bold text**\n`code snippet`\nMore text',
    );

    render(<Messages messages={[mixedContent]} />);

    expect(screen.getByText(/Regular text/)).toBeInTheDocument();
    expect(screen.getByText(/Bold text/)).toBeInTheDocument();
    expect(screen.getByText(/code snippet/)).toBeInTheDocument();
    expect(screen.getByText(/More text/)).toBeInTheDocument();
  });

  it('should handle command messages without markdown processing', () => {
    const commandMessage: Message = {
      id: '1',
      orgId: null,
      userId: 'test-user',
      taskId: 'test-task',
      text: 'npm install\ncd project\nls -la',
      timestamp: Date.now(),
      ts: Date.now(),
      type: 'ask',
      say: null,
      ask: 'command',
      mode: 'code',
      reasoning: null,
      partial: null,
    };

    render(<Messages messages={[commandMessage]} />);

    // Command messages should preserve newlines in the monospace container
    const commandContainer = screen.getByText(/npm install/);
    expect(commandContainer).toBeInTheDocument();
    expect(commandContainer.closest('.font-mono')).toBeInTheDocument();
  });

  it('should handle question data with newlines in the question text', () => {
    const questionMessage: Message = {
      id: '1',
      orgId: null,
      userId: 'test-user',
      taskId: 'test-task',
      text: JSON.stringify({
        question:
          'What would you like to do?\nPlease choose from the options below:\n\n1. Option A\n2. Option B',
        suggest: ['Option A', 'Option B'],
      }),
      timestamp: Date.now(),
      ts: Date.now(),
      type: 'ask',
      say: null,
      ask: 'followup',
      mode: 'code',
      reasoning: null,
      partial: null,
    };

    render(<Messages messages={[questionMessage]} />);

    // Question text should be present and properly formatted
    expect(screen.getByText(/What would you like to do/)).toBeInTheDocument();
    expect(
      screen.getByText(/Please choose from the options below/),
    ).toBeInTheDocument();

    // Should find both the list items and suggestion buttons (multiple instances expected)
    const optionAElements = screen.getAllByText(/Option A/);
    const optionBElements = screen.getAllByText(/Option B/);

    // Should have at least 2 instances of each option (one in markdown list, one in suggestion button)
    expect(optionAElements.length).toBeGreaterThanOrEqual(2);
    expect(optionBElements.length).toBeGreaterThanOrEqual(2);

    // Verify the markdown rendered the numbered list properly
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
