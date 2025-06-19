'use server';

import { unstable_cache } from 'next/cache';
import z from 'zod';

const fetchProviderModels = async <T>({
  url,
  schema,
}: {
  url: string;
  schema: z.ZodSchema<T>;
}): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    console.error(response);
    throw new Error('Failed to fetch provider models');
  }

  return schema.parse(await response.json());
};

const fetchOpenRouterModels = async () => {
  const result = await fetchProviderModels({
    url: 'https://openrouter.ai/api/v1/models',
    schema: z.object({
      data: z.array(z.object({ id: z.string() })),
    }),
  });

  return result.data.map(({ id }) => id);
};

const fetchRequestyModels = async () => {
  const result = await fetchProviderModels({
    url: 'https://router.requesty.ai/v1/models',
    schema: z.object({
      data: z.array(z.object({ id: z.string() })),
    }),
  });

  return result.data.map(({ id }) => id);
};

const fetchUnboundModels = async () => {
  const result = await fetchProviderModels({
    url: 'https://api.getunbound.ai/models',
    schema: z.record(z.string(), z.any()),
  });

  return Object.keys(result.data);
};

const fetchGlamaModels = async () => {
  const result = await fetchProviderModels({
    url: 'https://glama.ai/api/gateway/v1/models',
    schema: z.array(z.object({ id: z.string() })),
  });

  return result.map(({ id }) => id);
};

export const getDynamicRouterModels = unstable_cache(
  async () => {
    const [openRouterModels, requestyModels, unboundModels, glamaModels] =
      await Promise.all([
        fetchOpenRouterModels().catch(() => []),
        fetchRequestyModels().catch(() => []),
        fetchUnboundModels().catch(() => []),
        fetchGlamaModels().catch(() => []),
      ]);

    return {
      openrouter: openRouterModels,
      requesty: requestyModels,
      unbound: unboundModels,
      glama: glamaModels,
    };
  },
  ['getDynamicRouterModels'],
  {
    revalidate: 60 * 60,
    tags: ['getDynamicRouterModels'],
  },
);
