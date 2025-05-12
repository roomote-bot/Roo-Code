import { useTranslations } from 'next-intl';

import { Section } from '@/components/layout';

export const Features = () => {
  const t = useTranslations('Features');

  return (
    <Section className="bg-secondary">
      <div className="mx-auto mb-12 max-w-screen-md text-center">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-sm font-bold text-transparent">
          {t('section_subtitle')}
        </div>
        <div className="mt-1 text-3xl font-bold">{t('section_title')}</div>
        <div className="mt-2 text-lg text-muted-foreground">
          {t('section_description')}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-3 gap-y-8 md:grid-cols-3">
        <FeatureCard
          icon={
            <svg
              className="stroke-primary-foreground stroke-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          }
          title={t('feature1_title')}
        >
          {t('feature_description')}
        </FeatureCard>
        <FeatureCard
          icon={
            <svg
              className="stroke-primary-foreground stroke-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          }
          title={t('feature2_title')}
        >
          {t('feature_description')}
        </FeatureCard>
        <FeatureCard
          icon={
            <svg
              className="stroke-primary-foreground stroke-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          }
          title={t('feature3_title')}
        >
          {t('feature_description')}
        </FeatureCard>
        <FeatureCard
          icon={
            <svg
              className="stroke-primary-foreground stroke-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          }
          title={t('feature4_title')}
        >
          {t('feature_description')}
        </FeatureCard>
        <FeatureCard
          icon={
            <svg
              className="stroke-primary-foreground stroke-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          }
          title={t('feature5_title')}
        >
          {t('feature_description')}
        </FeatureCard>
        <FeatureCard
          icon={
            <svg
              className="stroke-primary-foreground stroke-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          }
          title={t('feature6_title')}
        >
          {t('feature_description')}
        </FeatureCard>
      </div>
    </Section>
  );
};

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

const FeatureCard = ({ icon, title, children }: FeatureCardProps) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="size-12 rounded-lg bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-2 [&_svg]:stroke-white [&_svg]:stroke-2">
      {icon}
    </div>
    <div className="mt-2 text-lg font-bold">{title}</div>
    <div className="my-3 w-8 border-t border-purple-400" />
    <div className="mt-2 text-muted-foreground">{children}</div>
  </div>
);
