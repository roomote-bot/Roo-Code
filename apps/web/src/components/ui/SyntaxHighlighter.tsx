'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki';

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  className?: string;
}

// Cache for the highlighter instance
let highlighterCache: HighlighterGeneric<BundledLanguage, BundledTheme> | null =
  null;
let highlighterPromise: Promise<
  HighlighterGeneric<BundledLanguage, BundledTheme>
> | null = null;

// Common languages to preload for better performance
const COMMON_LANGUAGES: BundledLanguage[] = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'python',
  'java',
  'go',
  'rust',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'xml',
  'markdown',
  'bash',
  'shell',
  'sql',
  'dockerfile',
];

const getHighlighter = async () => {
  if (highlighterCache) {
    return highlighterCache;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = (async () => {
    const { createHighlighter } = await import('shiki');

    const highlighter = await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: COMMON_LANGUAGES,
    });

    highlighterCache = highlighter;
    return highlighter;
  })();

  return highlighterPromise;
};

export const SyntaxHighlighter = ({
  code,
  language,
  className,
}: SyntaxHighlighterProps) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const shikiTheme = currentTheme === 'dark' ? 'github-dark' : 'github-light';

  const highlightCode = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const highlighter = await getHighlighter();

      // Check if the language is supported, fallback to 'text' if not
      const supportedLanguages = highlighter.getLoadedLanguages();
      const langToUse = supportedLanguages.includes(language as BundledLanguage)
        ? (language as BundledLanguage)
        : 'text';

      // If the language isn't loaded yet, try to load it
      if (!supportedLanguages.includes(langToUse) && langToUse !== 'text') {
        try {
          await highlighter.loadLanguage(langToUse);
        } catch {
          // If loading fails, fall back to text
        }
      }

      const html = highlighter.codeToHtml(code, {
        lang: langToUse,
        theme: shikiTheme,
        transformers: [
          {
            pre(node) {
              // Remove default background and padding since we'll handle it with CSS
              if (node.properties.style) {
                node.properties.style = (node.properties.style as string)
                  .replace(/background-color:[^;]+;?/g, '')
                  .replace(/padding:[^;]+;?/g, '');
              }
            },
          },
        ],
      });

      setHighlightedCode(html);
    } catch (err) {
      console.error('Failed to highlight code:', err);
      setError('Failed to highlight code');
    } finally {
      setIsLoading(false);
    }
  }, [code, language, shikiTheme]);

  useEffect(() => {
    highlightCode();
  }, [highlightCode]);

  if (error) {
    // Fallback to plain code if highlighting fails
    return (
      <pre
        className={`bg-muted p-3 rounded overflow-x-auto ${className || ''}`}
      >
        <code className="bg-transparent p-0 font-mono text-sm">{code}</code>
      </pre>
    );
  }

  if (isLoading) {
    // Show loading state with plain code
    return (
      <pre
        className={`bg-muted p-3 rounded overflow-x-auto ${className || ''}`}
      >
        <code className="bg-transparent p-0 font-mono text-sm opacity-70">
          {code}
        </code>
      </pre>
    );
  }

  return (
    <div
      className={`bg-muted p-3 rounded overflow-x-auto [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
};
