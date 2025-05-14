'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

type TimePeriod = '7' | '30' | '90';

type AnalyticsData = {
  tasksStarted: number;
  tasksCompleted: number;
  tokensConsumed: string;
  costs: number;
  activeDevelopers: number;
};

export const UsageAnalyticsCard = () => {
  const t = useTranslations('DashboardIndex');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7');

  // Mock data based on selected time period
  const analyticsData = useMemo<AnalyticsData>(() => {
    // Return different data based on timePeriod
    switch (timePeriod) {
      case '7':
        return {
          tasksStarted: 42,
          tasksCompleted: 38,
          tokensConsumed: '1.2M',
          costs: 24.5,
          activeDevelopers: 8,
        };
      case '30':
        return {
          tasksStarted: 187,
          tasksCompleted: 165,
          tokensConsumed: '5.8M',
          costs: 112.75,
          activeDevelopers: 12,
        };
      case '90':
        return {
          tasksStarted: 563,
          tasksCompleted: 498,
          tokensConsumed: '18.3M',
          costs: 347.2,
          activeDevelopers: 15,
        };
    }
  }, [timePeriod]);

  return (
    <div className="mb-6 rounded-md bg-card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{t('analytics_title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('analytics_description')}
        </p>
      </div>

      {/* Time period toggle */}
      <div className="mb-4 flex space-x-2">
        <Button
          variant={timePeriod === '7' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('7')}
        >
          {t('analytics_period_7_days')}
        </Button>
        <Button
          variant={timePeriod === '30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('30')}
        >
          {t('analytics_period_30_days')}
        </Button>
        <Button
          variant={timePeriod === '90' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('90')}
        >
          {t('analytics_period_90_days')}
        </Button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {/* Active Developers */}
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_active_developers')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {analyticsData.activeDevelopers}
          </div>
        </div>

        {/* Tasks Started */}
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_tasks_started')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {analyticsData.tasksStarted}
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_tasks_completed')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {analyticsData.tasksCompleted}
          </div>
        </div>

        {/* Tokens Consumed */}
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_tokens_consumed')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {analyticsData.tokensConsumed}
          </div>
        </div>

        {/* LLM Model Costs */}
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('analytics_llm_costs')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            ${analyticsData.costs.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Link to detailed analytics */}
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
