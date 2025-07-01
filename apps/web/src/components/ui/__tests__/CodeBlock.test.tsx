import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { CodeBlock } from '../CodeBlock';

// Mock the SyntaxHighlighter component
vi.mock('../SyntaxHighlighter', () => ({
  SyntaxHighlighter: ({
    code,
    language,
    className,
  }: {
    code: string;
    language: string;
    className?: string;
  }) => (
    <div
      data-testid="syntax-highlighter"
      data-language={language}
      className={className}
    >
      {code || ''}
    </div>
  ),
}));

// Mock the MermaidDiagram component
vi.mock('../MermaidDiagram', () => ({
  MermaidDiagram: ({
    chart,
    className,
  }: {
    chart: string;
    className?: string;
  }) => (
    <div data-testid="mermaid-diagram" className={className}>
      {chart}
    </div>
  ),
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light">
      {component}
    </ThemeProvider>,
  );
};

describe('CodeBlock', () => {
  it('renders inline code as regular code element', () => {
    renderWithTheme(<CodeBlock>const x = 1;</CodeBlock>);

    const codeElement = screen.getByText(/const/).closest('code');
    expect(codeElement?.tagName).toBe('CODE');
  });

  it('renders mermaid code blocks using MermaidDiagram component', () => {
    const mermaidCode = `graph TD
    A[Start] --> B{Is it working?}`;

    renderWithTheme(
      <CodeBlock className="language-mermaid">{mermaidCode}</CodeBlock>,
    );

    expect(screen.getByTestId('mermaid-diagram')).toBeInTheDocument();
  });

  it('renders code blocks with language using SyntaxHighlighter', () => {
    renderWithTheme(
      <CodeBlock className="language-javascript">
        console.log(&apos;test&apos;);
      </CodeBlock>,
    );

    const syntaxHighlighter = screen.getByTestId('syntax-highlighter');
    expect(syntaxHighlighter).toBeInTheDocument();
    expect(syntaxHighlighter).toHaveAttribute('data-language', 'javascript');
  });

  it('renders text language using SyntaxHighlighter', () => {
    renderWithTheme(
      <CodeBlock className="language-text">This is plain text</CodeBlock>,
    );

    const syntaxHighlighter = screen.getByTestId('syntax-highlighter');
    expect(syntaxHighlighter).toBeInTheDocument();
    expect(syntaxHighlighter).toHaveAttribute('data-language', 'text');
  });

  it('renders inline code when no language is specified', () => {
    renderWithTheme(<CodeBlock>Some code without language</CodeBlock>);

    const codeElement = screen
      .getByText(/Some code without language/)
      .closest('code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement?.tagName).toBe('CODE');
  });
});
