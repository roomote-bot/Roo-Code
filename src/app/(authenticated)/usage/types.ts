export const viewModes = ['developers', 'models', 'tasks'] as const;

export type ViewMode = (typeof viewModes)[number];

export type Model = {
  id: string;
  name: string;
  provider: string;
  tasks: number;
  tokensConsumed: number;
  cost: number;
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export type Task = {
  id: string;
  date: Date;
  developerId: string;
  developerName: string;
  modelId: string;
  modelName: string;
  tokensConsumed: number;
  cost: number;
  status: 'completed' | 'started' | 'failed';
  conversation: ConversationMessage[];
};

export type SummaryData = {
  activeDevelopers: number;
  tasksStarted: number;
  tasksCompleted: number;
  tokensConsumed: string;
  costs: number;
};

export type Filter = {
  type: 'developer' | 'model';
  id: string;
  name: string;
};
