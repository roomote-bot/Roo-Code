'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cloud } from 'lucide-react';

import type { OrganizationSettings, OrganizationCloudSettings } from '@/types';
import { updateOrganization } from '@/actions/organizationSettings';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui';
import { Loading } from '@/components/layout';

type FormData = {
  recordTaskMessages: boolean;
};

type TelemetryFormProps = {
  orgSettings: OrganizationSettings;
};

export const TelemetryForm = ({ orgSettings }: TelemetryFormProps) => {
  const queryClient = useQueryClient();
  const t = useTranslations('TelemetrySettings');
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      recordTaskMessages:
        orgSettings.cloudSettings?.recordTaskMessages ?? false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);

    try {
      const cloudSettings: OrganizationCloudSettings = {
        recordTaskMessages: data.recordTaskMessages,
      };

      const result = await updateOrganization({ cloudSettings });

      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['getOrganizationSettings'],
        });
        toast.success('Cloud settings saved successfully');
      } else {
        throw new Error(result.error || 'An unexpected error occurred.');
      }
    } catch (error) {
      console.error('Failed to update cloud settings:', error);
      toast.error('Failed to save cloud settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                    <FormLabel>{t('record_task_messages')}</FormLabel>
                    <FormDescription>
                      {t('record_task_messages_description')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
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
