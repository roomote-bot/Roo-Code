import { OrganizationProfile } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { TitleBar } from '@/components/dashboard/TitleBar';

const OrganizationProfilePage = () => {
  const t = useTranslations('OrganizationProfile');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <OrganizationProfile
        routing="path"
        path="/dashboard/organization-profile"
        afterLeaveOrganizationUrl="/onboarding/organization-selection"
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'w-full flex',
          },
        }}
      />
    </>
  );
};

export default OrganizationProfilePage;
