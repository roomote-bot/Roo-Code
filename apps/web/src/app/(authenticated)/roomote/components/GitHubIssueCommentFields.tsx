import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@/components/ui';

import type { FormData } from '../types';

export function GitHubIssueCommentFields() {
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
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.issueNumber"
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
        name="payload.issueTitle"
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
        name="payload.issueBody"
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

      <FormField
        control={control}
        name="payload.commentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comment ID</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="456"
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
        name="payload.commentBody"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comment Body</FormLabel>
            <FormControl>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Comment content..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.commentAuthor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comment Author</FormLabel>
            <FormControl>
              <Input placeholder="username" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.commentUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comment URL</FormLabel>
            <FormControl>
              <Input placeholder="https://github.com/..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
