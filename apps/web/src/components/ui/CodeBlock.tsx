'use client';

import { MermaidDiagram } from './MermaidDiagram';
import { SyntaxHighlighter } from './SyntaxHighlighter';

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  className?: string;
}

export const CodeBlock = ({
  children,
  className,
  ...props
}: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  // No language = inline code (from `backticks`)
  if (!match) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // Mermaid diagrams
  if (language === 'mermaid') {
    return <MermaidDiagram chart={code} className="my-2" />;
  }

  // Code blocks with syntax highlighting
  return (
    <SyntaxHighlighter code={code} language={language || ''} className="my-2" />
  );
};
