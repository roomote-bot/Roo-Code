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

export function GitHubIssueFixFields() {
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
              <Input placeholder="owner/repository" {...field} />
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
        name="payload.issue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Issue Number</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="123"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Issue Title</FormLabel>
            <FormControl>
              <Input placeholder="Issue title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.body"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Issue Body</FormLabel>
            <FormControl>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Issue description..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
