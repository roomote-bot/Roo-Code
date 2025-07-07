export const CRITICAL_COMMAND_RESTRICTIONS = `
CRITICAL COMMAND RESTRICTIONS:
- NEVER execute long-running commands like starting servers (npm run dev, npm start, python -m http.server, etc.)
- NEVER execute interactive commands that require user input (interactive prompts, editors like vim/nano, etc.)
- NEVER run commands that will block the terminal or require manual intervention
- Use non-interactive alternatives when possible (e.g., use --yes flags, redirect input, etc.)
`.trim();

export const GIT_WORKFLOW_INSTRUCTIONS = `
IMPORTANT: After completing your changes, please follow this git workflow:
1. Create and push your changes to a new remote branch using: git push origin HEAD:feature/your-branch-name
2. Open a pull request using the GitHub CLI: gh pr create --title "Your PR Title" --body "Description of changes"
3. Include the PR link in your completion message

This ensures all changes are properly tracked and can be reviewed before merging.
`.trim();

export const MAIN_BRANCH_PROTECTION = `
NEVER commit directly to the main branch. Always create a feature branch for your changes.
`.trim();
