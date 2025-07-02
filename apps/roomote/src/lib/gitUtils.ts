import simpleGit from 'simple-git';
import * as fs from 'node:fs';

import type { Logger } from './logger';
import { findGitRoot } from './utils';
import type { RepoConfig } from './repoConfig';

/**
 * Performs a git pull operation on the specified repository
 * @param repoPath - The path to the repository
 * @param logger - Logger instance for logging operations
 * @returns Promise that resolves when git pull is complete
 */
export const gitPullRepo = async (
  repoPath: string,
  logger?: Logger,
): Promise<void> => {
  try {
    // Verify the path exists
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    // Find the git root to ensure we're in a git repository
    const gitRoot = findGitRoot(repoPath);
    logger?.info(`Found git repository at: ${gitRoot}`);

    // Initialize simple-git with the repository path
    const git = simpleGit(gitRoot);

    // Check if we're in a clean state (no uncommitted changes)
    const status = await git.status();

    if (!status.isClean()) {
      logger?.warn(`Repository has uncommitted changes: ${gitRoot}`);
      logger?.warn(
        'Uncommitted changes:',
        status.files
          .map((f) => `${f.index}${f.working_dir} ${f.path}`)
          .join('\n'),
      );
      // Continue with pull anyway, but log the warning
    }

    // Get current branch
    const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
    logger?.info(`Current branch: ${currentBranch}`);

    // Perform git pull
    logger?.info(`Pulling latest changes for ${gitRoot}...`);
    const pullResult = await git.pull();

    logger?.info(`Git pull completed successfully`);
    if (pullResult.summary.changes) {
      logger?.info(
        `Git pull summary: ${pullResult.summary.changes} changes, ${pullResult.summary.insertions} insertions, ${pullResult.summary.deletions} deletions`,
      );
    } else {
      logger?.info('Repository is already up to date');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error(`Failed to pull repository ${repoPath}: ${errorMessage}`);
    throw new Error(`Git pull failed for ${repoPath}: ${errorMessage}`);
  }
};

/**
 * Performs git pull on a repository using its configuration
 * @param repoConfig - Repository configuration
 * @param logger - Logger instance for logging operations
 */
export const gitPullRepoFromConfig = async (
  repoConfig: RepoConfig,
  logger?: Logger,
): Promise<void> => {
  logger?.info(`Updating repository: ${repoConfig.name} (${repoConfig.path})`);
  await gitPullRepo(repoConfig.path, logger);
};

/**
 * Performs git pull on all configured repositories
 * @param repoConfigs - Array of repository configurations
 * @param logger - Logger instance for logging operations
 */
export const gitPullAllRepos = async (
  repoConfigs: RepoConfig[],
  logger?: Logger,
): Promise<void> => {
  logger?.info(
    `Pulling latest changes for all ${repoConfigs.length} configured repositories`,
  );

  for (const repoConfig of repoConfigs) {
    try {
      await gitPullRepoFromConfig(repoConfig, logger);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger?.error(
        `Failed to pull repository ${repoConfig.name}: ${errorMessage}`,
      );
      // Continue with other repositories even if one fails
    }
  }

  logger?.info('Completed pulling all configured repositories');
};
