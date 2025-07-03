'use client';

import React, { useMemo, useEffect, useState } from 'react';
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

import type { TimePeriodConfig } from '@/types';
import { getHourlyUsageByUser } from '@/actions/analytics';
import { formatNumber } from '@/lib/formatters';
import { aggregateHourlyToDaily } from '@/lib/timezone-utils';
type MetricType = 'tasks' | 'tokens' | 'cost';

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
  hoveredUser?: string | null;
  userRole?: 'admin' | 'member';
  chartData?: ChartDataPoint[];
}

interface ChartDataPoint {
  date: string;
  total: number;
  [userKey: string]: string | number | null;
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

// Helper function to generate complete hourly time series for 24h period
const generateCompleteHourlyTimeSeries = (
  startDate: Date,
  endDate: Date,
): string[] => {
  const hours: string[] = [];
  const current = new Date(startDate);

  // Round down to the start of the hour
  current.setMinutes(0, 0, 0);

  while (current <= endDate) {
    hours.push(current.toISOString());
    current.setHours(current.getHours() + 1);
  }

  return hours;
};

// Helper function to process hourly data for chart display
const processHourlyDataForChart = (
  hourlyData: Array<{
    hour_utc: string;
    userId: string;
    tasks: number;
    tokens: number;
    cost: number;
    user: { name?: string | null; email?: string | null };
  }>,
  selectedMetric: MetricType,
) => {
  // Group by UTC hour and user (display conversion happens in chart components)
  const hourGroups: Record<string, ChartDataPoint> = {};
  const allUsers = new Set<string>();

  hourlyData.forEach((item) => {
    // Use UTC hour as-is, conversion to local time happens in display components
    const utcHour = item.hour_utc;
    let isoHour: string;

    try {
      // Convert to ISO format for consistent handling
      if (utcHour.includes('T')) {
        isoHour = utcHour + 'Z';
      } else {
        isoHour = utcHour.replace(' ', 'T') + 'Z';
      }

      // Validate the date format
      const testDate = new Date(isoHour);
      if (isNaN(testDate.getTime())) {
        console.warn('Invalid UTC hour format:', utcHour);
        return;
      }
    } catch (error) {
      console.warn('Error processing UTC hour:', error, utcHour);
      return;
    }

    if (!hourGroups[isoHour]) {
      hourGroups[isoHour] = { date: isoHour, total: 0 };
    }

    const value = item[selectedMetric];
    const userName = item.user.name || item.user.email || 'Unknown';
    allUsers.add(userName);

    const hourGroup = hourGroups[isoHour];
    if (hourGroup) {
      hourGroup[userName] = value;
      hourGroup.total += value;
    }
  });

  // Generate complete 24-hour time series if we have any data
  if (Object.keys(hourGroups).length > 0) {
    // For 24h view, ensure we show a full 24-hour period
    const now = new Date();
    const startOfPeriod = new Date(now);
    startOfPeriod.setHours(startOfPeriod.getHours() - 23, 0, 0, 0); // 24 hours ago

    const completeHours = generateCompleteHourlyTimeSeries(startOfPeriod, now);

    // Fill in missing hours with null values for users (creates blank spaces but maintains timeline)
    completeHours.forEach((hour) => {
      if (!hourGroups[hour]) {
        hourGroups[hour] = { date: hour, total: 0 };
        // Add null values for all users in empty hours - this maintains spacing but shows no bars
        allUsers.forEach((userName) => {
          const hourGroup = hourGroups[hour];
          if (hourGroup) {
            hourGroup[userName] = null;
          }
        });
      } else {
        // For hours with data, ensure all users have values (fill with null if missing)
        allUsers.forEach((userName) => {
          const hourGroup = hourGroups[hour];
          if (hourGroup && !(userName in hourGroup)) {
            hourGroup[userName] = null;
          }
        });
      }
    });
  }

  // Convert to array and sort by hour
  return Object.values(hourGroups).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

// Helper function to generate complete daily time series
const generateCompleteDailyTimeSeries = (
  startDate: Date,
  endDate: Date,
): string[] => {
  const days: string[] = [];
  const current = new Date(startDate);

  // Set to start of day
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return days;
};

// Helper function to process daily data for chart display
const processDailyDataForChart = (
  dailyData: Array<{
    date: string;
    userId: string;
    tasks: number;
    tokens: number;
    cost: number;
    user: { name?: string | null; email?: string | null };
  }>,
  selectedMetric: MetricType,
  timePeriodDays: number,
) => {
  // Group by date and user
  const dateGroups: Record<string, ChartDataPoint> = {};
  const allUsers = new Set<string>();

  dailyData.forEach((item) => {
    const date = item.date;
    if (!dateGroups[date]) {
      dateGroups[date] = { date, total: 0 };
    }

    const value = item[selectedMetric];
    const userName = item.user.name || item.user.email || 'Unknown';
    allUsers.add(userName);

    const dateGroup = dateGroups[date];
    if (dateGroup) {
      dateGroup[userName] = value;
      dateGroup.total += value;
    }
  });

  // Generate complete time series for the period
  if (Object.keys(dateGroups).length > 0 || timePeriodDays > 0) {
    const now = new Date();
    const startOfPeriod = new Date(now);
    startOfPeriod.setDate(startOfPeriod.getDate() - (timePeriodDays - 1));
    startOfPeriod.setHours(0, 0, 0, 0);

    const completeDays = generateCompleteDailyTimeSeries(startOfPeriod, now);

    // Fill in missing days with null values for users (creates blank spaces but maintains timeline)
    completeDays.forEach((day) => {
      if (!dateGroups[day]) {
        dateGroups[day] = { date: day, total: 0 };
        // Add null values for all users in empty days - this maintains spacing but shows no bars
        allUsers.forEach((userName) => {
          const dateGroup = dateGroups[day];
          if (dateGroup) {
            dateGroup[userName] = null;
          }
        });
      } else {
        // For days with data, ensure all users have values (fill with null if missing)
        allUsers.forEach((userName) => {
          const dateGroup = dateGroups[day];
          if (dateGroup && !(userName in dateGroup)) {
            dateGroup[userName] = null;
          }
        });
      }
    });
  }

  // Convert to array and sort by date
  return Object.values(dateGroups).sort((a, b) => {
    const [yearA, monthA, dayA] = a.date.split('-').map(Number);
    const [yearB, monthB, dayB] = b.date.split('-').map(Number);

    if (!yearA || !monthA || !dayA || !yearB || !monthB || !dayB) {
      return 0;
    }

    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateA.getTime() - dateB.getTime();
  });
};

type Filter = {
  type: 'userId' | 'model' | 'repositoryName';
  value: string;
  label: string;
};

interface UsageChartProps {
  timePeriodConfig: TimePeriodConfig;
  selectedMetric?: MetricType;
  userRole?: 'admin' | 'member';
  currentUserId?: string | null;
  filters?: Filter[];
}

// Custom tick components for theme-aware labels
const CustomXAxisTick = (props: TickProps & { isHourly?: boolean }) => {
  const { x, y, payload, isHourly } = props;

  if (!payload?.value) return null;

  let formattedDate: string;

  if (isHourly) {
    // For hourly data, show hour format
    const date = new Date(payload.value);
    if (isNaN(date.getTime())) return null;

    // Convert UTC time to local time for display
    formattedDate = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } else {
    // For daily data, show date format
    const [year, month, day] = payload.value.split('-').map(Number);
    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day); // month is 0-indexed
    formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

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
  isHourly,
  hoveredUser,
  userRole,
  chartData,
}: TooltipProps & { isHourly?: boolean }) => {
  if (active && payload && payload.length && label) {
    let formattedDate: string;

    if (isHourly) {
      // For hourly data, label is an ISO datetime string
      const date = new Date(label);
      if (isNaN(date.getTime())) return null;

      formattedDate = date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } else {
      // For daily data, label is a date string "YYYY-MM-DD"
      const [year, month, day] = label.split('-').map(Number);
      if (!year || !month || !day) return null;

      const date = new Date(year, month - 1, day); // month is 0-indexed
      formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }

    // Sort payload entries alphabetically by dataKey (user name)
    const sortedPayload = [...payload].sort((a, b) =>
      a.dataKey.localeCompare(b.dataKey),
    );

    // Get the correct total from the chart data for this specific data point
    const currentDataPoint = chartData?.find((point) => point.date === label);
    const total = currentDataPoint?.total || 0;

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="text-sm font-medium text-foreground mb-2">
          {formattedDate}
        </p>
        <div className="space-y-1">
          {sortedPayload.map((entry, index) => (
            <div
              key={index}
              className={`flex items-center justify-between gap-3 rounded px-2 py-1 ${
                entry.dataKey === hoveredUser ? 'bg-muted' : ''
              }`}
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

          {/* Total row at the bottom - only show for admin users */}
          {userRole === 'admin' && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2 mt-2">
              <span className="text-xs font-medium text-foreground">Total</span>
              <span className="text-xs font-bold text-foreground">
                {formatValue ? formatValue(total) : total}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const UsageChart = ({
  timePeriodConfig,
  selectedMetric = 'tasks',
  userRole = 'admin',
  currentUserId,
  filters = [],
}: UsageChartProps) => {
  const { orgId } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  // Ensure we only run timezone-dependent code on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: hourlyUsage = [], isPending } = useQuery({
    queryKey: [
      'getHourlyUsageByUser',
      orgId,
      timePeriodConfig.value,
      timePeriodConfig.granularity,
      userRole === 'member' || !orgId ? currentUserId : null,
      filters,
    ],
    queryFn: () =>
      getHourlyUsageByUser({
        orgId,
        timePeriod: timePeriodConfig.value,
        userId: userRole === 'member' || !orgId ? currentUserId : undefined,
        filters,
      }),
    enabled: !!orgId || (!orgId && !!currentUserId), // Run for org context OR personal context with userId
  });

  // Process data based on granularity
  const chartData = useMemo(() => {
    if (!hourlyUsage.length || !isClient) return [];

    if (timePeriodConfig.granularity === 'hourly') {
      // For hourly view, show hourly data directly
      return processHourlyDataForChart(hourlyUsage, selectedMetric);
    } else {
      // For daily view, aggregate hourly data to daily
      const dailyUsage = aggregateHourlyToDaily(hourlyUsage);
      return processDailyDataForChart(
        dailyUsage,
        selectedMetric,
        timePeriodConfig.value,
      );
    }
  }, [
    hourlyUsage,
    isClient,
    timePeriodConfig.granularity,
    timePeriodConfig.value,
    selectedMetric,
  ]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    hourlyUsage.forEach((item) => {
      users.add(item.user.name || item.user.email || 'Unknown');
    });
    // Sort alphabetically
    return Array.from(users).sort();
  }, [hourlyUsage]);

  // Reverse the order for chart rendering so alphabetically first user appears at top
  const reversedUsers = useMemo(() => {
    return [...uniqueUsers].reverse();
  }, [uniqueUsers]);

  const formatValue = (value: number) => {
    switch (selectedMetric) {
      case 'cost':
        // Always show 2 decimal places for consistency
        return `$${value.toFixed(2)}`;
      case 'tokens':
        return value >= 1000000
          ? `${(value / 1000000).toFixed(1)}M`
          : formatNumber(value);
      default:
        return value.toString();
    }
  };

  if (isPending || !isClient) {
    return (
      <div className="space-y-6">
        <div className="h-72 w-full rounded-lg border bg-card p-3">
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-muted-foreground/50 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Loading chart data...
                </p>
                <p className="text-xs text-muted-foreground">
                  Processing timezone data
                </p>
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
            barCategoryGap={
              timePeriodConfig.granularity === 'hourly' ? '2%' : '10%'
            }
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
              tick={
                <CustomXAxisTick
                  isHourly={timePeriodConfig.granularity === 'hourly'}
                />
              }
              height={25}
              interval={
                timePeriodConfig.granularity === 'hourly'
                  ? 3
                  : 'preserveStartEnd'
              }
              minTickGap={timePeriodConfig.granularity === 'hourly' ? 10 : 5}
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
                  isHourly={timePeriodConfig.granularity === 'hourly'}
                  hoveredUser={hoveredUser}
                  userRole={userRole}
                  chartData={chartData}
                />
              }
              cursor={{
                fill: 'hsl(var(--muted))',
                opacity: 0.1,
              }}
            />
            {reversedUsers.map((user) => {
              // Find the original alphabetical position for consistent colors
              const originalIndex = uniqueUsers.indexOf(user);
              return (
                <Bar
                  key={user}
                  dataKey={user}
                  stackId="usage"
                  fill={generateUserColor(originalIndex)}
                  onMouseEnter={() => setHoveredUser(user)}
                  onMouseLeave={() => setHoveredUser(null)}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
