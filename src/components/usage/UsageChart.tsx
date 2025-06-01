'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type { TimePeriod } from '@/types';
import { getDailyUsageByUser } from '@/actions/analytics';
import { formatNumber } from '@/lib/formatters';
import { Skeleton } from '@/components/ui';

type MetricType = 'tasks' | 'tokens' | 'cost';

const metricTypes: MetricType[] = ['tasks', 'tokens', 'cost'];

interface TickProps {
  x?: number;
  y?: number;
  payload?: {
    value: string;
  };
  formatValue?: (value: number) => string;
}

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  selectedMetric?: MetricType;
  formatValue?: (value: number) => string;
}

interface ChartDataPoint {
  date: string;
  total: number;
  [userKey: string]: string | number;
}

// Elegant color palette inspired by modern design systems
const generateUserColor = (index: number): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ];
  return colors[index % colors.length]!;
};

interface UsageChartProps {
  timePeriod: TimePeriod;
  selectedMetric?: MetricType;
}

// Custom tick components for theme-aware labels
const CustomXAxisTick = (props: TickProps) => {
  const { x, y, payload } = props;

  if (!payload?.value) return null;

  // Parse date string as local date to avoid timezone issues
  const [year, month, day] = payload.value.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day); // month is 0-indexed
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        className="fill-muted-foreground text-xs font-medium"
      >
        {formattedDate}
      </text>
    </g>
  );
};

const CustomYAxisTick = (props: TickProps) => {
  const { x, y, payload, formatValue } = props;

  if (!payload?.value) return null;

  const value =
    typeof payload.value === 'string'
      ? parseFloat(payload.value)
      : payload.value;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        className="fill-muted-foreground text-xs font-medium"
      >
        {formatValue && typeof value === 'number'
          ? formatValue(value)
          : payload.value}
      </text>
    </g>
  );
};

// Custom tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: TooltipProps) => {
  if (active && payload && payload.length && label) {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = label.split('-').map(Number);
    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day); // month is 0-indexed
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="text-sm font-medium text-foreground mb-2">
          {formattedDate}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {entry.dataKey}
                </span>
              </div>
              <span className="text-xs font-medium text-foreground">
                {typeof entry.value === 'number' && formatValue
                  ? formatValue(entry.value)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const UsageChart = ({
  timePeriod,
  selectedMetric = 'tasks',
}: UsageChartProps) => {
  const { orgId } = useAuth();

  const { data: dailyUsage = [], isPending } = useQuery({
    queryKey: ['getDailyUsageByUser', orgId, timePeriod],
    queryFn: () => getDailyUsageByUser({ orgId, timePeriod }),
    enabled: !!orgId,
  });

  const chartData = useMemo(() => {
    if (!dailyUsage.length) return [];

    // Group data by date
    const dateGroups = dailyUsage.reduce(
      (acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = { date, total: 0 };
        }

        const value = item[selectedMetric];
        acc[date][item.user.name || item.user.email || 'Unknown'] = value;
        acc[date].total += value;

        return acc;
      },
      {} as Record<string, ChartDataPoint>,
    );

    // Convert to array and sort by date
    const result = Object.values(dateGroups).sort((a, b) => {
      // Parse dates as local dates to avoid timezone issues
      const [yearA, monthA, dayA] = a.date.split('-').map(Number);
      const [yearB, monthB, dayB] = b.date.split('-').map(Number);

      if (!yearA || !monthA || !dayA || !yearB || !monthB || !dayB) {
        return 0;
      }

      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

    return result;
  }, [dailyUsage, selectedMetric]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    dailyUsage.forEach((item) => {
      users.add(item.user.name || item.user.email || 'Unknown');
    });
    return Array.from(users).sort();
  }, [dailyUsage]);

  const formatValue = (value: number) => {
    switch (selectedMetric) {
      case 'cost':
        return value < 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(0)}`;
      case 'tokens':
        return value >= 1000000
          ? `${(value / 1000000).toFixed(1)}M`
          : formatNumber(value);
      default:
        return value.toString();
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {metricTypes.map((metric) => (
            <Skeleton key={metric} className="h-9 w-20 rounded-md" />
          ))}
        </div>
        <div className="h-72 w-full rounded-lg border bg-card p-3">
          <div className="h-full w-full flex items-center justify-center">
            <div className="space-y-6 w-full">
              <div className="flex justify-between items-end h-48 px-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-12 rounded-t-md"
                    style={{ height: `${Math.random() * 60 + 30}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-4 pt-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="space-y-6">
        <div className="h-72 w-full rounded-lg border bg-card p-3 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No data available
              </p>
              <p className="text-xs text-muted-foreground">
                No usage data found for the selected period
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="h-72 w-full rounded-lg border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 5,
              left: 0,
              bottom: 5,
            }}
            barCategoryGap="10%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={<CustomXAxisTick />}
              height={25}
            />
            <YAxis
              tickFormatter={formatValue}
              axisLine={false}
              tickLine={false}
              tick={<CustomYAxisTick formatValue={formatValue} />}
              width={55}
            />
            <Tooltip
              content={
                <CustomTooltip
                  selectedMetric={selectedMetric}
                  formatValue={formatValue}
                />
              }
              cursor={{
                fill: 'hsl(var(--muted))',
                opacity: 0.1,
              }}
            />
            {uniqueUsers.map((user, index) => (
              <Bar
                key={user}
                dataKey={user}
                stackId="usage"
                fill={generateUserColor(index)}
                radius={
                  index === uniqueUsers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
