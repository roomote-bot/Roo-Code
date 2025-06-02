import { useQuery } from '@tanstack/react-query';

import { QueryKey } from '@/types';
import { getOrganizationSettings } from '@/actions/organizationSettings';

export const useOrganizationSettings = () =>
  useQuery({
    queryKey: [QueryKey.GetOrganizationSettings],
    queryFn: getOrganizationSettings,
  });
