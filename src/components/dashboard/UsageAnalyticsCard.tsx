'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { TelemetryEventName } from '@roo-code/types';

import { type TimePeriod, timePeriods } from '@/schemas';
import { getUsage } from '@/actions/analytics';

import { Button } from '@/components/ui';

export const UsageAnalyticsCard = () => {
  const t = useTranslations('DashboardIndex');
  const { orgId } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);

  const usage = useQuery({
    queryKey: ['usage', orgId, timePeriod],
    queryFn: () => getUsage({ orgId, timePeriod }),
  });

  return (
    <div className="mb-6 rounded-md bg-card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{t('analytics_title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('analytics_description')}
        </p>
      </div>

      <div className="mb-4 flex space-x-2">
        {timePeriods.map((period) => (
          <Button
            key={period}
            variant={period === timePeriod ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod(period)}
          >
            {t(`analytics_period_${period}_days`)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_active_developers')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {usage.data?.[TelemetryEventName.LLM_COMPLETION]?.userCount ?? '-'}
          </div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_tasks_started')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {usage.data?.[TelemetryEventName.TASK_CREATED]?.eventCount ?? '-'}
          </div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_tasks_completed')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {usage.data?.[TelemetryEventName.TASK_COMPLETED]?.eventCount ?? '-'}
          </div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_tokens_consumed')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {usage.data?.[TelemetryEventName.LLM_COMPLETION]?.inputTokens ??
              '-'}
          </div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_llm_costs')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {usage.data?.[TelemetryEventName.LLM_COMPLETION]?.cost?.toFixed(
              2,
            ) ?? '-'}
          </div>
        </div>
      </div>
      <div className="mt-4 text-right">
        <Link
          href="/dashboard/analytics"
          className="text-sm text-primary hover:underline"
        >
          {t('analytics_view_details')}
        </Link>
      </div>
    </div>
  );
};
