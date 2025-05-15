'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import { OrganizationProfile } from '@clerk/nextjs';

import DefaultParametersPage from '@/components/dashboard/DefaultParametersPage';
import ProviderWhitelistPage from '@/components/dashboard/ProviderWhitelistPage';

export const OrgProfile = () => {
  const t = useTranslations('OrganizationProfile');

  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <OrganizationProfile
      appearance={{ baseTheme }}
      routing="path"
      path="/dashboard/org"
      afterLeaveOrganizationUrl="/onboarding/select-org"
    >
      <OrganizationProfile.Page
        label={t('provider_whitelist')}
        url="provider-whitelist"
        labelIcon={<SettingsIcon />}
      >
        <ProviderWhitelistPage />
      </OrganizationProfile.Page>
      <OrganizationProfile.Page
        label={t('default_parameters')}
        url="default-parameters"
        labelIcon={<ParametersIcon />}
      >
        <DefaultParametersPage />
      </OrganizationProfile.Page>
    </OrganizationProfile>
  );
};

const SettingsIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2" />
      <path d="M12 22v-2" />
      <path d="m17 20.66-1-1.73" />
      <path d="M11 10.27 7 3.34" />
      <path d="m20.66 17-1.73-1" />
      <path d="m3.34 7 1.73 1" />
      <path d="M14 12h8" />
      <path d="M2 12h2" />
      <path d="m20.66 7-1.73 1" />
      <path d="m3.34 17 1.73-1" />
      <path d="m17 3.34-1 1.73" />
      <path d="m7 20.66 1-1.73" />
    </svg>
  );
};

const ParametersIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M3 3v18h18" />
      <path d="M18.4 9a9 9 0 0 0-9.4 9" />
      <path d="M8 12l4-4 4 4" />
    </svg>
  );
};
