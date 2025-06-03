'use client';

import { useState } from 'react';
import { Copy, Share, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import type { TaskWithUser } from '@/actions/analytics';
import type { TaskShare } from '@/actions/taskSharing';
import {
  createTaskShare,
  deleteTaskShare,
  getTaskShares,
} from '@/actions/taskSharing';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import {
  createShareUrl,
  DEFAULT_SHARE_EXPIRATION_DAYS,
} from '@/lib/taskSharing';
import { copyToClipboard } from '@/lib/clipboard';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

type ShareButtonProps = {
  task: TaskWithUser;
};

export const ShareButton = ({ task }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shares, setShares] = useState<TaskShare[]>([]);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);

  const { data: orgSettings } = useOrganizationSettings();

  const expirationDays =
    orgSettings?.cloudSettings?.taskShareExpirationDays ??
    DEFAULT_SHARE_EXPIRATION_DAYS;

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
    }
  };

  const handleCreateShare = async () => {
    setIsCreating(true);
    try {
      const response = await createTaskShare({ taskId: task.taskId });

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Task</DialogTitle>
          <DialogDescription>
            Create a link to share this task with your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Share */}
          {newShareUrl ? (
            <div className="space-y-3">
              <div className="p-3 border rounded-md">
                <p className="text-sm font-medium mb-2">Share link created!</p>
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
            </div>
          ) : (
            <Button
              onClick={handleCreateShare}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? 'Creating...' : 'Create Share Link'}
            </Button>
          )}

          {/* Existing Shares */}
          {shares.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Previous Links ({shares.length})
              </h4>
              <div className="space-y-2">
                {shares.slice(0, 3).map((share) => {
                  const shareUrl = createShareUrl(share.shareToken);
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          Created{' '}
                          {new Date(share.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(shareUrl)}
                        >
                          <Copy className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShare(share.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {shares.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{shares.length - 3} more links
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Simple Info */}
          <p className="text-xs text-muted-foreground">
            Links expire in {expirationDays} days and are only accessible to
            your organization members.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
