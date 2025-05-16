import { z } from 'zod';

import { client } from '@/lib/server/analytics';

const usageSchema = z.array(
  z.object({
    userId: z.string(),
    count: z.coerce.number(),
  }),
);

export type Usage = z.infer<typeof usageSchema>;

export const getUsage = async (orgId?: string | null): Promise<Usage> => {
  if (!orgId) {
    return [];
  }

  const resultSet = await client.query({
    query: `
      SELECT userId, COUNT(1) as count
      FROM "events"
      WHERE orgId = {orgId: String}
      GROUP BY 1;
    `,
    format: 'JSONEachRow',
    query_params: { orgId },
  });

  return usageSchema.parse(await resultSet.json());
};
