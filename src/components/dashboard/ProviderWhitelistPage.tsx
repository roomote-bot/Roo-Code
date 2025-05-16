'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge, Checkbox, Label } from '@/components/ui';

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

const ProviderWhitelistPage = () => {
  const t = useTranslations('ProviderWhitelist');

  const [providers, setProviders] = useState(initialProviders);
  const [policyVersion] = useState(1);
  const [allowAllProviders, setAllowAllProviders] = useState(true);

  const toggleAllowAllProviders = () => {
    const newAllowAllProviders = !allowAllProviders;
    setAllowAllProviders(newAllowAllProviders);

    if (newAllowAllProviders) {
      setProviders(
        providers.map((provider) => ({
          ...provider,
          enabled: true,
          models: provider.models.map((model) => ({
            ...model,
            enabled: true,
          })),
        })),
      );
    }
  };

  const toggleProvider = (providerId: string) => {
    if (allowAllProviders) {
      return;
    }

    setProviders(
      providers.map((provider) => {
        if (provider.id === providerId) {
          const newEnabled = !provider.enabled;
          return {
            ...provider,
            enabled: newEnabled,
            models: provider.models.map((model) => ({
              ...model,
              enabled: newEnabled ? model.enabled : false,
            })),
          };
        }
        return provider;
      }),
    );
  };

  const toggleModel = (providerId: string, modelId: string) => {
    if (allowAllProviders) {
      return;
    }

    setProviders(
      providers.map((provider) => {
        if (provider.id === providerId) {
          return {
            ...provider,
            models: provider.models.map((model) => {
              if (model.id === modelId) {
                return { ...model, enabled: !model.enabled };
              }
              return model;
            }),
          };
        }
        return provider;
      }),
    );
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
              Changes will be pushed to SSE stream within 30 seconds
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProviderWhitelistPage;
