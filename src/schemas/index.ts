/**
 * TimePeriod
 */

export const timePeriods = [7, 30, 90] as const;

export type TimePeriod = (typeof timePeriods)[number];
