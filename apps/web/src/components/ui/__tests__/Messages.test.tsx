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
});
