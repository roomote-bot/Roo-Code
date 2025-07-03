import { z } from 'zod';

export const jobTokenPayloadSchema = z.object({
  iss: z.string().min(1, 'Issuer (iss) is required'),
  sub: z.string().min(1, 'Subject (sub) is required'), // CloudJob ID
  exp: z.number().int().positive('Expiration (exp) must be a positive integer'),
  iat: z.number().int().positive('Issued at (iat) must be a positive integer'),
  nbf: z.number().int().positive('Not before (nbf) must be a positive integer'),
  v: z.literal(1, { errorMap: () => ({ message: 'Version must be 1' }) }),
  r: z.object({
    u: z.string().min(1, 'User ID is required'),
    o: z.string().optional(), // Organization ID (optional)
    t: z.literal('cj', {
      errorMap: () => ({ message: 'Token type must be "cj"' }),
    }),
  }),
});

export type JobTokenPayload = z.infer<typeof jobTokenPayloadSchema>;

export interface JobTokenContext {
  jobId: string;
  userId: string;
  orgId?: string;
  tokenType: 'cj';
  version: number;
}
