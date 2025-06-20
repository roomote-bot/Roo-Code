import { z } from 'zod';

export enum TaskShareVisibility {
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

export const createTaskShareSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  expirationDays: z.number().int().positive().max(365).optional(),
  visibility: z
    .nativeEnum(TaskShareVisibility)
    .default(TaskShareVisibility.ORGANIZATION),
});

export type CreateTaskShareRequest = z.infer<typeof createTaskShareSchema>;

export const shareIdSchema = z.string().uuid('Invalid share ID format');

export type ShareId = z.infer<typeof shareIdSchema>;

export type SharedByUser = {
  id: string;
  name: string;
  email: string;
};
