import { useQuery } from '@tanstack/react-query';

import { QueryKey } from '@/types';

import { getDynamicRouterModels } from '@/lib/server/models';

export const dynamicRouters = [
  'openrouter',
  'requesty',
  'unbound',
  'glama',
] as const;

export type DynamicRouter = (typeof dynamicRouters)[number];

export const useDynamicRouterModels = () =>
  useQuery({
    queryKey: [QueryKey.GetDynamicRouterModels],
    queryFn: () => getDynamicRouterModels(),
  });

export const isDynamicRouter = (key: string): key is DynamicRouter =>
  dynamicRouters.includes(key as DynamicRouter);
