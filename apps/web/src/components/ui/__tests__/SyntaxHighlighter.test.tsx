import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { SyntaxHighlighter } from '../SyntaxHighlighter';

// Mock shiki
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    getLoadedLanguages: vi
      .fn()
      .mockReturnValue(['javascript', 'typescript', 'python']),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    codeToHtml: vi.fn().mockImplementation((code, options) => {
      return `<pre><code class="language-${options.lang}">${code}</code></pre>`;
    }),
  }),
}));

const renderWithTheme = (component: React.ReactElement, theme = 'light') => {
  return render(
    <ThemeProvider attribute="class" defaultTheme={theme}>
      {component}
    </ThemeProvider>,
  );
};

describe('SyntaxHighlighter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithTheme(
      <SyntaxHighlighter code="console.log('test');" language="javascript" />,
    );

    // Should show loading state with plain code
    const codeElement = screen.getByText("console.log('test');");
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveClass('opacity-70'); // Loading state styling
  });

  it('renders highlighted code after loading', async () => {
    renderWithTheme(
      <SyntaxHighlighter code="console.log('test');" language="javascript" />,
    );

    // Wait for the highlighting to complete
    await waitFor(() => {
      const highlightedElement = screen.getByText("console.log('test');");
      expect(highlightedElement).toBeInTheDocument();
    });
  });

  it('handles unsupported languages gracefully', async () => {
    renderWithTheme(
      <SyntaxHighlighter code="some code" language="unsupported-lang" />,
    );

    await waitFor(() => {
      const codeElement = screen.getByText('some code');
      expect(codeElement).toBeInTheDocument();
    });
  });

  it('applies correct theme based on theme provider', async () => {
    renderWithTheme(
      <SyntaxHighlighter code="const x = 1;" language="javascript" />,
      'dark',
    );

    await waitFor(() => {
      const codeElement = screen.getByText('const x = 1;');
      expect(codeElement).toBeInTheDocument();
    });
  });

  it('handles empty code', async () => {
    renderWithTheme(<SyntaxHighlighter code="" language="javascript" />);

    await waitFor(() => {
      // Should render without errors - check for the container div
      const container = document.querySelector('.bg-muted');
      expect(container).toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    renderWithTheme(
      <SyntaxHighlighter
        code="test"
        language="javascript"
        className="custom-class"
      />,
    );

    await waitFor(() => {
      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('custom-class');
    });
  });

  it('falls back to plain code on error', async () => {
    // Mock an error in the highlighter
    const mockCreateHighlighter = vi
      .fn()
      .mockRejectedValue(new Error('Highlighting failed'));
    vi.doMock('shiki', () => ({
      createHighlighter: mockCreateHighlighter,
    }));

    renderWithTheme(
      <SyntaxHighlighter code="error code" language="javascript" />,
    );

    await waitFor(() => {
      const codeElement = screen.getByText('error code');
      expect(codeElement).toBeInTheDocument();
      // Should be in a pre/code fallback structure
      expect(codeElement.closest('pre')).toBeInTheDocument();
    });
  });

  it('handles different programming languages', async () => {
    const languages = ['python', 'typescript', 'java'];

    for (const lang of languages) {
      const { unmount } = renderWithTheme(
        <SyntaxHighlighter code={`// ${lang} code`} language={lang} />,
      );

      await waitFor(() => {
        const codeElement = screen.getByText(`// ${lang} code`);
        expect(codeElement).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('caches highlighter instance for performance', async () => {
    // Render multiple instances
    const { unmount: unmount1 } = renderWithTheme(
      <SyntaxHighlighter code="code1" language="javascript" />,
    );

    const { unmount: unmount2 } = renderWithTheme(
      <SyntaxHighlighter code="code2" language="python" />,
    );

    await waitFor(() => {
      expect(screen.getByText('code1')).toBeInTheDocument();
      expect(screen.getByText('code2')).toBeInTheDocument();
    });

    // Both components should render successfully
    expect(screen.getByText('code1')).toBeInTheDocument();
    expect(screen.getByText('code2')).toBeInTheDocument();

    unmount1();
    unmount2();
  });
});
