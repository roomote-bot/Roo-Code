import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

import type { Message } from '@/actions/analytics';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/formatters';

type MessagesProps = {
  messages: Message[];
};

type QuestionData = {
  question: string;
  suggestions: string[];
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

export const Messages = ({ messages }: MessagesProps) => {
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

  return (
    <div className="space-y-6">
      {conversation.map((message) => {
        const isQuestion = message.type === 'ask' && message.ask === 'followup';
        const isCommand = message.type === 'ask' && message.ask === 'command';
        const questionData =
          isQuestion && message.text ? parseQuestionData(message.text) : null;

        return (
          <div
            key={message.id}
            className={cn(
              'flex flex-col gap-3 rounded-lg p-4',
              message.role === 'user' ? 'bg-primary/10' : 'bg-secondary/10',
            )}
          >
            <div className="flex flex-row items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <div>{message.name}</div>
                <div>&middot;</div>
                <div>{message.timestamp}</div>
              </div>
              {message.mode && (
                <div className="px-2 py-1 bg-muted rounded text-xs font-medium">
                  {message.mode}
                </div>
              )}
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
                          {suggestion}
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
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            )}
          </div>
        );
      })}
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
