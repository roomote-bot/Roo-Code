'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  updateAllowAllProviders,
  updateModelStatus,
  updateProviderStatus,
} from '@/actions/providerWhitelist';
import { Badge, Checkbox, Label } from '@/components/ui';
import { toast } from 'sonner';

const initialProviders = [
  {
    id: 'openai',
    name: 'OpenAI',
    enabled: true,
    models: [
      { id: 'gpt-4', name: 'GPT-4', enabled: true },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', enabled: true },
      { id: 'gpt-4o', name: 'GPT-4o', enabled: false },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    enabled: true,
    models: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus', enabled: true },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', enabled: true },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', enabled: false },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    enabled: false,
    models: [
      { id: 'mistral-large', name: 'Mistral Large', enabled: false },
      { id: 'mistral-medium', name: 'Mistral Medium', enabled: false },
      { id: 'mistral-small', name: 'Mistral Small', enabled: false },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    enabled: false,
    models: [
      { id: 'command-r', name: 'Command R', enabled: false },
      { id: 'command-r-plus', name: 'Command R+', enabled: false },
    ],
  },
];

export const ProviderWhitelist = () => {
  const t = useTranslations('ProviderWhitelist');

  const [providers, setProviders] = useState(initialProviders);
  const [policyVersion] = useState(1);
  const [allowAllProviders, setAllowAllProviders] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Common error handling function for API calls.
  const handleApiError = (error: unknown, errorMessage: string) => {
    console.error(errorMessage, error);
    toast.error(errorMessage);
    setIsUpdating(false);
  };

  const toggleAllowAllProviders = async () => {
    const previousAllowAllProviders = allowAllProviders;
    const previousProviders = [...providers];
    const newAllowAllProviders = !allowAllProviders;
    setAllowAllProviders(newAllowAllProviders);

    let updatedProviders = providers;

    if (newAllowAllProviders) {
      // Enable all providers and their models/
      updatedProviders = providers.map((provider) => ({
        ...provider,
        enabled: true,
        models: provider.models.map((model) => ({ ...model, enabled: true })),
      }));

      setProviders(updatedProviders);
    }

    // Call API to update backend with the changed allow all providers setting.
    setIsUpdating(true);

    try {
      const result = await updateAllowAllProviders({
        allowAllProviders: newAllowAllProviders,
        policyVersion,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update setting');
      }
    } catch (error) {
      setAllowAllProviders(previousAllowAllProviders);
      setProviders(previousProviders);
      handleApiError(
        error,
        'Failed to update allow all providers setting. Please try again.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleProvider = async (providerId: string) => {
    if (allowAllProviders) {
      return;
    }

    // Find the provider to get its current state.
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const previousProviders = [...providers];
    const newEnabled = !provider.enabled;

    const updatedProviders = providers.map((provider) => {
      if (provider.id === providerId) {
        return {
          ...provider,
          enabled: newEnabled,
          // If provider is disabled, disable all its models
          models: provider.models.map((model) => ({
            ...model,
            enabled: newEnabled ? model.enabled : false,
          })),
        };
      }
      return provider;
    });

    setProviders(updatedProviders);

    // Call API to update backend with the changed provider status
    setIsUpdating(true);
    try {
      const result = await updateProviderStatus({
        providerId,
        enabled: newEnabled,
        policyVersion,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update provider status');
      }
    } catch (error) {
      setProviders(previousProviders);
      handleApiError(
        error,
        'Failed to update provider status. Please try again.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleModel = async (providerId: string, modelId: string) => {
    if (allowAllProviders) {
      return;
    }

    // Find the model to get its current state.
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const model = provider.models.find((m) => m.id === modelId);
    if (!model) return;

    const previousProviders = [...providers];
    const newEnabled = !model.enabled;

    const updatedProviders = providers.map((provider) => {
      return provider.id === providerId
        ? {
            ...provider,
            models: provider.models.map((model) =>
              model.id === modelId ? { ...model, enabled: newEnabled } : model,
            ),
          }
        : provider;
    });

    setProviders(updatedProviders);
    setIsUpdating(true);

    try {
      const result = await updateModelStatus({
        providerId,
        modelId,
        enabled: newEnabled,
        policyVersion,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update model status');
      }
    } catch (error) {
      setProviders(previousProviders);
      handleApiError(error, 'Failed to update model status. Please try again.');
    } finally {
      setIsUpdating(false);
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
              checked={allowAllProviders}
              onCheckedChange={toggleAllowAllProviders}
            />
            <Label
              htmlFor="allow-all-providers"
              className="text-sm font-medium"
            >
              Allow All Providers
            </Label>
          </div>
          <div className={allowAllProviders ? 'opacity-50' : ''}>
            {providers.map((provider) => (
              <div key={provider.id} className="mb-4">
                <div className="mb-2 flex items-center space-x-2">
                  <Checkbox
                    id={`provider-${provider.id}`}
                    checked={provider.enabled}
                    disabled={allowAllProviders}
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
                        checked={allowAllProviders || model.enabled}
                        disabled={allowAllProviders || !provider.enabled}
                        onCheckedChange={() =>
                          toggleModel(provider.id, model.id)
                        }
                      />
                      <Label
                        htmlFor={`model-${model.id}`}
                        className={`text-xs ${allowAllProviders || !provider.enabled ? 'text-muted-foreground' : ''}`}
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
              {`Policy v${policyVersion}`}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isUpdating
                ? 'Updating provider whitelist...'
                : 'Changes will be pushed to SSE stream within 30 seconds'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
