import { UserProfile } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { TitleBar } from '@/features/dashboard/TitleBar';

const UserProfilePage = () => {
  const t = useTranslations('UserProfile');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <UserProfile
        routing="path"
        path="/dashboard/user-profile"
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

export default UserProfilePage;
