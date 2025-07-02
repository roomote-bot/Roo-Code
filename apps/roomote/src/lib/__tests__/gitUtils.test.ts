import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

import {
  gitPullRepo,
  gitPullRepoFromConfig,
  gitPullAllRepos,
} from '../gitUtils';
import { Logger } from '../logger';
import type { RepoConfig } from '../repoConfig';

// Mock simple-git
const mockGit = {
  status: vi.fn(),
  revparse: vi.fn(),
  pull: vi.fn(),
};

vi.mock('simple-git', () => ({
  default: vi.fn(() => mockGit),
}));

// Mock dependencies
vi.mock('node:fs');
vi.mock('../utils', () => ({
  findGitRoot: vi.fn(),
}));

const mockFs = vi.mocked(fs);
const mockFindGitRoot = vi.mocked(await import('../utils')).findGitRoot;
const mockSimpleGit = vi.mocked(await import('simple-git')).default;

describe('gitUtils', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
      close: vi.fn(),
      logStream: undefined,
      logFilePath: '/test/log.txt',
      tag: 'test',
      initializeLogger: vi.fn(),
      writeToLog: vi.fn(),
    } as unknown as Logger;
  });

  describe('gitPullRepo', () => {
    it('should successfully pull from a clean repository', async () => {
      const repoPath = '/test/repo';
      const gitRoot = '/test/repo';

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockReturnValue(gitRoot);

      // Mock git status (clean)
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: [],
      });

      // Mock git branch
      mockGit.revparse.mockResolvedValue('main');

      // Mock git pull
      mockGit.pull.mockResolvedValue({
        summary: {
          changes: 1,
          insertions: 5,
          deletions: 2,
        },
      });

      await gitPullRepo(repoPath, mockLogger);

      expect(mockSimpleGit).toHaveBeenCalledWith(gitRoot);
      expect(mockGit.status).toHaveBeenCalled();
      expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'HEAD']);
      expect(mockGit.pull).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Git pull completed successfully',
      );
    });

    it('should warn about uncommitted changes but continue', async () => {
      const repoPath = '/test/repo';
      const gitRoot = '/test/repo';

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockReturnValue(gitRoot);

      // Mock git status (dirty)
      mockGit.status.mockResolvedValue({
        isClean: () => false,
        files: [{ index: ' ', working_dir: 'M', path: 'file.txt' }],
      });

      // Mock git branch
      mockGit.revparse.mockResolvedValue('main');

      // Mock git pull
      mockGit.pull.mockResolvedValue({
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
        },
      });

      await gitPullRepo(repoPath, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Repository has uncommitted changes'),
      );
      expect(mockGit.pull).toHaveBeenCalled();
    });

    it('should throw error if repository path does not exist', async () => {
      const repoPath = '/nonexistent/repo';

      mockFs.existsSync.mockReturnValue(false);

      await expect(gitPullRepo(repoPath, mockLogger)).rejects.toThrow(
        'Repository path does not exist: /nonexistent/repo',
      );
    });

    it('should throw error if git pull fails', async () => {
      const repoPath = '/test/repo';
      const gitRoot = '/test/repo';

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockReturnValue(gitRoot);

      // Mock git status (clean)
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: [],
      });

      // Mock git branch
      mockGit.revparse.mockResolvedValue('main');

      // Mock git pull failure
      mockGit.pull.mockRejectedValue(new Error('Network error'));

      await expect(gitPullRepo(repoPath, mockLogger)).rejects.toThrow(
        'Git pull failed for /test/repo: Network error',
      );
    });

    it('should handle repository already up to date', async () => {
      const repoPath = '/test/repo';
      const gitRoot = '/test/repo';

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockReturnValue(gitRoot);

      // Mock git status (clean)
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: [],
      });

      // Mock git branch
      mockGit.revparse.mockResolvedValue('main');

      // Mock git pull with no changes
      mockGit.pull.mockResolvedValue({
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
        },
      });

      await gitPullRepo(repoPath, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Repository is already up to date',
      );
    });
  });

  describe('gitPullRepoFromConfig', () => {
    it('should pull repository using config', async () => {
      const repoConfig: RepoConfig = {
        name: 'Test Repo',
        path: '/test/repo',
        defaultBranch: 'main',
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockReturnValue('/test/repo');

      // Mock successful git operations
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: [],
      });
      mockGit.revparse.mockResolvedValue('main');
      mockGit.pull.mockResolvedValue({
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
        },
      });

      await gitPullRepoFromConfig(repoConfig, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Updating repository: Test Repo (/test/repo)',
      );
    });
  });

  describe('gitPullAllRepos', () => {
    it('should pull all repositories successfully', async () => {
      const repoConfigs: RepoConfig[] = [
        {
          name: 'Repo 1',
          path: '/test/repo1',
          defaultBranch: 'main',
        },
        {
          name: 'Repo 2',
          path: '/test/repo2',
          defaultBranch: 'main',
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockImplementation((path) => path);

      // Mock successful git operations
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: [],
      });
      mockGit.revparse.mockResolvedValue('main');
      mockGit.pull.mockResolvedValue({
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
        },
      });

      await gitPullAllRepos(repoConfigs, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Pulling latest changes for all 2 configured repositories',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed pulling all configured repositories',
      );
      expect(mockSimpleGit).toHaveBeenCalledTimes(2);
    });

    it('should continue with other repositories if one fails', async () => {
      const repoConfigs: RepoConfig[] = [
        {
          name: 'Repo 1',
          path: '/test/repo1',
          defaultBranch: 'main',
        },
        {
          name: 'Repo 2',
          path: '/test/repo2',
          defaultBranch: 'main',
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFindGitRoot.mockImplementation((path) => path);

      // Mock first repo to fail, second to succeed
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: [],
      });
      mockGit.revparse.mockResolvedValue('main');
      mockGit.pull
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          summary: {
            changes: 0,
            insertions: 0,
            deletions: 0,
          },
        });

      await gitPullAllRepos(repoConfigs, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to pull repository Repo 1: Git pull failed for /test/repo1: Network error',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed pulling all configured repositories',
      );
    });
  });
});
