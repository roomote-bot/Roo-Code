'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cloud, Share } from 'lucide-react';

import type {
  OrganizationSettings,
  OrganizationCloudSettings,
} from '@roo-code/types';

import { QueryKey } from '@/types';
import { updateOrganization } from '@/actions/organizationSettings';
import { DEFAULT_SHARE_EXPIRATION_DAYS } from '@/lib/task-sharing';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from '@/components/ui';
import { Loading } from '@/components/layout';

type FormData = {
  recordTaskMessages: boolean;
  enableTaskSharing: boolean;
  taskShareExpirationDays: number;
};

type SettingsFormProps = {
  orgSettings: OrganizationSettings;
};

export const SettingsForm = ({ orgSettings }: SettingsFormProps) => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      recordTaskMessages:
        orgSettings.cloudSettings?.recordTaskMessages ?? false,
      enableTaskSharing: orgSettings.cloudSettings?.enableTaskSharing ?? false,
      taskShareExpirationDays:
        orgSettings.cloudSettings?.taskShareExpirationDays ??
        DEFAULT_SHARE_EXPIRATION_DAYS,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);

    try {
      const cloudSettings: OrganizationCloudSettings = {
        recordTaskMessages: data.recordTaskMessages,
        enableTaskSharing: data.enableTaskSharing,
        taskShareExpirationDays: data.taskShareExpirationDays,
      };

      await updateOrganization({ cloudSettings });

      queryClient.invalidateQueries({
        queryKey: [QueryKey.GetOrganizationSettings],
      });

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Task Recording Section */}
        <div className="space-y-4 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Cloud className="size-5" />
            <h2 className="text-lg font-medium">Task Recording</h2>
          </div>
          <div className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="recordTaskMessages"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Record task messages</FormLabel>
                    <FormDescription>
                      When enabled, task messages and interactions will be
                      recorded.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Task Sharing Section */}
        <div className="space-y-4 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Share className="size-5" />
            <h2 className="text-lg font-medium">Task Sharing</h2>
          </div>
          <div className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="enableTaskSharing"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable task sharing</FormLabel>
                    <FormDescription>
                      Allow users to create shareable links for tasks that can
                      be viewed by other organization members.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch('enableTaskSharing') && (
              <FormField
                control={form.control}
                name="taskShareExpirationDays"
                render={({ field }) => (
                  <FormItem className="rounded-md border p-4">
                    <FormLabel>Share Link Expiration (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          const validValue = isNaN(value)
                            ? DEFAULT_SHARE_EXPIRATION_DAYS
                            : Math.max(1, Math.min(365, value));
                          field.onChange(validValue);
                        }}
                        disabled={isSaving}
                        className="w-32"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of days before shared links expire (1-365 days).
                      Default is {DEFAULT_SHARE_EXPIRATION_DAYS} days.
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 border-t pt-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loading /> : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
