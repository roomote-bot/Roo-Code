import { useMemo } from 'react';

import type { ProviderName } from '@roo-code/types';

import { PROVIDERS } from '@/lib/providers';

import { useOrganizationSettings } from './useOrganizationSettings';
import {
  useDynamicRouterModels,
  isDynamicRouter,
} from './useDynamicRouterModels';

export const useAvailableProviders = () => {
  const { data: organizationSettings } = useOrganizationSettings();
  const { data: dynamicRouterModels } = useDynamicRouterModels();

  const allowList = organizationSettings?.allowList;

  const availableProviders = useMemo(
    () =>
      allowList
        ? Object.entries(PROVIDERS)
            .map(([id, { models, ...provider }]) => {
              const providerId = id as ProviderName;

              if (
                isDynamicRouter(providerId) &&
                dynamicRouterModels?.[providerId]
              ) {
                models = dynamicRouterModels[providerId];
              }

              const set = new Set(models);

              return {
                ...provider,
                models: [
                  ...models,
                  // Make sure we include models that are already persisted in the
                  // database even if they are no longer available on the provider.
                  ...(allowList.providers[providerId]?.models ?? []).filter(
                    (model) => !set.has(model),
                  ),
                ],
              };
            })
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [allowList, dynamicRouterModels],
  );

  return { availableProviders, allowList };
};
