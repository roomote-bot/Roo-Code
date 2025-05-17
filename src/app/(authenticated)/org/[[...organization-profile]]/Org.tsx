'use client';

import { useTranslations } from 'next-intl';
import { OrganizationProfile } from '@clerk/nextjs';
import { ListTodo, SlidersHorizontal } from 'lucide-react';

import { DefaultParameters } from './DefaultParameters';
import { ProviderWhitelist } from './ProviderWhitelist';

export const Org = () => {
  const t = useTranslations('OrganizationProfile');

  return (
    <div className="mx-auto">
      <OrganizationProfile
        routing="path"
        path="/org"
        afterLeaveOrganizationUrl="/onboarding/select-org"
      >
        <OrganizationProfile.Page
          label={t('provider_whitelist')}
          url="provider-whitelist"
          labelIcon={<ListTodo className="size-4" />}
        >
          <ProviderWhitelist />
        </OrganizationProfile.Page>
        <OrganizationProfile.Page
          label={t('default_parameters')}
          url="default-parameters"
          labelIcon={<SlidersHorizontal className="size-4" />}
        >
          <DefaultParameters />
        </OrganizationProfile.Page>
      </OrganizationProfile>
    </div>
  );
};
