import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

import type { Message } from '@/types/analytics';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/formatters';

type MessagesProps = {
  messages: Message[];
};

export const Messages = ({ messages }: MessagesProps) => {
  const conversation = useMemo(
    () =>
      messages
        .filter(isVisible)
        .map((message, index) => decorate({ message, index })),
    [messages],
  );

  return (
    <div className="space-y-4">
      {conversation.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex flex-col gap-2 rounded-lg p-3',
            message.role === 'user' ? 'bg-primary/10' : 'bg-secondary/10',
          )}
        >
          <div className="flex flex-row items-center justify-between gap-1 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1">
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
          <div className="text-sm markdown-prose">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        </div>
      ))}
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

const isVisible = (message: Message) =>
  (message.ask === 'text' ||
    message.say === 'text' ||
    message.say === 'completion_result' ||
    message.say === 'user_feedback') &&
  typeof message.text === 'string' &&
  message.text.length > 0;
