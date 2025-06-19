export const timePeriods = [7, 30, 90] as const;

export type TimePeriod = (typeof timePeriods)[number];
export type AnyTimePeriod = TimePeriod | 1; // 1 for 24h view, 7|30|90 for daily views
export type TimeGranularity = 'hourly' | 'daily';

export type TimePeriodConfig = {
  value: AnyTimePeriod;
  granularity: TimeGranularity;
  label: string;
};

export const allTimePeriods: TimePeriodConfig[] = [
  { value: 1, granularity: 'hourly', label: '24h' },
  { value: 7, granularity: 'daily', label: '7d' },
  { value: 30, granularity: 'daily', label: '30d' },
  { value: 90, granularity: 'daily', label: '90d' },
];
