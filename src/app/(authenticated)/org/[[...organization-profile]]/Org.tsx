'use client';

import { useTranslations } from 'next-intl';
import { OrganizationProfile } from '@clerk/nextjs';
import { ListTodo, Cloud } from 'lucide-react';

import { ProviderWhitelist } from './ProviderWhitelist';
import { CloudSettings } from './CloudSettings';

export const Org = () => {
  const t = useTranslations('OrganizationProfile');

  return (
    <div className="mx-auto">
      <OrganizationProfile
        routing="path"
        path="/org"
        afterLeaveOrganizationUrl="/select-org"
      >
        <OrganizationProfile.Page
          label={t('provider_whitelist')}
          url="provider-whitelist"
          labelIcon={<ListTodo className="size-4" />}
        >
          <ProviderWhitelist />
        </OrganizationProfile.Page>
        <OrganizationProfile.Page
          label={t('cloud_settings')}
          url="cloud-settings"
          labelIcon={<Cloud className="size-4" />}
        >
          <CloudSettings />
        </OrganizationProfile.Page>
      </OrganizationProfile>
    </div>
  );
};
