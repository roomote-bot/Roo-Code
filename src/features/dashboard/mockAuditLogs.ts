export type AuditLogType =
  | 'provider_whitelist'
  | 'default_parameters'
  | 'member_change';

export type AuditLogDetails = {
  before: unknown;
  after: unknown;
};

export type AuditLog = {
  id: string;
  type: AuditLogType;
  description: string;
  timestamp: Date;
  user: string;
  details: AuditLogDetails;
  path?: string;
};

export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    type: 'provider_whitelist',
    description: 'Added OpenAI to provider whitelist',
    timestamp: new Date(2025, 4, 10, 14, 30),
    user: 'John Doe',
    details: {
      before: ['Anthropic', 'Cohere'],
      after: ['Anthropic', 'Cohere', 'OpenAI'],
    },
    path: '/dashboard/organization-profile/provider-whitelist',
  },
  {
    id: '2',
    type: 'default_parameters',
    description: 'Updated default temperature parameter',
    timestamp: new Date(2025, 4, 9, 11, 15),
    user: 'Jane Smith',
    details: {
      before: { temperature: 0.7 },
      after: { temperature: 0.9 },
    },
    path: '/dashboard/organization-profile/default-parameters',
  },
  {
    id: '3',
    type: 'member_change',
    description: 'Changed role for Alex Johnson from Member to Admin',
    timestamp: new Date(2025, 4, 8, 9, 45),
    user: 'Sarah Williams',
    details: {
      before: { role: 'Member' },
      after: { role: 'Admin' },
    },
    path: '/dashboard/organization-profile/organization-members',
  },
  {
    id: '4',
    type: 'provider_whitelist',
    description: 'Removed Claude from provider whitelist',
    timestamp: new Date(2025, 4, 7, 16, 20),
    user: 'Michael Brown',
    details: {
      before: ['OpenAI', 'Claude', 'Cohere'],
      after: ['OpenAI', 'Cohere'],
    },
    path: '/dashboard/organization-profile/provider-whitelist',
  },
  {
    id: '5',
    type: 'default_parameters',
    description: 'Updated max tokens parameter',
    timestamp: new Date(2025, 4, 6, 13, 10),
    user: 'Emily Davis',
    details: {
      before: { max_tokens: 1000 },
      after: { max_tokens: 2000 },
    },
    path: '/dashboard/organization-profile/default-parameters',
  },
  {
    id: '6',
    type: 'member_change',
    description: 'Added new member David Wilson',
    timestamp: new Date(2025, 4, 5, 10, 30),
    user: 'John Doe',
    details: {
      before: null,
      after: {
        name: 'David Wilson',
        email: 'david@example.com',
        role: 'Member',
      },
    },
    path: '/dashboard/organization-profile/organization-members',
  },
  {
    id: '7',
    type: 'member_change',
    description: 'Removed member Lisa Taylor',
    timestamp: new Date(2025, 4, 4, 15, 45),
    user: 'Sarah Williams',
    details: {
      before: {
        name: 'Lisa Taylor',
        email: 'lisa@example.com',
        role: 'Member',
      },
      after: null,
    },
    path: '/dashboard/organization-profile/organization-members',
  },
];

export const getFilteredLogs = (days: number): AuditLog[] => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return mockAuditLogs.filter((log) => log.timestamp >= cutoff);
};

export const getFormattedTime = (date: Date): string => {
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 24) {
    return diffInHours === 0
      ? 'Just now'
      : diffInHours === 1
        ? '1 hour ago'
        : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
  }

  return date.toLocaleDateString();
};
