'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';

import { TelemetryEventName } from '@roo-code/types';

import { type TimePeriodConfig, allTimePeriods } from '@/types';
import { getUsage } from '@/actions/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import { Button as EnhancedButton } from '@/components/ui/ecosystem';

import { UsageChart } from './UsageChart';

type MetricType = 'tasks' | 'tokens' | 'cost';

type Filter = {
  type: 'userId' | 'model' | 'repositoryName';
  value: string;
  label: string;
};

type UsageCardProps = {
  userRole?: 'admin' | 'member';
  currentUserId?: string | null;
  filters?: Filter[];
};

export const UsageCard = ({
  userRole = 'admin',
  currentUserId,
  filters = [],
}: UsageCardProps) => {
  const t = useTranslations('DashboardIndex');
  const { orgId } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodConfig>(
    allTimePeriods.find((p) => p.value === 7 && p.granularity === 'daily')!,
  );
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('tokens');

  const path = usePathname();

  const { data: usage = {}, isPending } = useQuery({
    queryKey: [
      'usage',
      orgId,
      selectedPeriod.value,
      selectedPeriod.granularity,
      userRole === 'member' || !orgId ? currentUserId : null,
    ],
    queryFn: () =>
      getUsage({
        orgId,
        timePeriod:
          selectedPeriod.granularity === 'daily'
            ? (selectedPeriod.value as 7 | 30 | 90)
            : (selectedPeriod.value as 1), // Use 1 day for 24h view
        userId: userRole === 'member' || !orgId ? currentUserId : undefined,
      }),
    enabled: !!orgId || (!orgId && !!currentUserId), // Run for org context OR personal context with userId
  });

  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle>
          {!orgId ? 'Personal Account Usage' : t('analytics_title')}
        </CardTitle>
        <CardDescription>
          {!orgId
            ? 'Your personal account activity and usage'
            : t('analytics_description')}
        </CardDescription>
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
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-row gap-2 sm:gap-3 items-center">
              {/* Time period toggles */}
              <div className="flex flex-row gap-1">
                {allTimePeriods.map((periodConfig) => (
                  <button
                    key={`${periodConfig.value}-${periodConfig.granularity}`}
                    onClick={() => setSelectedPeriod(periodConfig)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      periodConfig.value === selectedPeriod.value &&
                      periodConfig.granularity === selectedPeriod.granularity
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {periodConfig.label}
                  </button>
                ))}
              </div>

              {/* Chart metric toggles - only show on usage page */}
              {path === '/usage' && (
                <div className="flex flex-row gap-1">
                  {(['tasks', 'tokens', 'cost'] as MetricType[]).map(
                    (metric) => (
                      <button
                        key={metric}
                        onClick={() => setSelectedMetric(metric)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors capitalize ${
                          metric === selectedMetric
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {metric}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Compact inline metrics */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Developers:</span>
                <span className="font-medium">
                  {isPending
                    ? '...'
                    : usage[TelemetryEventName.TASK_CREATED]?.users || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Tasks:</span>
                <span className="font-medium">
                  {isPending
                    ? '...'
                    : `${usage[TelemetryEventName.TASK_CREATED]?.events || 0}/${usage[TelemetryEventName.TASK_COMPLETED]?.events || 0}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Tokens:</span>
                <span className="font-medium">
                  {isPending
                    ? '...'
                    : formatNumber(
                        usage[TelemetryEventName.LLM_COMPLETION]?.tokens || 0,
                      )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">
                  {isPending
                    ? '...'
                    : formatCurrency(
                        usage[TelemetryEventName.LLM_COMPLETION]?.cost || 0,
                      )}
                </span>
              </div>
            </div>
          </div>

          {/* Chart displayed below on usage page */}
          {path === '/usage' && (
            <UsageChart
              timePeriodConfig={selectedPeriod}
              selectedMetric={selectedMetric}
              userRole={userRole}
              currentUserId={currentUserId}
              filters={filters}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
