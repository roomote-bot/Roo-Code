import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ProviderName, OrganizationAllowList } from '@roo-code/types';

import { QueryKey } from '@/types';
import { updateOrganization } from '@/actions/organizationSettings';
import { useAvailableProviders } from '@/hooks/useAvailableProviders';
import { cn } from '@/lib/utils';
import {
  Switch,
  Button,
  Label,
  Table,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui';
import { MultiSelect } from '@/components/ui/ecosystem';
import { Loading } from '@/components/layout';

export const ProviderForm = () => {
  const { availableProviders, allowList } = useAvailableProviders();

  const {
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<OrganizationAllowList>({
    defaultValues: allowList,
    mode: 'onChange',
  });

  const [allowAll, providers] = watch(['allowAll', 'providers']);

  const queryClient = useQueryClient();

  const onSubmit = async (data: OrganizationAllowList) => {
    try {
      // Filter out providers with no models selected (unless they have
      // `allowAll: true`).
      const allowList = {
        ...data,
        providers: Object.fromEntries(
          Object.entries(data.providers).filter(
            ([, provider]) =>
              provider.allowAll ||
              (provider.models && provider.models.length > 0),
          ),
        ),
      };

      await updateOrganization({ allowList });
      reset(allowList);

      queryClient.invalidateQueries({
        queryKey: [QueryKey.GetOrganizationSettings],
      });

      toast.success('Changes will be deployed within 30 seconds.');
    } catch (error) {
      console.error('Failed to save provider settings.', error);
      toast.error('Failed to save provider settings.');
    }
  };

  const setProvider = ({
    id,
    enabled = true,
    allowAll = true,
    models = [],
  }: {
    id: ProviderName;
    enabled?: boolean;
    allowAll?: boolean;
    models?: string[];
  }) => {
    const newProviders = { ...providers };

    if (enabled) {
      newProviders[id] = {
        allowAll: models.length > 0 ? false : allowAll,
        models,
      };
    } else {
      delete newProviders[id];
    }

    setValue('providers', newProviders, { shouldDirty: true });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-2 mb-[80px]"
    >
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>
              <Label>
                <Switch
                  checked={allowAll}
                  onCheckedChange={(checked) =>
                    setValue('allowAll', checked, { shouldDirty: true })
                  }
                  disabled={isSubmitting}
                />
                Enable All Providers
              </Label>
            </TableCell>
          </TableRow>
          {availableProviders.map((provider) => (
            <TableRow key={provider.id} className={cn({ hidden: allowAll })}>
              <TableCell>
                <Label>
                  <Switch
                    checked={!!providers[provider.id]}
                    onCheckedChange={(checked) =>
                      setProvider({ id: provider.id, enabled: checked })
                    }
                    disabled={isSubmitting}
                  />
                  {provider.label}
                </Label>
              </TableCell>
              <TableCell>
                {provider.models.length > 0 && (
                  <Label className={cn({ hidden: !providers[provider.id] })}>
                    <Switch
                      checked={providers[provider.id]?.allowAll}
                      onCheckedChange={(checked) =>
                        setProvider({ id: provider.id, allowAll: checked })
                      }
                      disabled={isSubmitting}
                    />
                    Enable All Models
                  </Label>
                )}
              </TableCell>
              <TableCell className="min-w-1/2">
                {providers[provider.id]?.allowAll === false &&
                  provider.models.length > 0 && (
                    <MultiSelect
                      options={provider.models.map((model) => ({
                        label: model,
                        value: model,
                      }))}
                      value={providers[provider.id]?.models || []}
                      placeholder="Select"
                      onValueChange={(options) =>
                        setProvider({ id: provider.id, models: options })
                      }
                      maxCount={3}
                      className={cn({ hidden: !providers[provider.id] })}
                    />
                  )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div
        className={cn('fixed bottom-0 left-0 right-0', {
          hidden: !isDirty && !isSubmitting,
        })}
      >
        <div className="flex items-center justify-end h-[80px] bg-card border-t px-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loading /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
};
