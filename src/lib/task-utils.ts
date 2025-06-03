import { format, getHours } from 'date-fns';
import type { TaskWithUser } from '@/actions/analytics';

export const generateFallbackTitle = (task: TaskWithUser) => {
  const date = new Date(task.timestamp * 1000);
  const dayOfWeek = format(date, 'EEEE'); // Full day name (e.g., 'Monday')
  const hour = getHours(date);

  // Determine time of day
  let timeOfDay;
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  return `${dayOfWeek} ${timeOfDay} task`;
};
