import { useTranslations } from 'next-intl';

import { Section } from '@/components/layout/Section';

export const Hero = () => {
  const t = useTranslations('Hero');

  return (
    <Section className="py-36">
      <div className="mt-3 text-center text-5xl font-bold tracking-tight">
        {t.rich('title', {
          important: (chunks) => (
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {chunks}
            </span>
          ),
        })}
      </div>
      <div className="mx-auto mt-5 max-w-screen-md text-center text-xl text-muted-foreground">
        {t('description')}
      </div>
    </Section>
  );
};
