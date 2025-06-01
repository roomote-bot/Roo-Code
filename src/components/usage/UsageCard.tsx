'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';

import { TelemetryEventName } from '@roo-code/types';

import { type TimePeriod, timePeriods } from '@/types';
import { getUsage } from '@/actions/analytics';
import { formatCurrency } from '@/lib/formatters';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import { Button as EnhancedButton } from '@/components/ui/ecosystem';

import { Metric } from './Metric';

export const UsageCard = () => {
  const t = useTranslations('DashboardIndex');
  const { orgId } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);

  const path = usePathname();

  const { data: usage = {}, isPending } = useQuery({
    queryKey: ['usage', orgId, timePeriod],
    queryFn: () => getUsage({ orgId, timePeriod }),
    enabled: !!orgId,
  });

  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle>{t('analytics_title')}</CardTitle>
        <CardDescription>{t('analytics_description')}</CardDescription>
        {path !== '/usage' && (
          <EnhancedButton
            variant="ghost"
            size="sm"
            effect="expandIcon"
            icon={ArrowRightIcon}
            iconPlacement="right"
            className="absolute top-0 right-6"
            asChild
          >
            <Link
              href="/usage"
              className="text-sm text-primary hover:underline"
            >
              See all usage
            </Link>
          </EnhancedButton>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-row flex-wrap gap-1.5">
            {timePeriods.map((period) => (
              <Button
                key={period}
                variant={period === timePeriod ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setTimePeriod(period)}
                className="text-xs px-2.5 h-8"
              >
                {t(`analytics_period_${period}_days`)}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric
              label={t('analytics_active_developers')}
              value={usage[TelemetryEventName.TASK_CREATED]?.users}
              isPending={isPending}
            />
            <Metric
              label={t('analytics_tasks_started')}
              value={usage[TelemetryEventName.TASK_CREATED]?.events}
              isPending={isPending}
            />
            <Metric
              label={t('analytics_tasks_completed')}
              value={usage[TelemetryEventName.TASK_COMPLETED]?.events}
              isPending={isPending}
            />
            <Metric
              label={t('analytics_tokens_consumed')}
              value={usage[TelemetryEventName.LLM_COMPLETION]?.tokens}
              isPending={isPending}
            />
            <Metric
              label={t('analytics_llm_costs')}
              value={formatCurrency(
                usage[TelemetryEventName.LLM_COMPLETION]?.cost,
              )}
              isPending={isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
