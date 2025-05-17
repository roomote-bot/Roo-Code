'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';

import { TelemetryEventName } from '@roo-code/types';

import { type TimePeriod, timePeriods } from '@/schemas';
import { getUsage } from '@/actions/analytics';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import { Button as EnhancedButton } from '@/components/ui/ecosystem';

export const UsageCard = () => {
  const t = useTranslations('DashboardIndex');
  const { orgId } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);

  const path = usePathname();

  const usage = useQuery({
    queryKey: ['usage', orgId, timePeriod],
    queryFn: () => getUsage({ orgId, timePeriod }),
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            {timePeriods.map((period) => (
              <Button
                key={period}
                variant={period === timePeriod ? 'default' : 'secondary'}
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
                {usage.data?.[TelemetryEventName.LLM_COMPLETION]?.userCount ??
                  '-'}
              </div>
            </div>
            <div className="rounded-lg bg-background p-3">
              <div className="text-xs text-muted-foreground">
                {t('analytics_tasks_started')}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {usage.data?.[TelemetryEventName.TASK_CREATED]?.eventCount ??
                  '-'}
              </div>
            </div>
            <div className="rounded-lg bg-background p-3">
              <div className="text-xs text-muted-foreground">
                {t('analytics_tasks_completed')}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {usage.data?.[TelemetryEventName.TASK_COMPLETED]?.eventCount ??
                  '-'}
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
        </div>
      </CardContent>
    </Card>
  );
};
