'use client';

import { useState } from 'react';
import {
  Copy,
  Share,
  Trash2,
  ExternalLink,
  Users,
  Globe,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

import type { TaskShare } from '@roo-code-cloud/db';

import { TaskShareVisibility } from '@/types/task-sharing';
import type { TaskWithUser } from '@/actions/analytics';
import {
  createTaskShare,
  deleteTaskShare,
  getTaskShares,
} from '@/actions/taskSharing';
import {
  createShareUrl,
  DEFAULT_SHARE_EXPIRATION_DAYS,
} from '@/lib/task-sharing';
import { copyToClipboard } from '@/lib/clipboard';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Badge,
} from '@/components/ui';

type ShareButtonProps = {
  task: TaskWithUser;
};

export const ShareButton = ({ task }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shares, setShares] = useState<TaskShare[]>([]);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<TaskShareVisibility>(
    TaskShareVisibility.ORGANIZATION,
  );

  const { orgId } = useAuth();
  const { data: orgSettings } = useOrganizationSettings();

  const expirationDays = !orgId
    ? 30 // Fixed 30 days for personal accounts
    : (orgSettings?.cloudSettings?.taskShareExpirationDays ??
      DEFAULT_SHARE_EXPIRATION_DAYS);

  const loadShares = async () => {
    try {
      const taskShares = await getTaskShares(task.taskId);
      setShares(taskShares);
    } catch (error) {
      console.error('Error loading shares:', error);
      toast.error('Failed to load existing shares');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadShares();
      setNewShareUrl(null);
      // Set appropriate default visibility based on context
      setVisibility(
        !orgId ? TaskShareVisibility.PUBLIC : TaskShareVisibility.ORGANIZATION,
      );
    }
  };

  const handleCreateShare = async () => {
    setIsCreating(true);
    try {
      const response = await createTaskShare({
        taskId: task.taskId,
        visibility,
      });

      if (response.success && response.data) {
        setNewShareUrl(response.data.shareUrl);
        // Automatically copy the link to clipboard
        await handleCopyLink(response.data.shareUrl);
        toast.success('Share link created and copied to clipboard!');
        await loadShares(); // Refresh the shares list
      } else {
        toast.error(response.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      const response = await deleteTaskShare(shareId);

      if (response.success) {
        toast.success('Share link deleted successfully');
        await loadShares(); // Refresh the shares list
        if (newShareUrl) {
          setNewShareUrl(null); // Clear the new share URL if it was deleted
        }
      } else {
        toast.error(response.error || 'Failed to delete share link');
      }
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error('Failed to delete share link');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share className="size-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Task</DialogTitle>
          <DialogDescription>
            {newShareUrl
              ? 'Your share link is ready to use.'
              : visibility === TaskShareVisibility.PUBLIC
                ? 'Create a public link that anyone can access.'
                : 'Create a link to share this task with your team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Share */}
          {newShareUrl ? (
            <div className="space-y-4">
              <div className="p-4 border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-shrink-0">
                    <Check className="size-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Share link created!
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      handleCopyLink(newShareUrl);
                    }}
                    size="sm"
                    className="flex-1"
                    type="button"
                  >
                    <Copy className="size-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(newShareUrl, '_blank')}
                    type="button"
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setNewShareUrl(null)}
                className="w-full"
              >
                Create Another Link
              </Button>
            </div>
          ) : (
            <>
              {/* Visibility Selector - only show for organization accounts */}
              {orgId && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Who can access this link?
                  </Label>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibility(TaskShareVisibility.ORGANIZATION)
                      }
                      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                        visibility === TaskShareVisibility.ORGANIZATION
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 mt-0.5 ${
                          visibility === TaskShareVisibility.ORGANIZATION
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <Users className="size-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            Organization
                          </span>
                          {visibility === TaskShareVisibility.ORGANIZATION && (
                            <Check className="size-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Only members of your organization can view
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibility(TaskShareVisibility.PUBLIC)}
                      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                        visibility === TaskShareVisibility.PUBLIC
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 mt-0.5 ${
                          visibility === TaskShareVisibility.PUBLIC
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <Globe className="size-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            Public
                          </span>
                          {visibility === TaskShareVisibility.PUBLIC && (
                            <Check className="size-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Anyone with the link can view
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreateShare}
                disabled={isCreating}
                className="w-full h-11 text-base font-medium"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share className="size-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
            </>
          )}

          {/* Existing Shares */}
          {shares.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Previous Links ({shares.length})
              </h4>
              <div className="space-y-2">
                {shares.slice(0, 3).map((share) => {
                  const shareUrl = createShareUrl(share.shareToken);
                  return (
                    <div
                      key={share.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {share.visibility === TaskShareVisibility.PUBLIC ? (
                          <Globe className="size-4 text-muted-foreground" />
                        ) : (
                          <Users className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">
                            Created{' '}
                            {new Date(share.createdAt).toLocaleDateString()}
                          </p>
                          {share.visibility === TaskShareVisibility.PUBLIC && (
                            <Badge variant="secondary" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(shareUrl)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShare(share.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {shares.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{shares.length - 3} more links
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Simple Info */}
          {!newShareUrl && (
            <p className="text-xs text-muted-foreground">
              Links expire in {expirationDays} days
              {visibility === TaskShareVisibility.ORGANIZATION
                ? ' and are only accessible to your organization members.'
                : '. Anyone with the link will be able to view this task.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
