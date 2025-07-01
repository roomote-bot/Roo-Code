'use client';

import { useEffect, useState, useRef } from 'react';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export const MermaidDiagram = ({
  chart,
  className = '',
}: MermaidDiagramProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Reset mounted flag when component mounts
    isMountedRef.current = true;

    const renderDiagram = async () => {
      if (!chart.trim()) {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMountedRef.current) {
          setIsLoading(true);
          setError(null);
          setSvgContent('');
        }

        const mermaid = (await import('mermaid')).default;

        // Check if component is still mounted after async import
        if (!isMountedRef.current) return;

        // Configure mermaid with base theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          suppressErrorRendering: true,
        });

        // Generate unique ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, chart);

        // Check if component is still mounted after async render
        if (!isMountedRef.current) return;

        setSvgContent(svg);
        setIsLoading(false);
      } catch (err) {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : 'Failed to render diagram',
          );
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    // Cleanup function to mark component as unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, [chart]);

  return (
    <div
      className={`mermaid-diagram bg-background border border-border rounded-md p-4 overflow-x-auto ${className}`}
      style={{
        color: 'inherit',
        minHeight: '100px',
      }}
    >
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="text-yellow-800 text-sm font-medium mb-2">
            Mermaid Diagram Error
          </div>
          <div className="text-yellow-700 text-xs font-mono">{error}</div>
          <details className="mt-2">
            <summary className="text-yellow-600 text-xs cursor-pointer hover:text-yellow-800">
              Show diagram source
            </summary>
            <pre className="mt-2 text-xs bg-yellow-50 p-2 rounded border border-yellow-200 overflow-x-auto">
              <code>{chart}</code>
            </pre>
          </details>
        </div>
      )}

      {isLoading && !error && (
        <div className="flex items-center justify-center min-h-[100px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
        </div>
      )}

      {svgContent && !isLoading && !error && (
        <div className="relative">
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className={`mermaid-svg-container transition-all duration-300 cursor-pointer ${
              isExpanded ? '' : 'max-h-96 overflow-hidden'
            }`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Click to collapse' : 'Click to expand'}
          />
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
          <div className="mt-2 text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:bg-muted"
            >
              {isExpanded ? '↑ Collapse diagram' : '↓ Expand diagram'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
