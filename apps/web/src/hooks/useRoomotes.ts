'use client';

import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import { QueryKey } from '@/types';
import { isRoomoteEnabled } from '@/lib/roomotes';

export function useRoomotes() {
  const { organization, isLoaded } = useOrganization();

  const { data } = useQuery({
    queryKey: [QueryKey.IsRoomoteEnabled, organization?.id],
    queryFn: () =>
      organization?.id ? isRoomoteEnabled(organization.id) : false,
    enabled: isLoaded && !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isEnabled: data === true,
  };
}
