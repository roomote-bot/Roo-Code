export const viewModes = [
  'developers',
  'models',
  'repositories',
  'tasks',
] as const;

export type ViewMode = (typeof viewModes)[number];

export type Filter = {
  type: 'userId' | 'model' | 'repositoryName';
  value: string;
  label: string;
};
