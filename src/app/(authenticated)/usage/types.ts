export const viewModes = ['developers', 'models', 'tasks'] as const;

export type ViewMode = (typeof viewModes)[number];

export type Filter = { type: 'userId' | 'model'; value: string; label: string };
