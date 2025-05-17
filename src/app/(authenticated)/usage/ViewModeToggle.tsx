import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui';

import { type ViewMode, viewModes } from './types';

export const ViewModeToggle = ({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) => {
  const t = useTranslations('Analytics');

  return (
    <div className="flex gap-2">
      {viewModes.map((mode) => (
        <Button
          key={mode}
          variant={viewMode === mode ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setViewMode(mode)}
        >
          {t(`view_mode_${mode}`)}
        </Button>
      ))}
    </div>
  );
};
