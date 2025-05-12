import { useTranslations } from 'next-intl';

import { TitleBar } from '@/components/dashboard/TitleBar';

const DashboardIndexPage = () => {
  const t = useTranslations('DashboardIndex');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />
      <div className="flex h-[600px] flex-col items-center justify-center rounded-md bg-card p-5">
        <div className="size-16 rounded-full bg-muted p-3 [&_svg]:stroke-muted-foreground [&_svg]:stroke-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M0 0h24v24H0z" stroke="none" />
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
          </svg>
        </div>
        <div className="mt-3 text-center">
          <div className="text-xl font-semibold">
            {t('message_state_title')}
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardIndexPage;
