import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@/components/ui';

import type { FormData } from '../types';

export function GeneralTaskFields() {
  const { control } = useFormContext<FormData>();

  return (
    <>
      <FormField
        control={control}
        name="payload.repo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Repository</FormLabel>
            <FormControl>
              <Input
                placeholder="owner/repository"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              GitHub repository in format: owner/repository
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Task Description</FormLabel>
            <FormControl>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe what you want Roomote to do..."
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              Provide a detailed description of the task you want Roomote to
              perform
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
