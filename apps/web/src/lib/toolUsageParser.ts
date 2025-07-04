/**
 * Tool usage parser for extracting and formatting tool usage from messages
 */

export type ToolUsage = {
  action: string;
  details?: string;
};

/**
 * Extract tool usage from ask=tool messages
 */
export function extractToolUsageFromAsk(message: {
  ask?: string | null;
  text?: string | null;
}): ToolUsage | null {
  if (message.ask !== 'tool' || !message.text) return null;

  try {
    const toolData = JSON.parse(message.text);
    const tool = toolData.tool;
    const path = toolData.path;
    const query = toolData.query;
    const regex = toolData.regex;

    switch (tool) {
      case 'codebaseSearch':
        return {
          action: 'Searched',
          details: query ? `"${query}"` : undefined,
        };
      case 'editedExistingFile':
        return {
          action: 'Edited',
          details: path || undefined,
        };
      case 'createdNewFile':
        return {
          action: 'Created',
          details: path || undefined,
        };
      case 'readFile':
        // Handle batch files (multiple reads)
        if (toolData.batchFiles && Array.isArray(toolData.batchFiles)) {
          const fileCount = toolData.batchFiles.length;
          const firstFile = toolData.batchFiles[0]?.path || 'file';
          if (fileCount === 1) {
            return {
              action: 'Read',
              details: firstFile,
            };
          } else {
            return {
              action: 'Read',
              details: `${fileCount} files (${firstFile}, ...)`,
            };
          }
        }
        // Handle single file read
        return {
          action: 'Read',
          details: path || undefined,
        };
      case 'searchFiles':
        return {
          action: 'Grepped',
          details: regex || query || 'pattern',
        };
      case 'listFiles':
        return {
          action: 'Listed',
          details: path || undefined,
        };
      case 'listFilesTopLevel':
        return {
          action: 'Listed',
          details: path || undefined,
        };
      case 'listFilesRecursive':
        return {
          action: 'Listed',
          details: path || undefined,
        };
      case 'newFileCreated':
        return {
          action: 'Created',
          details: path || undefined,
        };
      case 'appliedDiff':
        // Handle batch diffs (multiple file edits)
        if (toolData.batchDiffs && Array.isArray(toolData.batchDiffs)) {
          const fileCount = toolData.batchDiffs.length;
          const firstFile = toolData.batchDiffs[0]?.path || 'file';
          if (fileCount === 1) {
            return {
              action: 'Edited',
              details: firstFile,
            };
          } else {
            return {
              action: 'Edited',
              details: `${fileCount} files (${firstFile}, ...)`,
            };
          }
        }
        // Handle single file diff
        return {
          action: 'Edited',
          details: path || undefined,
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Parse tool usage from a message
 * Since there can only be one tool usage per message, this returns a single ToolUsage or null
 */
export function parseToolUsage(message: {
  text?: string | null;
  say?: string | null;
  ask?: string | null;
}): ToolUsage | null {
  // Extract from ask=tool messages
  return extractToolUsageFromAsk(message);
}

/**
 * Format tool usage for display
 */
export function formatToolUsage(usage: ToolUsage): string {
  if (usage.details) {
    return `${usage.action} ${usage.details}`;
  }
  return usage.action;
}
