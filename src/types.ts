/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThinkingStep {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  duration?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCallLog[];
  thinkingSteps?: ThinkingStep[];
  thinkingTime?: number; // Thinking time in seconds
}

export interface ToolCallLog {
  toolName: string;
  parameters: Record<string, any>;
  result: string;
  status: 'success' | 'failed';
  durationMs?: number;
}

export interface UserProfile {
  bio: string;
  name: string;
  preferences: string[];
  interests: string[];
  profession: string;
  habits: string[];
  lastUpdated: string;
}

export interface MemoryItem {
  id: string;
  text: string;
  category: 'personal' | 'professional' | 'preference' | 'habit' | 'other';
  timestamp: string;
}

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  triggerPrompt: string; // user prompt keyword/trigger
  systemPrompt: string; // custom instructions for this skill
  outputTemplate?: string; // markdown or visual template
  parametersJson?: string; // JSON schema for parameters
  createdAt: string;
}

export interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  cron: string; // cron expression (e.g. "0 9 * * *" or "interval_10_sec")
  lastRun?: string;
  nextRun: string;
  enabled: boolean;
  taskPrompt: string; // prompt to feed the LLM when executing
  outputChannel: 'terminal' | 'telegram' | 'discord' | 'all';
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'system' | 'memory' | 'utility' | 'text' | 'information' | 'creative';
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
    defaultValue?: any;
  }[];
}

export interface ToolLog {
  id: string;
  toolName: string;
  timestamp: string;
  parameters: Record<string, any>;
  status: 'success' | 'failed';
  result: string;
  durationMs: number;
}

export interface GatewayConfig {
  telegramToken: string;
  telegramChatId: string;
  discordWebhookUrl: string;
  enabledChannels: {
    telegram: boolean;
    discord: boolean;
    terminal: boolean;
  };
}

export interface NeuronEvent {
  id: string;
  type: 'memory' | 'skill_create' | 'skill_update' | 'skill_fail_correct';
  title: string;
  description: string;
  timestamp: string;
}

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'custom';
  modelName: string;
  customApiKey: string;
  customEndpoint?: string;
  availableModels?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

export interface SelfLearningItem {
  id: string;
  type: 'conversation' | 'task' | 'code_fix' | 'failure_healing';
  title: string;
  description: string;
  details?: string;
  timestamp: string;
  status: 'learned' | 'reinforced' | 'healing_completed';
}

export interface AppDatabase {
  messages: Message[];
  sessions?: ChatSession[];
  activeSessionId?: string;
  profile: UserProfile;
  memories: MemoryItem[];
  skills: CustomSkill[];
  schedules: ScheduledTask[];
  logs: ToolLog[];
  gateway: GatewayConfig;
  config: AIConfig;
  notes: { id: string; title: string; content: string; updatedAt: string }[];
  todos: { id: string; text: string; completed: boolean; createdAt: string }[];
  neuronEvents?: NeuronEvent[];
  learnings?: SelfLearningItem[];
}
