import type { CloudJobWithUser } from '@/actions/roomote';

export function getJobTitle(job: CloudJobWithUser): string {
  switch (job.type) {
    case 'github.issue.fix': {
      const payload = job.payload as {
        repo: string;
        issue: number;
        title: string;
        body: string;
        labels?: string[];
      };

      return `Fix issue #${payload.issue} in ${payload.repo}`;
    }
    case 'github.issue.comment.respond': {
      const payload = job.payload as {
        repo: string;
        issueNumber: number;
        issueTitle: string;
        issueBody: string;
        commentId: number;
        commentBody: string;
        commentAuthor: string;
        commentUrl: string;
      };

      return `Respond to comment in ${payload.repo}#${payload.issueNumber}`;
    }
    case 'github.pr.comment.respond': {
      const payload = job.payload as {
        repo: string;
        prNumber: number;
        prTitle: string;
        prBody: string;
        prBranch: string;
        baseRef: string;
        commentId: number;
        commentBody: string;
        commentAuthor: string;
        commentType: 'issue_comment' | 'review_comment';
        commentUrl: string;
      };

      return `Respond to PR comment in ${payload.repo}#${payload.prNumber}`;
    }
    case 'general.task': {
      const payload = job.payload as {
        repo: string;
        description: string;
      };

      return `${payload.repo}: ${payload.description.substring(0, 50)}${payload.description.length > 50 ? '...' : ''}`;
    }
    default:
      return 'Unknown job type';
  }
}
