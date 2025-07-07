import { useFormContext } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';

import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';

import type { FormData } from '../types';

export function GitHubPRCommentFields() {
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
        name="payload.prNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>PR Number</FormLabel>
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
        name="payload.prTitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>PR Title</FormLabel>
            <FormControl>
              <Input placeholder="Pull request title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.prBody"
        render={({ field }) => (
          <FormItem>
            <FormLabel>PR Body</FormLabel>
            <FormControl>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Pull request description..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.prBranch"
        render={({ field }) => (
          <FormItem>
            <FormLabel>PR Branch</FormLabel>
            <FormControl>
              <Input placeholder="feature-branch" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="payload.baseRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base Ref</FormLabel>
            <FormControl>
              <Input placeholder="main" {...field} />
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
        name="payload.commentType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comment Type</FormLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {field.value || 'Select comment type'}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                <DropdownMenuItem
                  onClick={() => field.onChange('issue_comment')}
                >
                  Issue Comment
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => field.onChange('review_comment')}
                >
                  Review Comment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
