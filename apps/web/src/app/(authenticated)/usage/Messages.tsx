import { useMemo, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Message } from '@/actions/analytics';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/formatters';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { ToolUsageBadge } from '@/components/ui/ToolUsageBadge';
import { TodoListDisplay } from '@/components/ui/TodoListDisplay';
import { parseToolUsage } from '@/lib/toolUsageParser';

// Custom component to render links as plain text to avoid broken/nonsensical links
const PlainTextLink = ({ children }: { children?: React.ReactNode }) => {
  return <span>{children}</span>;
};

type MessagesProps = {
  messages: Message[];
  enableMessageLinks?: boolean;
  shareToken?: string;
};

type SuggestionItem = string | { answer: string };

type QuestionData = {
  question: string;
  suggestions: SuggestionItem[];
};

const parseQuestionData = (text: string): QuestionData | null => {
  try {
    const parsed = JSON.parse(text);

    if (parsed?.question && Array.isArray(parsed.suggest)) {
      return {
        question: parsed.question,
        suggestions: parsed.suggest,
      };
    }
  } catch {
    // Not valid JSON
  }

  return null;
};

type DecoratedMessage = Omit<Message, 'timestamp'> & {
  role: 'user' | 'assistant';
  name: string;
  timestamp: string;
  showHeader?: boolean;
  toolUsage?: ReturnType<typeof parseToolUsage>;
};

// Determine if a message should show its header based on grouping rules
const shouldShowHeader = (
  message: DecoratedMessage,
  index: number,
  messages: DecoratedMessage[],
  groupingWindowMinutes: number,
): boolean => {
  // Always show header for first message or user messages
  if (index === 0 || message.role === 'user') return true;

  const prevMessage = messages[index - 1];
  if (!prevMessage) return true; // Safety check

  // Show header if previous message was from user
  if (prevMessage.role === 'user') return true;

  // Show header if mode changed
  if (message.mode !== prevMessage.mode) return true;

  // Show header if time gap between consecutive messages exceeds threshold
  // Use the original timestamp (number) for calculation
  const currentTime = message.ts;
  const prevTime = prevMessage.ts;
  const gapMinutes = (currentTime - prevTime) / (1000 * 60);

  return gapMinutes > groupingWindowMinutes;
};

// Constant for message grouping window (in minutes)
const GROUPING_WINDOW_MINUTES = 5;

export const Messages = ({
  messages,
  enableMessageLinks = false,
}: MessagesProps) => {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [clickedMessageId, setClickedMessageId] = useState<string | null>(null);

  const { containerRef, scrollToBottom, autoScrollToBottom, userHasScrolled } =
    useAutoScroll<HTMLDivElement>({
      enabled: true,
      threshold: 50,
      scrollBehavior: 'smooth',
    });

  const conversation = useMemo(() => {
    const visibleMessages = messages.filter(isVisible);

    // Remove consecutive duplicates based on timestamp and text
    const deduplicatedMessages = visibleMessages.filter((message, index) => {
      if (index === 0) return true;

      const prevMessage = visibleMessages[index - 1];
      if (!prevMessage) return true; // Safety check, though this shouldn't happen

      return !(
        message.timestamp === prevMessage.timestamp &&
        message.text === prevMessage.text
      );
    });

    // Decorate messages with role, name, and timestamp
    const decoratedMessages = deduplicatedMessages.map((message, index) =>
      decorate({ message, index }),
    );

    // Add grouping information to each message
    return decoratedMessages.map((message, index) => {
      const showHeader = shouldShowHeader(
        message,
        index,
        decoratedMessages,
        GROUPING_WINDOW_MINUTES,
      );

      return {
        ...message,
        showHeader,
      };
    });
  }, [messages]);

  // Handle anchor link clicks
  const handleAnchorClick = (messageId: string) => {
    // Add click animation
    setClickedMessageId(messageId);
    setTimeout(() => setClickedMessageId(null), 200);

    const url = new URL(window.location.href);
    url.hash = `#${messageId}`;

    // Update URL without reload
    window.history.replaceState(null, '', url.toString());

    // Copy to clipboard with enhanced feedback
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        toast.success('Message link copied to clipboard!', {
          description: 'Share this link to highlight this specific message',
          duration: 3000,
        });
      })
      .catch(() => {
        toast.error('Failed to copy link', {
          description: 'Please try again or copy the URL manually',
          duration: 4000,
        });
      });
  };

  // Handle URL hash on mount and highlight message
  useEffect(() => {
    if (enableMessageLinks && window.location.hash) {
      const messageId = window.location.hash.substring(1);
      const element = document.getElementById(messageId);
      if (element) {
        // Small delay to ensure the component is fully rendered
        // Add simple highlight effect immediately
        element.style.transition = 'background-color 0.3s ease-in-out';
        element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';

        // Fade out the highlight after 2 seconds
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 2000);

        // Delay scroll to allow things to load
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 1000);
      }
    }
  }, [enableMessageLinks]);

  // Auto-scroll when new messages arrive or content changes (only if user is at bottom)
  useEffect(() => {
    autoScrollToBottom();
  }, [conversation, autoScrollToBottom]);

  return (
    <div className="relative">
      {/* Scrollable messages container */}
      <div
        ref={containerRef}
        className="pr-2 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--border)) transparent',
        }}
      >
        <div className="space-y-1">
          {conversation.map((message, index) => {
            const isQuestion =
              message.type === 'ask' && message.ask === 'followup';
            const isCommand =
              message.type === 'ask' && message.ask === 'command';
            const isTool = message.type === 'ask' && message.ask === 'tool';
            const questionData =
              isQuestion && message.text
                ? parseQuestionData(message.text)
                : null;

            const messageId = `message-${message.id}`;

            // Parse tool data to check for special cases
            let toolData = null;
            let isNewTask = false;
            if (isTool && message.text) {
              try {
                toolData = JSON.parse(message.text);
                isNewTask = toolData?.tool === 'newTask';
              } catch {
                // Invalid JSON, treat as regular tool message
              }
            }

            // For newTask tool messages, render the full content
            if (isNewTask && toolData) {
              return (
                <div key={message.id} className="py-2">
                  <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-2 border-b border-border">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                        New task created in {toolData.mode} mode
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-sm leading-relaxed markdown-prose text-foreground/90">
                        <ReactMarkdown
                          remarkPlugins={[remarkBreaks]}
                          rehypePlugins={[rehypeSanitize]}
                          components={{
                            a: PlainTextLink,
                            code: CodeBlock,
                          }}
                        >
                          {toolData.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // For subtask_result messages, render with special styling
            if (message.say === 'subtask_result') {
              return (
                <div key={message.id} className="py-2">
                  <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-2 border-b border-border">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16l-4-4m0 0l4-4m-4 4h18"
                          />
                        </svg>
                        Subtask results
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-sm leading-relaxed markdown-prose text-foreground/90">
                        <ReactMarkdown
                          remarkPlugins={[remarkBreaks]}
                          rehypePlugins={[rehypeSanitize]}
                          components={{
                            a: PlainTextLink,
                            code: CodeBlock,
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // For tool messages, render the tool usage badge and todo list if present
            if (isTool) {
              return (
                <div key={message.id} className="py-2 space-y-3">
                  {message.toolUsage?.todoData ? (
                    <TodoListDisplay todos={message.toolUsage.todoData.todos} />
                  ) : (
                    message.toolUsage && (
                      <div className="pl-4">
                        <ToolUsageBadge usage={message.toolUsage} />
                      </div>
                    )
                  )}
                </div>
              );
            }

            return (
              <div
                key={message.id}
                id={messageId}
                className={cn(
                  'flex flex-col relative transition-all duration-200 gap-3 rounded-lg p-4',
                  message.role === 'user'
                    ? 'bg-primary/15 border border-primary/20 shadow-sm'
                    : 'bg-secondary/10',
                  enableMessageLinks && 'hover:shadow-sm hover:bg-opacity-80',
                  // Add extra top margin for messages that start a new group
                  message.showHeader && index > 0 && 'mt-4',
                )}
                onMouseEnter={() =>
                  enableMessageLinks && setHoveredMessageId(messageId)
                }
                onMouseLeave={() =>
                  enableMessageLinks && setHoveredMessageId(null)
                }
              >
                {message.showHeader && (
                  <div
                    className={cn(
                      'flex flex-row items-center justify-between gap-2 text-xs font-medium',
                      message.role === 'user'
                        ? 'text-primary font-semibold'
                        : 'text-muted-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div>{message.name}</div>
                      <div>&middot;</div>
                      <div>{message.timestamp}</div>
                      {message.mode && (
                        <>
                          <div>&middot;</div>
                          <div>{message.mode}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Anchor Link Button - shown on hover for all messages */}
                {enableMessageLinks && hoveredMessageId === messageId && (
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => handleAnchorClick(messageId)}
                      className={cn(
                        'p-1 rounded bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted transition-colors duration-200 cursor-pointer',
                        clickedMessageId === messageId && 'bg-primary/10',
                      )}
                      title="Copy link to this message"
                      type="button"
                    >
                      <Link2
                        className={cn(
                          'h-3 w-3 text-muted-foreground hover:text-primary transition-colors duration-200',
                          clickedMessageId === messageId && 'text-primary',
                        )}
                      />
                    </button>
                  </div>
                )}

                {isQuestion && questionData ? (
                  <div className="space-y-4">
                    {questionData.question && (
                      <div className="text-sm leading-relaxed markdown-prose">
                        <ReactMarkdown
                          remarkPlugins={[remarkBreaks]}
                          rehypePlugins={[rehypeSanitize]}
                          components={{
                            a: PlainTextLink,
                            code: CodeBlock,
                          }}
                        >
                          {questionData.question}
                        </ReactMarkdown>
                      </div>
                    )}
                    {questionData.suggestions &&
                      questionData.suggestions.length > 0 && (
                        <div className="space-y-2">
                          {questionData.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-4 py-3 bg-background border border-border rounded-md text-sm"
                            >
                              {typeof suggestion === 'string'
                                ? suggestion
                                : suggestion.answer}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ) : isCommand ? (
                  <div className="space-y-3">
                    <div className="bg-muted text-muted-foreground p-3 rounded-md font-mono text-sm border border-border">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'text-sm leading-relaxed markdown-prose',
                      message.say === 'completion_result' && 'text-[#89d185]',
                    )}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkBreaks]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        a: PlainTextLink,
                        code: CodeBlock,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button - shown when user has scrolled up */}
      {userHasScrolled && (
        <div className="absolute bottom-4 right-4">
          <button
            className="bg-secondary text-secondary-foreground shadow-lg rounded-full h-10 w-10 p-0 border border-border hover:bg-secondary/80 flex items-center justify-center transition-colors"
            onClick={() => scrollToBottom()}
            title="Scroll to bottom"
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

const decorate = ({
  message,
  index,
}: {
  message: Message;
  index: number;
}): DecoratedMessage => {
  const role: 'user' | 'assistant' =
    index === 0 || message.say === 'user_feedback' ? 'user' : 'assistant';

  const name = role === 'user' ? 'User' : 'Roo Code';
  const timestamp = formatTimestamp(message.timestamp);

  // Parse tool usage for assistant messages
  const toolUsage = role === 'assistant' ? parseToolUsage(message) : null;

  return { ...message, role, name, timestamp, toolUsage };
};

const isVisible = (message: Message) => {
  // Always show followup, command, and tool messages regardless of text content
  if (
    message.type === 'ask' &&
    (message.ask === 'followup' ||
      message.ask === 'command' ||
      message.ask === 'tool')
  ) {
    return true;
  }

  // For other message types, require non-empty text
  return (
    (message.ask === 'text' ||
      message.say === 'text' ||
      message.say === 'completion_result' ||
      message.say === 'subtask_result' ||
      message.say === 'user_feedback') &&
    typeof message.text === 'string' &&
    message.text.length > 0
  );
};
