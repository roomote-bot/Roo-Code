import { convertUTCHourToLocalDate, getUserTimezone } from './formatters';
import type { HourlyUsageByUser } from '@/actions/analytics/events';

export type DailyAggregatedUsage = {
  date: string;
  userId: string;
  tasks: number;
  tokens: number;
  cost: number;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

/**
 * Aggregate hourly usage data into daily buckets based on user's local timezone
 * @param hourlyData Array of hourly usage data from server
 * @param userTimezone Optional timezone override (defaults to browser timezone)
 * @returns Array of daily aggregated usage data
 */
export const aggregateHourlyToDaily = (
  hourlyData: HourlyUsageByUser[],
  userTimezone?: string,
): DailyAggregatedUsage[] => {
  const timezone = userTimezone || getUserTimezone();

  // Group hourly data by local date and user
  const dailyGroups: Record<string, Record<string, DailyAggregatedUsage>> = {};

  hourlyData.forEach((hourlyRecord) => {
    // Convert UTC hour to user's local date
    const localDate = convertUTCHourToLocalDate(
      hourlyRecord.hour_utc,
      timezone,
    );
    const userId = hourlyRecord.userId;

    if (!dailyGroups[localDate]) {
      dailyGroups[localDate] = {};
    }

    if (!dailyGroups[localDate][userId]) {
      dailyGroups[localDate][userId] = {
        date: localDate,
        userId,
        tasks: 0,
        tokens: 0,
        cost: 0,
        user: hourlyRecord.user,
      };
    }

    // Aggregate the values
    const dailyRecord = dailyGroups[localDate][userId];
    dailyRecord.tasks += hourlyRecord.tasks;
    dailyRecord.tokens += hourlyRecord.tokens;
    dailyRecord.cost += hourlyRecord.cost;
  });

  // Flatten the grouped data into an array
  const result: DailyAggregatedUsage[] = [];
  Object.values(dailyGroups).forEach((dateGroup) => {
    Object.values(dateGroup).forEach((dailyRecord) => {
      result.push(dailyRecord);
    });
  });

  // Sort by date descending, then by userId
  return result.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return a.userId.localeCompare(b.userId);
  });
};
