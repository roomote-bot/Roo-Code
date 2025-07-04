import { describe, it, expect } from 'vitest';
import {
  parseToolUsage,
  extractToolUsageFromAsk,
  formatToolUsage,
} from '../toolUsageParser';

describe('toolUsageParser', () => {
  describe('extractToolUsageFromAsk', () => {
    it('should extract tool usage from ask=tool messages', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"editedExistingFile","path":"src/components/Button.tsx","isOutsideWorkspace":false,"isProtected":false,"diff":"@@ -1,3 +1,5 @@\\n import React from \'react\';\\n+import { cn } from \'@/lib/utils\';\\n \\n export const Button = () => {\\n+  return <button className={cn(\'btn\')}>Click me</button>;\\n };"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Edited',
        details: 'src/components/Button.tsx',
      });
    });

    it('should handle createdNewFile tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"createdNewFile","path":"src/newfile.ts"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Created',
        details: 'src/newfile.ts',
      });
    });

    it('should handle readFile tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"readFile","path":"src/app.ts"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Read',
        details: 'src/app.ts',
      });
    });

    it('should handle readFile tool with single batchFile', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"readFile","batchFiles":[{"path":"src/app.ts","lineSnippet":"","isOutsideWorkspace":false,"key":"src/app.ts","content":"/path/to/src/app.ts"}]}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Read',
        details: 'src/app.ts',
      });
    });

    it('should handle readFile tool with multiple batchFiles', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"readFile","batchFiles":[{"path":"turbo.json","lineSnippet":"","isOutsideWorkspace":false,"key":"turbo.json","content":"/path/to/turbo.json"},{"path":"tsconfig.json","lineSnippet":"","isOutsideWorkspace":false,"key":"tsconfig.json","content":"/path/to/tsconfig.json"},{"path":"CHANGELOG.md","lineSnippet":"","isOutsideWorkspace":false,"key":"CHANGELOG.md","content":"/path/to/CHANGELOG.md"}]}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Read',
        details: '3 files (turbo.json, ...)',
      });
    });

    it('should handle newFileCreated tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"newFileCreated","path":"test-file-1.js","content":"// Test File 1\\nfunction greet(name) {\\n    return \\"Hello \\" + name;\\n}\\n\\nmodule.exports = { greet };","isOutsideWorkspace":false,"isProtected":false}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Created',
        details: 'test-file-1.js',
      });
    });

    it('should handle appliedDiff tool with single file', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"appliedDiff","path":"single-file.js","isProtected":false}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Edited',
        details: 'single-file.js',
      });
    });

    it('should handle appliedDiff tool with multiple batchDiffs', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"appliedDiff","batchDiffs":[{"path":"test-file-1.js","changeCount":1,"key":"test-file-1.js (1 change)"},{"path":"test-file-2.js","changeCount":1,"key":"test-file-2.js (1 change)"},{"path":"test-file-3.js","changeCount":1,"key":"test-file-3.js (1 change)"}],"isProtected":false}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Edited',
        details: '3 files (test-file-1.js, ...)',
      });
    });

    it('should handle listFilesTopLevel tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"listFilesTopLevel","path":"Roo-Code-3","isOutsideWorkspace":false,"content":"CHANGELOG.md\\nCODE_OF_CONDUCT.md\\nCONTRIBUTING.md\\npackage.json\\napps/\\npackages/"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Listed',
        details: 'Roo-Code-3',
      });
    });

    it('should handle listFilesRecursive tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"listFilesRecursive","path":"src/core/tools","isOutsideWorkspace":false,"content":"accessMcpResourceTool.ts\\napplyDiffTool.ts\\naskFollowupQuestionTool.ts\\n__tests__/"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Listed',
        details: 'src/core/tools',
      });
    });

    it('should handle codebaseSearch tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"codebaseSearch","query":"authentication"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Searched',
        details: '"authentication"',
      });
    });

    it('should handle codebaseSearch tool without query', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"codebaseSearch"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Searched',
      });
    });

    it('should handle searchFiles tool', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"searchFiles","regex":"function.*test"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Grepped',
        details: 'function.*test',
      });
    });

    it('should handle searchFiles tool without regex', () => {
      const message = {
        ask: 'tool',
        text: '{"tool":"searchFiles"}',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toEqual({
        action: 'Grepped',
      });
    });

    it('should return null for non-tool messages', () => {
      const message = {
        ask: 'text',
        text: 'Some regular text',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const message = {
        ask: 'tool',
        text: 'invalid json',
      };

      const result = extractToolUsageFromAsk(message);

      expect(result).toBeNull();
    });
  });

  describe('parseToolUsage', () => {
    it('should return null for non-tool messages', () => {
      const message = {
        text: 'Some regular text',
        say: 'api_req_started',
        ask: null,
      };

      const result = parseToolUsage(message);

      expect(result).toBeNull();
    });

    it('should parse ask=tool messages', () => {
      const message = {
        text: '{"tool":"readFile","path":"src/app.ts"}',
        say: 'api_req_started',
        ask: 'tool',
      };

      const result = parseToolUsage(message);

      expect(result).toEqual({ action: 'Read', details: 'src/app.ts' });
    });

    it('should handle empty message', () => {
      const message = { text: null, say: null };
      const result = parseToolUsage(message);

      expect(result).toBeNull();
    });
  });

  describe('formatToolUsage', () => {
    it('should format tool usage with details', () => {
      const usage = { action: 'Read', details: 'Messages.tsx' as const };
      expect(formatToolUsage(usage)).toBe('Read Messages.tsx');
    });

    it('should format tool usage without details', () => {
      const usage = { action: 'Searched' as const };
      expect(formatToolUsage(usage)).toBe('Searched');
    });
  });
});
