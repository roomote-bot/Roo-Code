'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type ProviderName } from '@roo-code/types';

import {
  type OrganizationAllowList,
  type OrganizationSettings,
  ORGANIZATION_ALLOW_ALL,
} from '@/types';
import {
  getOrganizationSettings,
  updateOrganization,
} from '@/actions/organizationSettings';
import { Badge, Button, Checkbox, Label } from '@/components/ui';

type ProviderSetting = {
  allowAll: boolean;
  models?: string[];
};

// Define a type for providers record
type ProvidersRecord = Record<ProviderName, ProviderSetting>;

// Provider metadata without state information
const providerMetadata: {
  id: ProviderName;
  name: string;
  models: {
    id: string;
    name: string;
  }[];
}[] = [
  {
    id: 'openai-native',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4o', name: 'GPT-4o' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3 Sonnet' },
      {
        id: 'claude-3-7-sonnet-20250219:thinking',
        name: 'Claude 3 Sonnet Thinking',
      },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
      {
        id: 'anthropic/claude-3.7-sonnet:thinking',
        name: 'Claude 3.7 Sonnet Thinking',
      },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
      { id: 'openai/gpt-4', name: 'GPT-4' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      {
        id: 'google/gemini-2.5-flash-preview',
        name: 'Gemini 2.5 Flash Preview',
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
    ],
  },
];

type ProviderWhitelistFormProps = {
  orgSettings: OrganizationSettings;
  queryClient: ReturnType<typeof useQueryClient>;
};

const ProviderWhitelistForm = ({
  orgSettings,
  queryClient,
}: ProviderWhitelistFormProps) => {
  const t = useTranslations('ProviderWhitelist');

  const [allowList, setAllowList] = useState<OrganizationAllowList>(
    orgSettings?.allowList || ORGANIZATION_ALLOW_ALL,
  );

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAllowAllChecked = () => allowList.allowAll;

  const isProviderChecked = (providerId: ProviderName) => {
    if (allowList.allowAll) return true;
    return allowList.providers[providerId]?.allowAll || false;
  };

  const isModelChecked = (providerId: ProviderName, modelId: string) => {
    if (allowList.allowAll) return true;
    const provider = allowList.providers[providerId];
    if (!provider) return false;
    if (provider.allowAll) return true;
    return provider.models?.includes(modelId) || false;
  };

  const toggleAllowAll = () => {
    const newAllowAll = !allowList.allowAll;

    if (newAllowAll) {
      setAllowList({ allowAll: true, providers: {} });
    } else {
      const newProviders: Partial<ProvidersRecord> = {};

      providerMetadata.forEach((provider) => {
        newProviders[provider.id] = { allowAll: true };
      });

      setAllowList({
        allowAll: false,
        providers: newProviders,
      });
    }

    setHasChanges(true);
  };

  const toggleProvider = (providerId: ProviderName) => {
    if (allowList.allowAll) {
      const newProviders: Partial<ProvidersRecord> = {};

      providerMetadata.forEach((provider) => {
        if (provider.id !== providerId) {
          newProviders[provider.id] = { allowAll: true };
        }
      });

      setAllowList({
        allowAll: false,
        providers: newProviders,
      });
    } else {
      const newProviders = { ...allowList.providers };
      const providersRecord = newProviders;
      const isCurrentlyEnabled = isProviderChecked(providerId);

      if (isCurrentlyEnabled) {
        if (providersRecord[providerId]) {
          providersRecord[providerId] = {
            ...providersRecord[providerId],
            allowAll: false,
            models: [],
          };
        }
      } else {
        providersRecord[providerId] = { allowAll: true };
      }

      setAllowList({ ...allowList, providers: newProviders });
    }

    setHasChanges(true);
  };

  const toggleModel = (providerId: ProviderName, modelId: string) => {
    if (allowList.allowAll || isProviderChecked(providerId)) {
      const newProviders = { ...allowList.providers };
      const providersRecord = newProviders;

      if (allowList.allowAll) {
        providerMetadata.forEach((provider) => {
          providersRecord[provider.id] = { allowAll: true };
        });

        const provider = providerMetadata.find((p) => p.id === providerId);
        if (provider) {
          const models = provider.models
            .filter((m) => m.id !== modelId)
            .map((m) => m.id);

          providersRecord[providerId] = { allowAll: false, models };
        }

        setAllowList({ allowAll: false, providers: newProviders });
      } else {
        const provider = providerMetadata.find((p) => p.id === providerId);
        if (provider) {
          const models = provider.models
            .filter((m) => m.id !== modelId)
            .map((m) => m.id);

          providersRecord[providerId] = { allowAll: false, models };
          setAllowList({ ...allowList, providers: newProviders });
        }
      }
    } else {
      const newProviders = { ...allowList.providers };
      const providersRecord = newProviders;
      const provider = providersRecord[providerId] || {
        allowAll: false,
        models: [],
      };
      const models = provider.models || [];

      const isCurrentlyEnabled = models.includes(modelId);

      if (isCurrentlyEnabled) {
        providersRecord[providerId] = {
          ...provider,
          models: models.filter((m: string) => m !== modelId),
        };
      } else {
        providersRecord[providerId] = {
          ...provider,
          models: [...models, modelId],
        };

        const allModels =
          providerMetadata
            .find((p) => p.id === providerId)
            ?.models.map((m) => m.id) || [];
        const enabledModels = providersRecord[providerId].models || [];

        if (
          allModels.length === enabledModels.length &&
          allModels.every((m) => enabledModels.includes(m))
        ) {
          providersRecord[providerId] = { allowAll: true };
        }
      }

      setAllowList({ ...allowList, providers: newProviders });
    }

    setHasChanges(true);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const result = await updateOrganization({
        allowList: allowList,
      });

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
      <div className="cl-header 🔒️ cl-internal-qo3qk7">
        <div className="cl-internal-1pr5xvn">
          <h1 className="cl-headerTitle 🔒️ cl-internal-190cjq9">
            {t('providers_section_title')}
          </h1>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('providers_section_description')}
      </p>
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="mb-4 flex items-center space-x-2">
            <Checkbox
              id="allow-all-providers"
              checked={isAllowAllChecked()}
              onCheckedChange={toggleAllowAll}
              disabled={isSaving}
            />
            <Label
              htmlFor="allow-all-providers"
              className="text-sm font-medium"
            >
              Allow All Providers
            </Label>
          </div>
          <div className={isAllowAllChecked() ? 'opacity-50' : ''}>
            {providerMetadata.map((provider) => (
              <div key={provider.id} className="mb-4">
                <div className="mb-2 flex items-center space-x-2">
                  <Checkbox
                    id={`provider-${provider.id}`}
                    checked={isProviderChecked(provider.id)}
                    disabled={isAllowAllChecked() || isSaving}
                    onCheckedChange={() => toggleProvider(provider.id)}
                  />
                  <Label
                    htmlFor={`provider-${provider.id}`}
                    className="text-sm font-medium"
                  >
                    {provider.name}
                  </Label>
                </div>
                <div className="ml-6 space-y-2">
                  {provider.models.map((model) => (
                    <div key={model.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`model-${model.id}`}
                        checked={isModelChecked(provider.id, model.id)}
                        disabled={
                          isAllowAllChecked() ||
                          isProviderChecked(provider.id) ||
                          isSaving
                        }
                        onCheckedChange={() =>
                          toggleModel(provider.id, model.id)
                        }
                      />
                      <Label
                        htmlFor={`model-${model.id}`}
                        className={`text-xs ${isAllowAllChecked() || !isProviderChecked(provider.id) ? 'text-muted-foreground' : ''}`}
                      >
                        {model.name}
                      </Label>
                    </div>
                  ))}
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
            {isSaving ? (
              <>
                <span className="mr-2">Saving...</span>
                <span className="animate-spin">⟳</span>
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export const ProviderWhitelist = () => {
  const queryClient = useQueryClient();

  const { data: orgSettings } = useQuery({
    queryKey: ['getOrganizationSettings'],
    queryFn: getOrganizationSettings,
  });

  if (!orgSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-2xl">⟳</div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <ProviderWhitelistForm
      orgSettings={orgSettings}
      queryClient={queryClient}
    />
  );
};
