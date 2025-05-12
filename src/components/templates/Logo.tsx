import { APP_CONFIG } from '@/lib/constants';

export const Logo = () => (
  <div className="flex items-center text-xl font-semibold">
    {APP_CONFIG.name}
  </div>
);
