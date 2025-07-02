/**
 * Configuration for available repositories
 */
export interface RepoConfig {
  /** Human-readable name of the repository */
  name: string;
  /** Absolute path to the repository */
  path: string;
  /** Git remote URL (optional, for validation) */
  remoteUrl?: string;
  /** Default branch name (defaults to 'main') */
  defaultBranch?: string;
}

/**
 * Available repositories configuration
 */
export const REPO_CONFIGS: Record<string, RepoConfig> = {
  'roo-code': {
    name: 'Roo Code',
    path: '/roo/repos/Roo-Code',
    defaultBranch: 'main',
  },
  'roo-code-cloud': {
    name: 'Roo Code Cloud',
    path: '/roo/repos/Roo-Code-Cloud',
    defaultBranch: 'main',
  },
};

/**
 * Get repository configuration by path
 */
export const getRepoConfigByPath = (path: string): RepoConfig | undefined => {
  return Object.values(REPO_CONFIGS).find((config) => config.path === path);
};

/**
 * Get repository configuration by key
 */
export const getRepoConfig = (key: string): RepoConfig | undefined => {
  return REPO_CONFIGS[key];
};

/**
 * Get all available repository paths
 */
export const getAllRepoPaths = (): string[] => {
  return Object.values(REPO_CONFIGS).map((config) => config.path);
};
