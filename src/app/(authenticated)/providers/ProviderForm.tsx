import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ProviderName } from '@roo-code/types';

import { type OrganizationSettings, ORGANIZATION_ALLOW_ALL } from '@/types';
import { providers } from '@/lib/providers';
import { updateOrganization } from '@/actions/organizationSettings';
import { Badge, Button, Checkbox, Label } from '@/components/ui';
import { MultipleSelector } from '@/components/ui/ecosystem';
import { Loading } from '@/components/layout';

type ProviderFormProps = {
  orgSettings: OrganizationSettings;
};

export const ProviderForm = ({ orgSettings }: ProviderFormProps) => {
  const queryClient = useQueryClient();

  const fullProviderMetadata = useMemo(
    () =>
      providers.map((provider) => {
        const models = orgSettings.allowList.providers[provider.id]?.models;

        if (models) {
          const providerModels = new Set(provider.models);

          const difference = models.filter(
            (model) => !providerModels.has(model),
          );

          if (difference.length > 0) {
            return {
              ...provider,
              models: [...provider.models, ...difference],
            };
          }
        }

        return provider;
      }),
    [orgSettings],
  );

  const [allowAll, setAllowAll] = useState(orgSettings.allowList.allowAll);

  const [providerAllowAll, setProviderAllowAll] = useState(
    Object.entries(orgSettings.allowList.providers).reduce(
      (acc, [provider, providerSettings]) => {
        if (providerSettings.allowAll) {
          acc.add(provider);
        }

        return acc;
      },
      new Set<string>(),
    ),
  );

  const [providerModels, setProviderModels] = useState(
    fullProviderMetadata.reduce((acc, meta) => {
      acc.set(meta.id, orgSettings.allowList.providers[meta.id]?.models || []);
      return acc;
    }, new Map<ProviderName, string[]>()),
  );

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isProviderAllowAll = (providerId: ProviderName) =>
    providerAllowAll.has(providerId);

  const toggleAllowAll = () => {
    setAllowAll(!allowAll);

    setHasChanges(true);
  };

  const toggleProvider = (providerId: ProviderName) => {
    const newProviderAllowAll = new Set(providerAllowAll);

    if (providerAllowAll.has(providerId)) {
      newProviderAllowAll.delete(providerId);
    } else {
      newProviderAllowAll.add(providerId);
    }

    setProviderAllowAll(newProviderAllowAll);
    setHasChanges(true);
  };

  const setModels = (providerId: ProviderName, models: string[]) => {
    const newProviderModels = new Map(providerModels);
    newProviderModels.set(providerId, models);
    setProviderModels(newProviderModels);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    setIsSaving(true);

    try {
      let allowList;

      if (allowAll) {
        allowList = ORGANIZATION_ALLOW_ALL;
      } else {
        allowList = {
          allowAll: false,
          providers: fullProviderMetadata.reduce(
            (acc, meta) => {
              if (providerAllowAll.has(meta.id)) {
                acc[meta.id] = { allowAll: true };
              } else {
                const models = providerModels.get(meta.id);

                if (models && models.length > 0) {
                  acc[meta.id] = { allowAll: false, models: models };
                }
              }

              return acc;
            },
            {} as Record<
              ProviderName,
              { allowAll: boolean; models?: string[] }
            >,
          ),
        };
      }

      const result = await updateOrganization({ allowList: allowList });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings');
      }

      queryClient.invalidateQueries({ queryKey: ['organizationSettings'] });

      toast.success('Provider settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save provider settings', error);
      toast.error('Failed to save provider settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center space-x-2">
        <Checkbox
          id="allow-all-providers"
          checked={allowAll}
          onCheckedChange={toggleAllowAll}
          disabled={isSaving}
        />
        <Label htmlFor="allow-all-providers" className="text-sm font-medium">
          Allow All Providers
        </Label>
      </div>
      <div className={allowAll ? 'opacity-50' : ''}>
        {fullProviderMetadata.map((provider) => (
          <div key={provider.id} className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">{provider.label}</div>
              <div className="flex items-center space-x-2">
                <Label htmlFor={`provider-${provider.id}`} className="text-sm">
                  Allow all models
                </Label>
                <Checkbox
                  id={`provider-${provider.id}`}
                  checked={isProviderAllowAll(provider.id)}
                  disabled={allowAll || isSaving}
                  onCheckedChange={() => toggleProvider(provider.id)}
                />
              </div>
            </div>
            <div className="max-w-full">
              <MultipleSelector
                defaultOptions={provider.models.map((model) => ({
                  label: model,
                  value: model,
                  disable: providerModels.get(provider.id)?.includes(model),
                }))}
                value={(providerModels.get(provider.id) || []).map((model) => ({
                  label: model,
                  value: model,
                }))}
                creatable
                disabled={allowAll || isSaving}
                placeholder="Pick models..."
                onChange={(options) =>
                  setModels(
                    provider.id,
                    options.map((option) => option.value),
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2 pt-2">
        <Badge variant="outline" className="text-xs">
          {`Policy v${orgSettings?.version || 1}`}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isSaving
            ? 'Updating provider whitelist...'
            : hasChanges
              ? 'You have unsaved changes'
              : 'Changes will be pushed to SSE stream within 30 seconds'}
        </span>
      </div>
      <Button
        onClick={saveChanges}
        disabled={!hasChanges || isSaving}
        className="mt-4"
      >
        {isSaving ? <Loading /> : 'Save Changes'}
      </Button>
    </>
  );
};
