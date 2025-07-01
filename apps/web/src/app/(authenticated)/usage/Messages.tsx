import { useMemo, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Message } from '@/actions/analytics';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/formatters';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { CodeBlock } from '@/components/ui/CodeBlock';

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

    return deduplicatedMessages.map((message, index) =>
      decorate({ message, index }),
    );
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
        className="space-y-6 pr-2 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--border)) transparent',
        }}
      >
        {conversation.map((message) => {
          const isQuestion =
            message.type === 'ask' && message.ask === 'followup';
          const isCommand = message.type === 'ask' && message.ask === 'command';
          const questionData =
            isQuestion && message.text ? parseQuestionData(message.text) : null;

          const messageId = `message-${message.id}`;

          return (
            <div
              key={message.id}
              id={messageId}
              className={cn(
                'flex flex-col gap-3 rounded-lg p-4 relative transition-all duration-200',
                message.role === 'user' ? 'bg-primary/10' : 'bg-secondary/10',
                enableMessageLinks && 'hover:shadow-sm hover:bg-opacity-80',
              )}
              onMouseEnter={() =>
                enableMessageLinks && setHoveredMessageId(messageId)
              }
              onMouseLeave={() =>
                enableMessageLinks && setHoveredMessageId(null)
              }
            >
              <div className="flex flex-row items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div>{message.name}</div>
                  <div>&middot;</div>
                  <div>{message.timestamp}</div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Anchor Link Button */}
                  {enableMessageLinks && hoveredMessageId === messageId && (
                    <button
                      onClick={() => handleAnchorClick(messageId)}
                      className={cn(
                        'p-1 rounded hover:bg-muted transition-colors duration-200 cursor-pointer',
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
                  )}
                  {message.mode && (
                    <div className="px-2 py-1 bg-muted rounded text-xs font-medium">
                      {message.mode}
                    </div>
                  )}
                </div>
              </div>

              {isQuestion && questionData ? (
                <div className="space-y-4">
                  {questionData.question && (
                    <div className="text-sm leading-relaxed">
                      {questionData.question}
                    </div>
                  )}
                  {questionData.suggestions &&
                    questionData.suggestions.length > 0 && (
                      <div className="space-y-2">
                        {questionData.suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 bg-background border border-border rounded-md text-sm hover:bg-muted/50 cursor-pointer transition-colors"
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
                  <div className="bg-black/90 text-foreground p-3 rounded-md font-mono text-sm">
                    {message.text}
                  </div>
                </div>
              ) : (
                <div className="text-sm leading-relaxed markdown-prose">
                  <ReactMarkdown
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

const decorate = ({ message, index }: { message: Message; index: number }) => {
  const role =
    index === 0 || message.say === 'user_feedback' ? 'user' : 'assistant';

  const name = role === 'user' ? 'User' : 'Roo Code';
  const timestamp = formatTimestamp(message.timestamp);

  return { ...message, role, name, timestamp };
};

const isVisible = (message: Message) => {
  // Always show followup and command messages regardless of text content
  if (
    message.type === 'ask' &&
    (message.ask === 'followup' || message.ask === 'command')
  ) {
    return true;
  }

  // For other message types, require non-empty text
  return (
    (message.ask === 'text' ||
      message.say === 'text' ||
      message.say === 'completion_result' ||
      message.say === 'user_feedback') &&
    typeof message.text === 'string' &&
    message.text.length > 0
  );
};
