'use client';

import { MermaidDiagram } from './MermaidDiagram';
import type { Element } from 'hast';

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  className?: string;
  inline?: boolean;
  node?: Element;
}

export const CodeBlock = ({
  children,
  className,
  inline,
  ...props
}: CodeBlockProps) => {
  // Extract language from className (format: "language-xxx")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // Convert children to string
  const code = String(children).replace(/\n$/, '');

  // If it's inline code or not mermaid, render as regular code
  if (inline || language !== 'mermaid') {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // If it's a mermaid code block, render with MermaidDiagram
  if (language === 'mermaid') {
    return <MermaidDiagram chart={code} className="my-4" />;
  }

  // Fallback to regular code block
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
