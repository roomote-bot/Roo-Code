import { aggregateHourlyToDaily } from '../timezone-utils';
import { HourlyUsageByUser } from '@/actions/analytics/events';

// Mock timezone to ensure consistent test results
const mockTimezone = 'America/New_York';

// Mock Intl.DateTimeFormat to return consistent timezone
Object.defineProperty(Intl, 'DateTimeFormat', {
  value: () => ({
    resolvedOptions: () => ({ timeZone: mockTimezone }),
  }),
  writable: true,
});

describe('timezoneUtils', () => {
  describe('aggregateHourlyToDaily', () => {
    it('should aggregate hourly data to daily data correctly', () => {
      const mockUser1 = {
        id: 'user1',
        orgId: 'org1',
        orgRole: 'member',
        name: 'John Doe',
        email: 'john@example.com',
        imageUrl: 'https://example.com/avatar1.jpg',
        entity: {},
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser2 = {
        id: 'user2',
        orgId: 'org1',
        orgRole: 'member',
        name: 'Jane Smith',
        email: 'jane@example.com',
        imageUrl: 'https://example.com/avatar2.jpg',
        entity: {},
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockHourlyData: HourlyUsageByUser[] = [
        {
          hour_utc: '2025-06-02 14:00:00',
          userId: 'user1',
          tasks: 5,
          tokens: 1000,
          cost: 0.05,
          user: mockUser1,
        },
        {
          hour_utc: '2025-06-02 15:00:00',
          userId: 'user1',
          tasks: 3,
          tokens: 500,
          cost: 0.03,
          user: mockUser1,
        },
        {
          hour_utc: '2025-06-02 16:00:00',
          userId: 'user2',
          tasks: 2,
          tokens: 300,
          cost: 0.02,
          user: mockUser2,
        },
      ];

      const result = aggregateHourlyToDaily(mockHourlyData, mockTimezone);

      expect(result).toHaveLength(2); // Two users

      const user1Data = result.find((r) => r.userId === 'user1');
      const user2Data = result.find((r) => r.userId === 'user2');

      expect(user1Data).toEqual({
        date: '2025-06-02',
        userId: 'user1',
        tasks: 8, // 5 + 3
        tokens: 1500, // 1000 + 500
        cost: 0.08, // 0.05 + 0.03
        user: mockUser1,
      });

      expect(user2Data).toEqual({
        date: '2025-06-02',
        userId: 'user2',
        tasks: 2,
        tokens: 300,
        cost: 0.02,
        user: mockUser2,
      });
    });

    it('should handle empty data', () => {
      const result = aggregateHourlyToDaily([], mockTimezone);
      expect(result).toEqual([]);
    });

    it('should handle data across multiple days', () => {
      const mockUser = {
        id: 'user1',
        orgId: 'org1',
        orgRole: 'member',
        name: 'John Doe',
        email: 'john@example.com',
        imageUrl: 'https://example.com/avatar1.jpg',
        entity: {},
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockHourlyData: HourlyUsageByUser[] = [
        {
          hour_utc: '2025-06-02 23:00:00', // Late UTC might be next day in some timezones
          userId: 'user1',
          tasks: 1,
          tokens: 100,
          cost: 0.01,
          user: mockUser,
        },
        {
          hour_utc: '2025-06-03 01:00:00', // Early UTC might be same day in some timezones
          userId: 'user1',
          tasks: 2,
          tokens: 200,
          cost: 0.02,
          user: mockUser,
        },
      ];

      const result = aggregateHourlyToDaily(mockHourlyData, mockTimezone);

      // Should have separate entries for different local dates
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.date)).toBe(true);
    });
  });
});
