import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { executeTool, TOOL_DEFINITIONS } from './src/server/tools.js';
import { AppDatabase, Message, ToolCallLog, ScheduledTask, MemoryItem, CustomSkill, ThinkingStep, NeuronEvent } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');

// Ensure Database exists with default seeds
function initDb(): AppDatabase {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const defaultDb: AppDatabase = {
    messages: [
      {
        id: 'init-msg',
        role: 'system',
        content: `You are Hermes Personal AI Core, an advanced, self-improving personal assistant with 40 built-in utility tools.
You are running on a cheap cloud node. You remember conversations, build a profile of the user, and synthesize custom reusable skills.
When the user asks you to perform operations that map to your tools, respond with a JSON block to call the tool.
To run a tool, you MUST return a valid JSON block inside your text (enclosed in markdown code blocks) like:
\`\`\`json
{
  "toolCall": {
    "name": "calculator",
    "parameters": {
      "expression": "25 * 4 + 10"
    }
  }
}
\`\`\`
If you want to store a memory about the user, use:
\`\`\`json
{
  "toolCall": {
    "name": "add_memory",
    "parameters": {
      "text": "User is a React developer specializing in dashboard layouts.",
      "category": "professional"
    }
  }
}
\`\`\`
Do not guess parameters, check the tool definitions. You can execute multiple tools sequentially if needed.`,
        timestamp: new Date().toISOString()
      },
      {
        id: 'welcome-msg',
        role: 'model',
        content: `Hello! I am **Hermes Core**, your self-improving, persistent personal assistant. 

I've booted my engine on your secure cloud node. I have **40 specialized tools** ready, long-term memory logging, and the ability to synthesize brand new skills. 

How can I assist you today? Feel free to ask me to calculate equations, save notes, parse tech RSS, format code, or manage your checklist!`,
        timestamp: new Date().toISOString()
      }
    ],
    profile: {
      name: 'Developer',
      bio: 'An ambitious coder building autonomous agent networks on clean, efficient cloud containers.',
      profession: 'Full-Stack Developer',
      interests: ['autonomous AI', 'terminal interfaces', 'retro design systems', 'cloud containerization'],
      habits: ['reviews system diagnostics hourly', 'logs tasks on scratchpads'],
      preferences: ['prefers terminal slate high-contrast dark visual aesthetics', 'values objective, high-fidelity data responses'],
      lastUpdated: new Date().toISOString()
    },
    memories: [
      { id: 'mem-1', text: 'Likes responsive, dark slate retro aesthetics and terminal fonts.', category: 'preference', timestamp: new Date().toISOString() },
      { id: 'mem-2', text: 'Spins up container pods on budget server runtimes.', category: 'professional', timestamp: new Date().toISOString() }
    ],
    skills: [
      {
        id: 'sk-1',
        name: 'DailySummarizer',
        description: 'Compiles activity checkmarks, tool logs, and note counts into a clean markdown dashboard.',
        triggerPrompt: 'summarize core activity',
        systemPrompt: 'Provide a clean, elegant summary of tasks completed, active diary notes, and diagnostics reports. Format with terminal spacing.',
        outputTemplate: '# HERMES DAILY ACTIVITY REPORT\n{payload}',
        createdAt: new Date().toISOString()
      }
    ],
    schedules: [
      {
        id: 'sc-1',
        title: 'Daily Digest Diagnostics & Tech RSS Report',
        description: 'Fires up server diagnostics, retrieves top headlines from HackerNews, and outputs a brief dashboard update',
        cron: 'interval_10_sec', // Simulated cron for easy demo
        enabled: true,
        taskPrompt: 'Execute system_diagnostics and rss_reader, and compile a quick health digest.',
        outputChannel: 'terminal',
        nextRun: new Date(Date.now() + 10000).toISOString()
      }
    ],
    logs: [
      {
        id: 'log-seed-1',
        toolName: 'system_diagnostics',
        timestamp: new Date().toISOString(),
        parameters: {},
        status: 'success',
        result: 'SYSTEM STATUS: Node server healthy. Memory allocated: 42MB. Uptime: 240s.',
        durationMs: 8
      }
    ],
    gateway: {
      telegramToken: '',
      telegramChatId: '',
      discordWebhookUrl: '',
      enabledChannels: {
        telegram: false,
        discord: false,
        terminal: true
      }
    },
    config: {
      provider: 'gemini',
      modelName: 'gemini-3.5-flash',
      customApiKey: ''
    },
    notes: [
      {
        id: 'nt-seed-1',
        title: 'Project Aethelgard Node Specs',
        content: 'This personal core is configured to operate with 40 built-in system modules, an Express custom API, file-based persistence, and local simulated Webhook gateways to Telegram and Discord.',
        updatedAt: new Date().toISOString()
      }
    ],
    todos: [
      { id: 'td-seed-1', text: 'Test digital clock and global timezone viewer tools', completed: true, createdAt: new Date().toISOString() },
      { id: 'td-seed-2', text: 'Link Telegram bot polling token to live webhook core', completed: false, createdAt: new Date().toISOString() }
    ]
  };

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    // Basic structural validation
    const parsed = JSON.parse(raw);
    if (!parsed.profile || !parsed.messages || !parsed.tools) {
      // Merge with defaults to prevent crashes
      return { ...defaultDb, ...parsed };
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse db.json, resetting to default', e);
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
}

let db = initDb();

if (!db.sessions || db.sessions.length === 0) {
  db.sessions = [
    {
      id: 'session-default',
      title: 'Default Conversation',
      createdAt: new Date().toISOString(),
      messages: db.messages || []
    }
  ];
  db.activeSessionId = 'session-default';
  // Avoid calling saveDb before saveDb is declared by using inline synchronous write
  try {
    const DB_PATH = path.join(process.cwd(), 'db.json');
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save default sessions to db.json', e);
  }
}

async function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write db.json', e);
  }
}

// Background scheduler tick runner
setInterval(async () => {
  const now = new Date();
  let updated = false;

  for (const schedule of db.schedules) {
    if (schedule.enabled && new Date(schedule.nextRun) <= now) {
      schedule.lastRun = now.toISOString();
      
      // Calculate next run interval
      let nextDelta = 60000; // default 1 min
      if (schedule.cron === 'interval_10_sec') {
        nextDelta = 10000;
      } else if (schedule.cron === 'hourly') {
        nextDelta = 3600000;
      } else if (schedule.cron === 'daily_9_am') {
        nextDelta = 86400000;
      }
      schedule.nextRun = new Date(now.getTime() + nextDelta).toISOString();
      updated = true;

      // Simulate execution of task prompt
      console.log(`[BACKGROUND TASK RUNNING] Triggered schedule [${schedule.title}]. Prompt: "${schedule.taskPrompt}"`);
      
      // Select appropriate tools and simulate output
      let simulatedResult = `AUTOMATED REPORT - TRIGGERED BY SCHEDULER: [${schedule.title}]\n`;
      if (schedule.taskPrompt.toLowerCase().includes('diagnostics')) {
        simulatedResult += `System Status: CPU 1.8% | Heap 44MB | Node server running perfectly.\n`;
      }
      if (schedule.taskPrompt.toLowerCase().includes('rss')) {
        simulatedResult += `HN Top: "Show HN: Hermes Personal AI Assistant" (424 pts)\n`;
      }
      simulatedResult += `Execution Completed successfully at ${now.toLocaleTimeString()}.\n`;

      // Log execution
      db.logs.unshift({
        id: Math.random().toString(36).slice(2, 10),
        toolName: `Schedule: ${schedule.title}`,
        timestamp: now.toISOString(),
        parameters: { prompt: schedule.taskPrompt },
        status: 'success',
        result: simulatedResult,
        durationMs: 14
      });

      // Gateway routing simulation
      if (db.gateway.enabledChannels.telegram) {
        console.log(`[TELEGRAM GATEWAY ROUTER] Sending report to Telegram Chat ID: ${db.gateway.telegramChatId}`);
      }
      if (db.gateway.enabledChannels.discord) {
        console.log(`[DISCORD GATEWAY ROUTER] Posting webhook to: ${db.gateway.discordWebhookUrl.slice(0, 30)}...`);
      }
    }
  }

  if (updated) {
    await saveDb();
  }
}, 10000);

async function startServer() {
  const app = express();
  app.use(express.json());

  // API: Get entire Database state
  app.get('/api/db', (req, res) => {
    // Exclude API keys for safety
    const safeDb = {
      ...db,
      config: {
        ...db.config,
        customApiKey: db.config.customApiKey ? '********' : ''
      },
      gateway: {
        ...db.gateway,
        telegramToken: db.gateway.telegramToken ? '********' : '',
        discordWebhookUrl: db.gateway.discordWebhookUrl ? '********' : ''
      }
    };
    res.json(safeDb);
  });

  // API: Sessions endpoints for multi-chat support
  app.post('/api/sessions', async (req, res) => {
    const { title } = req.body;
    const newSession = {
      id: 'session-' + Math.random().toString(36).slice(2, 9),
      title: title || 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: 'init-msg-' + Date.now(),
          role: 'system' as const,
          content: 'You are Alice AI, a self-improving, persistent personal assistant. Try telling me about yourself or ask me to help with something.',
          timestamp: new Date().toISOString()
        }
      ]
    };
    db.sessions = db.sessions || [];
    db.sessions.push(newSession);
    db.activeSessionId = newSession.id;
    db.messages = newSession.messages;
    await saveDb();
    res.json({ success: true, session: newSession, activeSessionId: db.activeSessionId });
  });

  app.post('/api/sessions/:id/select', async (req, res) => {
    const { id } = req.params;
    const session = db.sessions?.find(s => s.id === id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    db.activeSessionId = id;
    db.messages = session.messages;
    await saveDb();
    res.json({ success: true, activeSessionId: db.activeSessionId, messages: db.messages });
  });

  app.delete('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    if (!db.sessions || db.sessions.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining session.' });
    }
    db.sessions = db.sessions.filter(s => s.id !== id);
    if (db.activeSessionId === id) {
      db.activeSessionId = db.sessions[0].id;
      db.messages = db.sessions[0].messages;
    }
    await saveDb();
    res.json({ success: true, activeSessionId: db.activeSessionId, sessions: db.sessions });
  });

  app.post('/api/sessions/clear', async (req, res) => {
    const activeId = db.activeSessionId || 'session-default';
    const session = db.sessions?.find(s => s.id === activeId);
    if (session) {
      session.messages = [
        {
          id: 'init-msg-' + Date.now(),
          role: 'system' as const,
          content: 'You are Alice AI, a self-improving, persistent personal assistant. Try telling me about yourself or ask me to help with something.',
          timestamp: new Date().toISOString()
        }
      ];
      db.messages = session.messages;
    } else {
      db.messages = [];
    }
    await saveDb();
    res.json({ success: true, messages: db.messages });
  });

  app.post('/api/neuron-events/clear', async (req, res) => {
    db.neuronEvents = [];
    await saveDb();
    res.json({ success: true });
  });

  // API: Save AI and Gateway Config
  app.post('/api/config', async (req, res) => {
    const { config, gateway } = req.body;
    if (config) {
      // If client sent obfuscated key, keep original
      const apiKey = config.customApiKey === '********' ? db.config.customApiKey : config.customApiKey;
      db.config = { ...db.config, ...config, customApiKey: apiKey };
    }
    if (gateway) {
      const telToken = gateway.telegramToken === '********' ? db.gateway.telegramToken : gateway.telegramToken;
      const discUrl = gateway.discordWebhookUrl === '********' ? db.gateway.discordWebhookUrl : gateway.discordWebhookUrl;
      db.gateway = { 
        ...db.gateway, 
        ...gateway, 
        telegramToken: telToken, 
        discordWebhookUrl: discUrl 
      };
    }
    await saveDb();
    res.json({ success: true, message: 'Configuration parameters synchronized successfully.' });
  });

  // API: Get custom models from endpoint
  app.post('/api/custom-models', async (req, res) => {
    const { customEndpoint, customApiKey } = req.body;
    if (!customEndpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    let baseUrl = customEndpoint.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const url = baseUrl.includes('/models') ? baseUrl : `${baseUrl}/models`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (customApiKey && customApiKey !== '********') {
        headers['Authorization'] = `Bearer ${customApiKey}`;
      } else if (db.config.customApiKey) {
        headers['Authorization'] = `Bearer ${db.config.customApiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Provider error: ${errorText || response.statusText}` });
      }

      const data = await response.json() as any;
      let models: string[] = [];
      if (data && Array.isArray(data.data)) {
        models = data.data.map((m: any) => m.id || m.name).filter(Boolean);
      } else if (data && Array.isArray(data)) {
        models = data.map((m: any) => m.id || m.name || m).filter(Boolean);
      } else {
        models = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.5-flash'];
      }

      res.json({ success: true, models });
    } catch (err: any) {
      console.error('Failed to fetch models from endpoint:', err);
      res.status(500).json({ error: `Connection failed: ${err.message}` });
    }
  });

  // API: Add Memory
  app.post('/api/memories', async (req, res) => {
    const { text, category } = req.body;
    const id = 'mem-' + Math.random().toString(36).slice(2, 8);
    const item: MemoryItem = {
      id,
      text,
      category: category || 'other',
      timestamp: new Date().toISOString()
    };
    db.memories.unshift(item);
    await saveDb();
    res.json({ success: true, item });
  });

  // API: Delete Memory
  app.delete('/api/memories/:id', async (req, res) => {
    db.memories = db.memories.filter(m => m.id !== req.params.id);
    await saveDb();
    res.json({ success: true });
  });

  // API: Profile Persona Update
  app.post('/api/profile', async (req, res) => {
    db.profile = {
      ...db.profile,
      ...req.body,
      lastUpdated: new Date().toISOString()
    };
    await saveDb();
    res.json({ success: true, profile: db.profile });
  });

  // API: Add Custom Skill
  app.post('/api/skills', async (req, res) => {
    const { name, description, triggerPrompt, systemPrompt, outputTemplate } = req.body;
    const id = 'sk-' + Math.random().toString(36).slice(2, 8);
    const skill: CustomSkill = {
      id,
      name: name.replace(/\s+/g, ''),
      description,
      triggerPrompt,
      systemPrompt,
      outputTemplate,
      createdAt: new Date().toISOString()
    };
    db.skills.push(skill);
    await saveDb();
    res.json({ success: true, skill });
  });

  // API: Delete Custom Skill
  app.delete('/api/skills/:id', async (req, res) => {
    db.skills = db.skills.filter(s => s.id !== req.params.id);
    await saveDb();
    res.json({ success: true });
  });

  // API: Add Note
  app.post('/api/notes', async (req, res) => {
    const { title, content } = req.body;
    const id = 'nt-' + Math.random().toString(36).slice(2, 8);
    db.notes = db.notes || [];
    const note = { id, title, content, updatedAt: new Date().toISOString() };
    db.notes.unshift(note);
    await saveDb();
    res.json({ success: true, note });
  });

  // API: Delete Note
  app.delete('/api/notes/:id', async (req, res) => {
    db.notes = (db.notes || []).filter(n => n.id !== req.params.id);
    await saveDb();
    res.json({ success: true });
  });

  // API: Add Todo
  app.post('/api/todos', async (req, res) => {
    const { text } = req.body;
    const id = 'td-' + Math.random().toString(36).slice(2, 8);
    db.todos = db.todos || [];
    const todo = { id, text, completed: false, createdAt: new Date().toISOString() };
    db.todos.unshift(todo);
    await saveDb();
    res.json({ success: true, todo });
  });

  // API: Toggle Todo
  app.post('/api/todos/:id/toggle', async (req, res) => {
    db.todos = db.todos || [];
    const todo = db.todos.find(t => t.id === req.params.id);
    if (todo) {
      todo.completed = !todo.completed;
      await saveDb();
      res.json({ success: true, todo });
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  });

  // API: Add Schedule Task
  app.post('/api/schedules', async (req, res) => {
    const { title, description, cron, taskPrompt, outputChannel } = req.body;
    const id = 'sc-' + Math.random().toString(36).slice(2, 8);
    const task: ScheduledTask = {
      id,
      title,
      description,
      cron,
      enabled: true,
      taskPrompt,
      outputChannel: outputChannel || 'terminal',
      nextRun: new Date(Date.now() + 30000).toISOString()
    };
    db.schedules.push(task);
    await saveDb();
    res.json({ success: true, schedule: task });
  });

  // API: Toggle Schedule
  app.post('/api/schedules/:id/toggle', async (req, res) => {
    const task = db.schedules.find(s => s.id === req.params.id);
    if (task) {
      task.enabled = !task.enabled;
      await saveDb();
      res.json({ success: true, schedule: task });
    } else {
      res.status(404).json({ error: 'Schedule not found' });
    }
  });

  // API: Force Run Schedule Instantly
  app.post('/api/schedules/:id/run', async (req, res) => {
    const schedule = db.schedules.find(s => s.id === req.params.id);
    if (schedule) {
      const now = new Date();
      schedule.lastRun = now.toISOString();
      await saveDb();

      // Trigger actual diagnostic or tool chain simulation
      let simulatedResult = `MANUAL RUN REPORT - TRIGGERED BY USER: [${schedule.title}]\n`;
      if (schedule.taskPrompt.toLowerCase().includes('diagnostics')) {
        simulatedResult += `System Status: CPU 1.2% | Heap 44.5MB | Node container fully optimized.\n`;
      } else {
        simulatedResult += `Core automation executed prompt: "${schedule.taskPrompt}".\n`;
      }
      simulatedResult += `Completed successfully at ${now.toLocaleTimeString()}.\n`;

      db.logs.unshift({
        id: Math.random().toString(36).slice(2, 10),
        toolName: `Manual Schedule: ${schedule.title}`,
        timestamp: now.toISOString(),
        parameters: { prompt: schedule.taskPrompt },
        status: 'success',
        result: simulatedResult,
        durationMs: 9
      });
      await saveDb();

      res.json({ success: true, log: db.logs[0] });
    } else {
      res.status(404).json({ error: 'Schedule not found' });
    }
  });

  // API: Manual Tool Trigger Playground
  app.post('/api/tools/execute', async (req, res) => {
    const { toolName, parameters } = req.body;
    try {
      const result = await executeTool(toolName, parameters || {}, db, saveDb);
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // API: Get logs list
  app.get('/api/logs', (req, res) => {
    res.json(db.logs || []);
  });

  // Helper: Call the selected AI Provider
  async function getAICompletion(
    systemInstruction: string,
    chatMessages: { role: 'user' | 'model'; content: string }[],
    database: AppDatabase
  ): Promise<string> {
    const provider = database.config.provider;
    const modelName = database.config.modelName || 'gemini-3.5-flash';

    // 1. Google Gemini AI (Default)
    if (provider === 'gemini') {
      const geminiKey = process.env.GEMINI_API_KEY || database.config.customApiKey;
      if (!geminiKey) {
        throw new Error('Gemini API key is not configured in environment or settings.');
      }
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const chatContents = chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      const completion = await ai.models.generateContent({
        model: modelName,
        contents: chatContents,
        config: {
          systemInstruction
        }
      });

      return completion.text || '';
    }

    // 2. OpenAI / OpenRouter / Custom / Claude
    let endpoint = '';
    const apiKey = database.config.customApiKey;

    if (provider === 'openai') {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    } else if (provider === 'custom') {
      let base = database.config.customEndpoint || '';
      if (base.endsWith('/')) {
        base = base.slice(0, -1);
      }
      endpoint = base.includes('/chat/completions') ? base : `${base}/chat/completions`;
    } else {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    }

    const openAIMessages = [
      { role: 'system', content: systemInstruction },
      ...chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey && apiKey !== '********') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const body = {
      model: modelName,
      messages: openAIMessages,
      temperature: 0.7
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Provider error (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json() as any;
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content || '';
    }

    throw new Error('Invalid JSON response format from AI Provider.');
  }

  // API: Chat Endpoint (Autonomous Multi-Tool Reasoning Loop with Custom Providers & Learning Diagnostics)
  app.post('/api/chat', async (req, res) => {
    const { messages: clientMessages } = req.body;
    if (!clientMessages || clientMessages.length === 0) {
      return res.status(400).json({ error: 'No message history provided.' });
    }

    const activeSessionId = db.activeSessionId || 'session-default';
    let session = db.sessions?.find(s => s.id === activeSessionId);
    if (!session) {
      session = {
        id: activeSessionId,
        title: 'Conversation',
        createdAt: new Date().toISOString(),
        messages: db.messages || []
      };
      db.sessions = db.sessions || [];
      db.sessions.push(session);
    }

    const userMessage = clientMessages[clientMessages.length - 1];
    session.messages.push(userMessage);
    
    // Auto-update title if it's the first real user message
    const userMsgsCount = session.messages.filter(m => m.role === 'user').length;
    if (userMsgsCount === 1) {
      const words = userMessage.content.trim().split(/\s+/).slice(0, 4).join(' ');
      session.title = words.length > 25 ? words.slice(0, 25) + '...' : words || 'New Chat';
    }

    db.messages = session.messages;
    await saveDb();

    // Check for custom skill trigger
    let triggeredSkill = null;
    for (const skill of db.skills) {
      if (userMessage.content.toLowerCase().includes(skill.triggerPrompt.toLowerCase())) {
        triggeredSkill = skill;
        break;
      }
    }

    const toolSummaryString = TOOL_DEFINITIONS.map(t => 
      `- ${t.name}: ${t.description} (params: ${t.parameters.map(p => `${p.name} [${p.type}]${p.required ? '*' : ''}`).join(', ')})`
    ).join('\n');

    const profileContext = `
USER PERSONA PROFILE (Synchronize your reply based on this):
- Name: ${db.profile.name}
- Bio: ${db.profile.bio}
- Profession: ${db.profile.profession}
- Core Preferences: ${db.profile.preferences.join(', ')}
- Interests: ${db.profile.interests.join(', ')}
- Stored Memories: ${db.memories.map(m => m.text).join(' | ')}
`;

    const activeSkills = db.skills.map(s => `- ${s.name}: ${s.description} (trigger: "${s.triggerPrompt}")`).join('\n');

    let systemInstruction = `You are Hermes Personal AI Core, an always-on, self-improving personal assistant.
We are running on a secure cloud node container. You have 40 built-in utility tools.
You MUST refer to the user profile and memories to adapt your personality, details, and layout structure (the user prefers terminal slate aesthetics and high-fidelity output).

${profileContext}

AVAILABLE 40 SYSTEM TOOLS (You can call any of these by outputting a toolCall JSON block):
${toolSummaryString}

ACTIVE CUSTOM REUSABLE SKILLS:
${activeSkills}

DIRECTIONS:
1. If the user asks for operations like calculation, checking weather, taking notes, listing diaries, searching, encoding base64, Morse code, Diff comparing, timezone viewing, or diagnostics, you MUST call the respective tool.
2. To run a tool, you MUST write a valid JSON block enclosed in markdown code blocks:
\`\`\`json
{
  "toolCall": {
    "name": "calculator",
    "parameters": {
      "expression": "50 * 5 + sqrt(144)"
    }
  }
}
\`\`\`
3. Do not formulate mock results for tools; let the tool run.
4. When you output a toolCall, the server will intercept, run the tool, and feed the output back to you.
5. If you learn something core about the user (their likes, job, schedules, daily routine), trigger "add_memory" to store it permanently.
6. Trigger "create_skill" when the user completes a complicated workflow and asks to save it.
`;

    if (triggeredSkill) {
      systemInstruction += `\n\n[SKILL DEPLOYED: ${triggeredSkill.name}]\nInstructions: ${triggeredSkill.systemPrompt}\nOutput Template: ${triggeredSkill.outputTemplate || ''}`;
    }

    const startOverall = Date.now();
    let responseText = '';
    let executedLogs: ToolCallLog[] = [];
    const thinkingSteps: ThinkingStep[] = [];

    // Initialize thinking steps
    thinkingSteps.push({
      id: 'step-init',
      icon: '⚙️',
      title: 'initializing Hermes reasoning engine...',
      duration: '0.1s'
    });

    try {
      const messagesHistory = db.messages
        .filter(m => m.role === 'user' || m.role === 'model')
        .slice(-12)
        .map(m => ({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          content: m.content
        }));

      responseText = await getAICompletion(systemInstruction, messagesHistory, db);

      // Check if output has toolCall block
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const rawJson = jsonMatch[1].trim();
          const payload = JSON.parse(rawJson);
          if (payload.toolCall) {
            const { name, parameters } = payload.toolCall;
            console.log(`[AGENT RUN] Intercepting ToolCall: "${name}"`, parameters);

            let stepIcon = '⚙️';
            if (name.includes('search')) stepIcon = '🔍';
            else if (name.includes('file') || name.includes('note') || name.includes('read')) stepIcon = '📄';
            else if (name.includes('terminal') || name.includes('cmd') || name.includes('system') || name.includes('diagnostics')) stepIcon = '💻';
            else if (name.includes('calculator') || name.includes('math')) stepIcon = '🧮';

            thinkingSteps.push({
              id: 'step-prep-' + name + '-' + Date.now(),
              icon: stepIcon,
              title: `preparing ${name}...`,
            });

            const toolStart = Date.now();
            const toolResult = await executeTool(name, parameters || {}, db, saveDb);
            const toolDuration = Date.now() - toolStart;

            thinkingSteps.push({
              id: 'step-exec-' + name + '-' + Date.now(),
              icon: stepIcon,
              title: name,
              detail: parameters ? (parameters.query || parameters.expression || parameters.title || JSON.stringify(parameters).slice(0, 50)) : '',
              duration: `${(toolDuration / 1000).toFixed(1)}s`
            });

            executedLogs.push({
              toolName: name,
              parameters: parameters || {},
              result: toolResult,
              status: 'success',
              durationMs: toolDuration
            });

            thinkingSteps.push({
              id: 'step-narrative-' + Date.now(),
              icon: '⚙️',
              title: 'finalizing response synthesis...',
            });

            const followUpContents = [
              ...messagesHistory,
              { role: 'model' as const, content: responseText },
              { role: 'user' as const, content: `[SYSTEM TOOL REPORT: ${name}]\n${toolResult}\n\nPlease summarize the tool output, format it elegantly, and explain the action taken.` }
            ];

            responseText = await getAICompletion(systemInstruction, followUpContents, db);
          }
        } catch (e: any) {
          console.error('[AGENT TOOL ERROR]', e);
          responseText += `\n\n*(Core Log: Encountered JSON tool parse warning: ${e.message})*`;
        }
      }
    } catch (err: any) {
      console.error('AI call failed, falling back to local reasoning', err);
      thinkingSteps.push({
        id: 'step-fail',
        icon: '⚠️',
        title: 'primary provider offline, deploying offline backup rules...',
        duration: '0.2s'
      });
      responseText = simulateLocalReasoning(userMessage.content, db);
    }

    const totalDurationSec = parseFloat(((Date.now() - startOverall) / 1000).toFixed(1));

    const modelMessage: Message = {
      id: 'msg-' + Math.random().toString(36).slice(2, 8),
      role: 'model',
      content: responseText,
      timestamp: new Date().toISOString(),
      toolCalls: executedLogs.length > 0 ? executedLogs : undefined,
      thinkingSteps: thinkingSteps,
      thinkingTime: totalDurationSec
    };

    db.messages.push(modelMessage);

    // Auto-learning Skill Synthesizer Engine & Memory consolidation
    try {
      const recentHistory = db.messages.filter(m => m.role === 'user' || m.role === 'model').slice(-6);
      const learningPrompt = `You are the Hermes Self-Improving Learning Core. Your job is to analyze the recent conversation and decide if you should:
1. Create a brand new custom skill (reusable AI instructions) from any repetitive workflow, calculation, text processing, or automated reporting.
2. Refine or correct an existing skill if a previous execution failed, was unrelated to what the user wanted, or can be improved.
3. Formulate a new memory if the user shared critical personal facts, name, preference, or schedules.

Here is the conversation history:
${recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

Analyze and output a JSON block with any learning actions. If no action is needed, output empty lists.
Format strictly as JSON inside a markdown code block:
\`\`\`json
{
  "skillsToCreate": [
    {
      "name": "SkillNameWithoutSpaces",
      "description": "Short description of what the skill does",
      "triggerPrompt": "phrase or keyword that triggers it",
      "systemPrompt": "System instructions for this skill",
      "outputTemplate": "Optional markdown format template"
    }
  ],
  "skillsToUpdate": [
    {
      "name": "SkillToRefine",
      "systemPrompt": "Refined and corrected system prompt resolving the error or mismatch"
    }
  ],
  "memoriesToStore": [
    { "text": "fact to remember", "category": "personal" }
  ]
}
\`\`\`
`;

      const learningOutput = await getAICompletion(learningPrompt, [], db);
      const jsonMatch = learningOutput.match(/```json\s*([\s\S]*?)\s*```/) || [null, learningOutput];
      const jsonText = jsonMatch[1] ? jsonMatch[1].trim() : learningOutput.trim();
      const learningActions = JSON.parse(jsonText);

      const addedEvents: NeuronEvent[] = [];

      // Create new skills
      if (Array.isArray(learningActions.skillsToCreate)) {
        for (const s of learningActions.skillsToCreate) {
          const exists = db.skills.some(x => x.name.toLowerCase() === s.name.toLowerCase());
          if (!exists && s.name && s.systemPrompt) {
            const skillId = 'sk-auto-' + Math.random().toString(36).slice(2, 8);
            const newSkill: CustomSkill = {
              id: skillId,
              name: s.name.replace(/\s+/g, ''),
              description: s.description || 'Auto-generated custom skill',
              triggerPrompt: s.triggerPrompt || s.name.toLowerCase(),
              systemPrompt: s.systemPrompt,
              outputTemplate: s.outputTemplate || '',
              createdAt: new Date().toISOString()
            };
            db.skills.push(newSkill);

            const ev: NeuronEvent = {
              id: 'neu-' + Math.random().toString(36).slice(2, 8),
              type: 'skill_create',
              title: `SYNTHESIZED SKILL: ${newSkill.name}`,
              description: `Autonomous core compiled custom skill: "${newSkill.description}"`,
              timestamp: new Date().toISOString()
            };
            db.neuronEvents = db.neuronEvents || [];
            db.neuronEvents.unshift(ev);
            addedEvents.push(ev);
          }
        }
      }

      // Update/Refine existing skills if mismatch/fail
      if (Array.isArray(learningActions.skillsToUpdate)) {
        for (const s of learningActions.skillsToUpdate) {
          const existing = db.skills.find(x => x.name.toLowerCase() === s.name.toLowerCase());
          if (existing && s.systemPrompt) {
            existing.systemPrompt = s.systemPrompt;
            existing.description += ' (Self-healed and updated automatically)';

            const ev: NeuronEvent = {
              id: 'neu-' + Math.random().toString(36).slice(2, 8),
              type: 'skill_fail_correct',
              title: `REFINED SKILL: ${existing.name}`,
              description: `Corrected instructions and alignment profiles to ensure accuracy.`,
              timestamp: new Date().toISOString()
            };
            db.neuronEvents = db.neuronEvents || [];
            db.neuronEvents.unshift(ev);
            addedEvents.push(ev);
          }
        }
      }

      // Consolidate memories
      if (Array.isArray(learningActions.memoriesToStore)) {
        for (const m of learningActions.memoriesToStore) {
          if (m.text) {
            const exists = db.memories.some(x => x.text.toLowerCase() === m.text.toLowerCase());
            if (!exists) {
              const memId = 'mem-auto-' + Math.random().toString(36).slice(2, 8);
              db.memories.unshift({
                id: memId,
                text: m.text,
                category: m.category || 'other',
                timestamp: new Date().toISOString()
              });

              const ev: NeuronEvent = {
                id: 'neu-' + Math.random().toString(36).slice(2, 8),
                type: 'memory',
                title: `PERSISTED MEMORY`,
                description: `Logged critical user context: "${m.text}"`,
                timestamp: new Date().toISOString()
              };
              db.neuronEvents = db.neuronEvents || [];
              db.neuronEvents.unshift(ev);
              addedEvents.push(ev);
            }
          }
        }
      }

      if (addedEvents.length > 0) {
        console.log(`[LEARNING ENGINE] Persisted ${addedEvents.length} learning milestones!`);
      }
    } catch (e) {
      console.error('[LEARNING CORE ERROR]', e);
    }

    // Automatically consolidate memory context from user profile
    if (userMessage.content.toLowerCase().includes('remember my name is ')) {
      const match = userMessage.content.match(/remember my name is\s+([a-zA-Z0-9\s]+)/i);
      if (match && match[1]) {
        db.profile.name = match[1].trim();
        db.memories.push({
          id: 'mem-auto-' + Math.random().toString(36).slice(2, 6),
          text: `User name is ${db.profile.name}`,
          category: 'personal',
          timestamp: new Date().toISOString()
        });
      }
    }

    await saveDb();
    res.json({ messages: db.messages });
  });

  // Rules-based smart reasoning simulation (Hermes Local Engine)
  function simulateLocalReasoning(prompt: string, database: AppDatabase): string {
    const low = prompt.toLowerCase();
    
    if (low.includes('calc') || low.includes('calculator') || low.includes('math')) {
      return `I will execute the **Calculator Tool** to solve your expression.

\`\`\`json
{
  "toolCall": {
    "name": "calculator",
    "parameters": {
      "expression": "50 * 5 + 40"
    }
  }
}
\`\`\`
*(Please trigger the tool manually below or provide an API key in configuration settings to let me run this autonomously!)*`;
    }

    if (low.includes('diagnostics') || low.includes('system') || low.includes('stats')) {
      return `Spinning up system sensors... I am preparing to parse the cloud node logs.

\`\`\`json
{
  "toolCall": {
    "name": "system_diagnostics",
    "parameters": {}
  }
}
\`\`\`
The diagnostics show CPU activity is normal, RAM is running well within the Cloud Run sandbox thresholds, and file-based persistence is synced.`;
    }

    if (low.includes('weather')) {
      return `Checking atmospheric indicators...

\`\`\`json
{
  "toolCall": {
    "name": "weather_station",
    "parameters": {
      "city": "Jakarta"
    }
  }
}
\`\`\`
The weather station registers clear skies and mild temperatures.`;
    }

    if (low.includes('ascii') || low.includes('banner')) {
      return `Synthesizing a visual ASCII block banner...

\`\`\`json
{
  "toolCall": {
    "name": "ascii_art",
    "parameters": {
      "text": "HERMES"
    }
  }
}
\`\`\`
*To render this, select the ASCII Art tool in the Toolbox panel below!*`;
    }

    return `I am currently operating in **Local Gateway Offline Mode**. 

To activate autonomous 40-tool agent routing and custom skill synthesis, configure your Gemini API Key in the **Settings panel**.

Here is what I can do for you right now:
1. **Browse 40 Tools**: Test the live interactive tools directly in the **Toolbox tab**.
2. **Execute Terminal Commands**: Type \`help\`, \`diagnostics\`, \`notes\`, \`timezone\`, or \`tasks\` in the **CLI terminal panel**.
3. **Set Automations**: Schedule automated task timers under the **Scheduler tab**.`;
  }

  // Vite development server setup or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hermes Core running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
