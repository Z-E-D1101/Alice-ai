/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Brain, 
  Wrench, 
  Clock, 
  Settings, 
  Trash2, 
  Plus, 
  Play, 
  BookOpen, 
  CheckSquare, 
  Bot, 
  Send, 
  Save, 
  Globe, 
  RefreshCw, 
  User, 
  Hash, 
  Calendar, 
  AlertTriangle, 
  Check, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  LogOut,
  Sliders, 
  Layers, 
  ArrowRight,
  Info,
  Menu,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppDatabase, Message, MemoryItem, CustomSkill, ScheduledTask, ToolDefinition, ToolLog } from './types.js';
import { NeuronLive } from './components/NeuronLive.js';
import { InteractiveNeuronNetwork } from './components/InteractiveNeuronNetwork.js';
import { ThinkingStepsView } from './components/ThinkingStepsView.js';
import { CustomProviderSettings } from './components/CustomProviderSettings.js';
import ReactMarkdown from 'react-markdown';
import { SyntaxHighlighter } from './components/SyntaxHighlighter.js';

// Hardcoded matching list of 40 tools for rich instant client-side rendering & filtering
const CLIENT_TOOLS: { name: string; description: string; category: 'memory' | 'utility' | 'text' | 'information' | 'creative'; parameters: { name: string; type: 'string' | 'number' | 'boolean'; description: string; required: boolean; defaultValue?: any }[] }[] = [
  {
    name: 'web_search',
    description: 'Queries the internet for dynamic articles and information on any topic.',
    category: 'information',
    parameters: [{ name: 'query', type: 'string', description: 'Search term or query', required: true }]
  },
  {
    name: 'add_memory',
    description: 'Stores a critical fact about the user (preferences, profession, habits) in persistent memory.',
    category: 'memory',
    parameters: [
      { name: 'text', type: 'string', description: 'The personal fact or context to remember', required: true },
      { name: 'category', type: 'string', description: 'personal | professional | preference | habit | other', required: false, defaultValue: 'other' }
    ]
  },
  {
    name: 'get_memories',
    description: 'Lists all stored memories and contextual profiles.',
    category: 'memory',
    parameters: [{ name: 'category', type: 'string', description: 'Optional filter by category', required: false }]
  },
  {
    name: 'update_profile',
    description: 'Updates specific fields of the user profile persona (bio, name, profession, habits, interests).',
    category: 'memory',
    parameters: [
      { name: 'name', type: 'string', description: 'User Name', required: false },
      { name: 'bio', type: 'string', description: 'Brief background info', required: false },
      { name: 'profession', type: 'string', description: 'Occupation', required: false },
      { name: 'interests', type: 'string', description: 'Comma-separated user interests', required: false },
      { name: 'habits', type: 'string', description: 'Comma-separated user habits', required: false },
      { name: 'preferences', type: 'string', description: 'Comma-separated core preferences', required: false }
    ]
  },
  {
    name: 'create_skill',
    description: 'Synthesizes a brand new reusable AI Skill (trigger, custom system instruction, templates).',
    category: 'memory',
    parameters: [
      { name: 'name', type: 'string', description: 'Brief skill name (e.g. EmailResponder)', required: true },
      { name: 'description', type: 'string', description: 'What the skill does', required: true },
      { name: 'triggerPrompt', type: 'string', description: 'Phrase or keyword that triggers this skill', required: true },
      { name: 'systemPrompt', type: 'string', description: 'Expert system instructions for the LLM', required: true },
      { name: 'outputTemplate', type: 'string', description: 'Formatting template or structure', required: false }
    ]
  },
  {
    name: 'execute_skill',
    description: 'Executes a custom-synthesized reusable skill by running its system templates.',
    category: 'memory',
    parameters: [
      { name: 'skillName', type: 'string', description: 'The exact name of the skill to execute', required: true },
      { name: 'inputPayload', type: 'string', description: 'The custom input content to feed into the skill template', required: true }
    ]
  },
  {
    name: 'add_schedule',
    description: 'Registers a timed automated task (daily digests, interval scripts) with output routing.',
    category: 'utility',
    parameters: [
      { name: 'title', type: 'string', description: 'Descriptive title', required: true },
      { name: 'description', type: 'string', description: 'What the automation accomplishes', required: true },
      { name: 'cron', type: 'string', description: 'Cron layout or preset: "daily_9_am" | "hourly" | "interval_10_sec"', required: true },
      { name: 'taskPrompt', type: 'string', description: 'Task context prompt to trigger', required: true },
      { name: 'outputChannel', type: 'string', description: 'terminal | telegram | discord | all', required: false, defaultValue: 'terminal' }
    ]
  },
  {
    name: 'get_schedules',
    description: 'Lists all current scheduled automation runs.',
    category: 'utility',
    parameters: []
  },
  {
    name: 'calculator',
    description: 'Performs scientific calculations, formula parses, and basic arithmetic safely.',
    category: 'utility',
    parameters: [{ name: 'expression', type: 'string', description: 'Math expression (e.g. sqrt(144) + 25 * 4)', required: true }]
  },
  {
    name: 'add_note',
    description: 'Saves an entry into the server note repository.',
    category: 'memory',
    parameters: [
      { name: 'title', type: 'string', description: 'Title of the note', required: true },
      { name: 'content', type: 'string', description: 'Body markdown content of the note', required: true }
    ]
  },
  {
    name: 'list_notes',
    description: 'Retrieves all notes stored in the server diary.',
    category: 'memory',
    parameters: []
  },
  {
    name: 'delete_note',
    description: 'Deletes a note from the server diary database.',
    category: 'memory',
    parameters: [{ name: 'id', type: 'string', description: 'The unique ID of the note to delete', required: true }]
  },
  {
    name: 'add_todo',
    description: 'Adds a task to your checklist.',
    category: 'utility',
    parameters: [{ name: 'text', type: 'string', description: 'Task checklist content', required: true }]
  },
  {
    name: 'toggle_todo',
    description: 'Toggles completed checkmark status of a todo.',
    category: 'utility',
    parameters: [{ name: 'id', type: 'string', description: 'The todo ID', required: true }]
  },
  {
    name: 'list_todos',
    description: 'Retrieves all todo list checkmarks.',
    category: 'utility',
    parameters: []
  },
  {
    name: 'dictionary',
    description: 'Looks up words, returning structured definition, speech class, and synonyms.',
    category: 'text',
    parameters: [{ name: 'word', type: 'string', description: 'Word to search', required: true }]
  },
  {
    name: 'unit_converter',
    description: 'Converts units of temperature (C/F), weight (kg/lb), distance (km/mi), or speed.',
    category: 'utility',
    parameters: [
      { name: 'value', type: 'number', description: 'Numeric size to convert', required: true },
      { name: 'from', type: 'string', description: 'Source unit (C, F, kg, lb, km, mi)', required: true },
      { name: 'to', type: 'string', description: 'Destination unit', required: true }
    ]
  },
  {
    name: 'base64_encode',
    description: 'Encodes any text string to standard Base64 format.',
    category: 'text',
    parameters: [{ name: 'text', type: 'string', description: 'Plain text input', required: true }]
  },
  {
    name: 'base64_decode',
    description: 'Decodes a standard Base64 string back into plain readable text.',
    category: 'text',
    parameters: [{ name: 'encoded', type: 'string', description: 'Base64 encoded input string', required: true }]
  },
  {
    name: 'json_formatter',
    description: 'Beautifies and validates custom JSON blocks with proper tab layouts.',
    category: 'text',
    parameters: [{ name: 'json', type: 'string', description: 'Raw JSON input string', required: true }]
  },
  {
    name: 'regex_tester',
    description: 'Tests whether a regular expression matches a string, returning highlighted match groups.',
    category: 'text',
    parameters: [
      { name: 'regex', type: 'string', description: 'Regex pattern string', required: true },
      { name: 'text', type: 'string', description: 'Text block to search', required: true },
      { name: 'flags', type: 'string', description: 'Regex modifiers (g, i, m)', required: false, defaultValue: 'gi' }
    ]
  },
  {
    name: 'uuid_generator',
    description: 'Generates secure, randomized Version 4 UUIDs.',
    category: 'utility',
    parameters: [{ name: 'count', type: 'number', description: 'How many UUIDs to generate', required: false, defaultValue: 1 }]
  },
  {
    name: 'hash_generator',
    description: 'Generates secure SHA-256, SHA-1, or MD5 checksum hashes of string contents.',
    category: 'utility',
    parameters: [
      { name: 'text', type: 'string', description: 'Text contents to hash', required: true },
      { name: 'algorithm', type: 'string', description: 'sha256 | sha1 | md5', required: false, defaultValue: 'sha256' }
    ]
  },
  {
    name: 'ascii_art',
    description: 'Transforms string alphanumeric text into elegant 3D block-style ASCII art signs.',
    category: 'creative',
    parameters: [{ name: 'text', type: 'string', description: 'Text to transform (keep brief)', required: true }]
  },
  {
    name: 'password_generator',
    description: 'Generates strong, randomized passwords with customizable complexity sets.',
    category: 'utility',
    parameters: [
      { name: 'length', type: 'number', description: 'Length of the password', required: false, defaultValue: 16 },
      { name: 'includeSymbols', type: 'boolean', description: 'Include symbols like @#$*', required: false, defaultValue: true },
      { name: 'includeNumbers', type: 'boolean', description: 'Include numbers', required: false, defaultValue: true }
    ]
  },
  {
    name: 'ip_lookup',
    description: 'Performs geolocation query on a public IP or Domain, returning connection records.',
    category: 'information',
    parameters: [{ name: 'ipOrDomain', type: 'string', description: 'Domain or IP address', required: true }]
  },
  {
    name: 'timezone_clock',
    description: 'Displays current times in major cities around the globe (UTC, Tokyo, New York, London, Jakarta).',
    category: 'information',
    parameters: [{ name: 'cityFilter', type: 'string', description: 'Filter result by specific city name', required: false }]
  },
  {
    name: 'url_parser',
    description: 'Deconstructs standard URLs into scheme, hostname, pathname, port, and query keys.',
    category: 'utility',
    parameters: [{ name: 'url', type: 'string', description: 'Target URL', required: true }]
  },
  {
    name: 'markdown_stripper',
    description: 'Strips out markdown syntax (headers, links, emphasis) to yield plain pristine text.',
    category: 'text',
    parameters: [{ name: 'markdown', type: 'string', description: 'Rich markdown content', required: true }]
  },
  {
    name: 'weather_station',
    description: 'Retrieves current weather status and 3-day conditions for any city.',
    category: 'information',
    parameters: [{ name: 'city', type: 'string', description: 'City and region (e.g. Jakarta, ID)', required: true }]
  },
  {
    name: 'currency_converter',
    description: 'Calculates currency exchange values for major trade coins (USD, EUR, IDR, GBP, JPY).',
    category: 'utility',
    parameters: [
      { name: 'amount', type: 'number', description: 'Monetary sum to convert', required: true },
      { name: 'from', type: 'string', description: 'Source currency symbol (e.g. USD)', required: true },
      { name: 'to', type: 'string', description: 'Destination currency symbol (e.g. EUR)', required: true }
    ]
  },
  {
    name: 'countdown_timer',
    description: 'Registers a server stopwatch trigger which fires system execution reports after expiry.',
    category: 'utility',
    parameters: [
      { name: 'seconds', type: 'number', description: 'Timer countdown in seconds', required: true },
      { name: 'label', type: 'string', description: 'Timer description', required: false, defaultValue: 'Quick Timer' }
    ]
  },
  {
    name: 'word_stats',
    description: 'Analyzes string characters, sentence indexes, syllables, readability, and read duration.',
    category: 'text',
    parameters: [{ name: 'text', type: 'string', description: 'Input text block to analyze', required: true }]
  },
  {
    name: 'color_palette',
    description: 'Synthesizes professional design color schemes (Complementary, Triadic) from seed hex.',
    category: 'creative',
    parameters: [{ name: 'hex', type: 'string', description: 'Seed color hex code (e.g. #6366F1)', required: true }]
  },
  {
    name: 'text_translator',
    description: 'Translates a block of text into other languages (English, Indonesian, Spanish, French, Japanese).',
    category: 'text',
    parameters: [
      { name: 'text', type: 'string', description: 'Source text to translate', required: true },
      { name: 'targetLanguage', type: 'string', description: 'Target Language (en, id, es, fr, ja)', required: true }
    ]
  },
  {
    name: 'qr_code',
    description: 'Draws a high-contrast text-based visual grid mimicking a QR code scanning node.',
    category: 'creative',
    parameters: [{ name: 'payload', type: 'string', description: 'The text or link to encode in QR format', required: true }]
  },
  {
    name: 'morse_code',
    description: 'Translates text strings to Morse Code audio-visual blocks or decodes back to plain letters.',
    category: 'text',
    parameters: [
      { name: 'text', type: 'string', description: 'Text contents to process', required: true },
      { name: 'direction', type: 'string', description: 'encode | decode', required: false, defaultValue: 'encode' }
    ]
  },
  {
    name: 'diff_checker',
    description: 'Compares two text block files, highlighting line insertions, deletions, and corrections.',
    category: 'text',
    parameters: [
      { name: 'original', type: 'string', description: 'Original source text block', required: true },
      { name: 'modified', type: 'string', description: 'Modified target text block', required: true }
    ]
  },
  {
    name: 'system_diagnostics',
    description: 'Reads active Node.js server diagnostic profiles: OS uptime, memory use, CPU loads, and storage limits.',
    category: 'information',
    parameters: []
  },
  {
    name: 'rss_reader',
    description: 'Fetches top technology news headlines, trends, and digest lists.',
    category: 'information',
    parameters: [{ name: 'feedType', type: 'string', description: 'hackernews | techcrunch | slashdot', required: false, defaultValue: 'hackernews' }]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'brain' | 'tools' | 'scheduler' | 'diary' | 'checklist' | 'gateway' | 'settings' | 'learning'>('terminal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [historySidebarOpen, setHistorySidebarOpen] = useState<boolean>(true);

  const handleSelectTab = (tab: 'terminal' | 'brain' | 'tools' | 'scheduler' | 'diary' | 'checklist' | 'gateway' | 'settings' | 'learning') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Chat/CLI State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamingPhase, setStreamingPhase] = useState<'streaming' | 'tool' | null>(null);
  const [streamingTool, setStreamingTool] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Custom provider states
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState<boolean>(false);
  const [customModelsError, setCustomModelsError] = useState<string>('');

  // Terminal CLI Shell State
  const [cliInput, setCliInput] = useState<string>('');
  const [cliHistory, setCliHistory] = useState<{ type: 'input' | 'output'; text: string }[]>([
    { type: 'output', text: '==================================================' },
    { type: 'output', text: '   ALICE AI CORE' },
    { type: 'output', text: '   ALWAYS-ON ENHANCED MULTI-TOOL OS' },
    { type: 'output', text: '==================================================' },
    { type: 'output', text: 'System booted successfully. Host routing Ingress [OK].' },
    { type: 'output', text: 'Type "help" to display available shell operations.' }
  ]);
  const cliBottomRef = useRef<HTMLDivElement>(null);

  // Sandbox Tool Playground State
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [toolResult, setToolResult] = useState<string>('');
  const [toolRunning, setToolRunning] = useState<boolean>(false);
  const [toolSearch, setToolSearch] = useState<string>('');
  const [toolCatFilter, setToolCatFilter] = useState<string>('all');

  // Diary State
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  // Todo State
  const [newTodo, setNewTodo] = useState<string>('');

  // Memory/Skill creation State
  const [newMemory, setNewMemory] = useState<string>('');
  const [newMemoryCat, setNewMemoryCat] = useState<string>('preference');
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillDesc, setNewSkillDesc] = useState<string>('');
  const [newSkillTrigger, setNewSkillTrigger] = useState<string>('');
  const [newSkillSystem, setNewSkillSystem] = useState<string>('');
  const [newSkillOutput, setNewSkillOutput] = useState<string>('');
  const [testSkillName, setTestSkillName] = useState<string>('');
  const [testSkillInput, setTestSkillInput] = useState<string>('');
  const [skillResult, setSkillResult] = useState<string>('');

  // Autonomous Learning State
  const [learningStep, setLearningStep] = useState<number>(0);
  const [learningLogs, setLearningLogs] = useState<string[]>([]);
  const [learningSimMode, setLearningSimMode] = useState<'standard' | 'healing'>('healing');
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [learningName, setLearningName] = useState<string>('DockerMonitor');
  const [learningDesc, setLearningDesc] = useState<string>('Intercepts container events and alerts on state transitions.');
  const [learningTrigger, setLearningTrigger] = useState<string>('docker status');
  const [learningSystem, setLearningSystem] = useState<string>('Check current local container runtimes, inspect memory thresholds, and alert.');

  // Scheduler Creation State
  const [schedTitle, setSchedTitle] = useState<string>('');
  const [schedDesc, setSchedDesc] = useState<string>('');
  const [schedCron, setSchedCron] = useState<string>('interval_10_sec');
  const [schedPrompt, setSchedPrompt] = useState<string>('');
  const [schedChannel, setSchedChannel] = useState<'terminal' | 'telegram' | 'discord' | 'all'>('terminal');

  // Config State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'custom'>('gemini');
  const [modelName, setModelName] = useState<string>('gemini-3.5-flash');
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [telegramToken, setTelegramToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('');
  const [tgEnabled, setTgEnabled] = useState<boolean>(false);
  const [dcEnabled, setDcEnabled] = useState<boolean>(false);
  const [termEnabled, setTermEnabled] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Simulated live clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetchDb();
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll immediately
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Scroll again after a tiny delay to ensure proper DOM layout reflow
    const timer = setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [db?.messages, chatSending, streamingContent]);

  useEffect(() => {
    cliBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliHistory]);

  const fetchDb = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/db');
      const data = await res.json();
      setDb(data);
      
      // Initialize Config fields
      setAiProvider(data.config.provider);
      setModelName(data.config.modelName);
      setCustomApiKey(data.config.customApiKey);
      setCustomEndpoint(data.config.customEndpoint || '');
      setCustomModels(data.config.availableModels || []);
      setTelegramToken(data.gateway.telegramToken);
      setTelegramChatId(data.gateway.telegramChatId);
      setDiscordWebhookUrl(data.gateway.discordWebhookUrl);
      setTgEnabled(data.gateway.enabledChannels.telegram);
      setDcEnabled(data.gateway.enabledChannels.discord);
      setTermEnabled(data.gateway.enabledChannels.terminal);

      if (data.notes && data.notes.length > 0 && !selectedNote) {
        setSelectedNote(data.notes[0]);
        setNoteTitle(data.notes[0].title);
        setNoteContent(data.notes[0].content);
      }
    } catch (e) {
      console.error('Failed to retrieve db', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setChatSending(false);
  };

  const stripToolCallBlocks = (content: string): string => {
    return content
      .replace(/```json\s*\{\s*"toolCall"[\s\S]*?```/g, '')
      .trim();
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const userMsg: Message = {
      id: 'msg-usr-' + Date.now(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    if (db) {
      setDb({ ...db, messages: [...db.messages, userMsg] });
    }

    setChatInput('');
    setChatSending(true);
    setStreamingContent('');
    setStreamingPhase('streaming');
    setStreamingTool('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: db ? [...db.messages, userMsg] : [userMsg] }),
        signal: controller.signal
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'chunk') {
              setStreamingContent(prev => prev + event.text);
            } else if (event.type === 'clear') {
              setStreamingContent('');
            } else if (event.type === 'tool_start') {
              setStreamingPhase('tool');
              setStreamingTool(event.tool);
              setStreamingContent('');
            } else if (event.type === 'tool_done') {
              setStreamingPhase('streaming');
            } else if (event.type === 'done') {
              await fetchDb();
            }
          } catch (_) {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming chat failed', err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setStreamingContent('');
      setStreamingPhase(null);
      setStreamingTool('');
      setChatSending(false);
    }
  };

  const handleCliSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput.trim();
    setCliHistory(prev => [...prev, { type: 'input', text: `alice@cloud-node:~$ ${cmd}` }]);
    setCliInput('');

    const lower = cmd.toLowerCase();
    const args = cmd.split(' ').slice(1).join(' ');

    if (lower === 'help') {
      setCliHistory(prev => [
        ...prev,
        { type: 'output', text: 'Shell Operations Menu:\n' +
          ' - help                  Display terminal core instructions\n' +
          ' - clear                 Clear terminal history scrollback\n' +
          ' - diagnostics           Query node diagnostics, memory levels, uptime\n' +
          ' - weather [city]        Trigger current meteorological measurements\n' +
          ' - timezone              Display major global city synchronized clocks\n' +
          ' - notes                 List and count diaries saved in node storage\n' +
          ' - tasks                 List pending checklist task identifiers\n' +
          ' - schedules             Retrieve active task automation routines\n' +
          ' - memories              Output ledger of extracted factual records\n' +
          ' - calc [expr]           Performs safe arithmetic parses (e.g., "calc 25*4")\n' +
          ' - ascii [text]          Generate ASCII 3D block signature' }
      ]);
      return;
    }

    if (lower === 'clear') {
      setCliHistory([]);
      return;
    }

    // Process local command calls
    if (lower.startsWith('calc ')) {
      const expression = cmd.slice(5).trim();
      executeCliTool('calculator', { expression });
      return;
    }

    if (lower === 'diagnostics') {
      executeCliTool('system_diagnostics', {});
      return;
    }

    if (lower.startsWith('weather ')) {
      executeCliTool('weather_station', { city: args });
      return;
    }

    if (lower === 'timezone') {
      executeCliTool('timezone_clock', {});
      return;
    }

    if (lower.startsWith('ascii ')) {
      executeCliTool('ascii_art', { text: args });
      return;
    }

    if (lower === 'notes') {
      if (!db || !db.notes || db.notes.length === 0) {
        setCliHistory(prev => [...prev, { type: 'output', text: 'Notebook directory is empty.' }]);
      } else {
        const text = db.notes.map(n => `[${n.id}] - ${n.title} (${n.content.slice(0, 40)}...)`).join('\n');
        setCliHistory(prev => [...prev, { type: 'output', text: `Found ${db.notes.length} note files:\n\n${text}` }]);
      }
      return;
    }

    if (lower === 'tasks') {
      if (!db || !db.todos || db.todos.length === 0) {
        setCliHistory(prev => [...prev, { type: 'output', text: 'Checklist is currently empty.' }]);
      } else {
        const text = db.todos.map(t => `${t.completed ? '[X]' : '[ ]'} [${t.id}] ${t.text}`).join('\n');
        setCliHistory(prev => [...prev, { type: 'output', text: `Tasks checklist details:\n\n${text}` }]);
      }
      return;
    }

    if (lower === 'schedules') {
      if (!db || !db.schedules || db.schedules.length === 0) {
        setCliHistory(prev => [...prev, { type: 'output', text: 'No active schedules configured.' }]);
      } else {
        const text = db.schedules.map(s => `[${s.id}] ${s.title} (Cron: ${s.cron} | Next Run: ${s.nextRun.slice(11, 19)})`).join('\n');
        setCliHistory(prev => [...prev, { type: 'output', text: `Active chron schedules:\n\n${text}` }]);
      }
      return;
    }

    if (lower === 'memories') {
      if (!db || !db.memories || db.memories.length === 0) {
        setCliHistory(prev => [...prev, { type: 'output', text: 'No memories saved yet.' }]);
      } else {
        const text = db.memories.map(m => `[${m.id}] (${m.category}) - ${m.text}`).join('\n');
        setCliHistory(prev => [...prev, { type: 'output', text: `Memory Ledger blocks:\n\n${text}` }]);
      }
      return;
    }

    // Default: Chat proxy
    setCliHistory(prev => [...prev, { type: 'output', text: `alice-core: Parsing prompt against local agent NLP model...` }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: cmd }] })
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const reply = data.messages[data.messages.length - 1].content;
        setCliHistory(prev => [...prev, { type: 'output', text: reply }]);
      }
      await fetchDb();
    } catch (e) {
      setCliHistory(prev => [...prev, { type: 'output', text: `Error connecting to NLP model endpoint.` }]);
    }
  };

  const executeCliTool = async (toolName: string, params: any) => {
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, parameters: params })
      });
      const data = await res.json();
      setCliHistory(prev => [...prev, { type: 'output', text: data.result || `Finished execution: SUCCESS` }]);
      await fetchDb();
    } catch (err) {
      setCliHistory(prev => [...prev, { type: 'output', text: `Tool Execution Failure: Connection lost` }]);
    }
  };

  const handleRunTool = async () => {
    if (!selectedTool) return;
    setToolRunning(true);
    setToolResult('');

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: selectedTool.name, parameters: toolParams })
      });
      const data = await res.json();
      if (data.success) {
        setToolResult(data.result);
      } else {
        setToolResult(`Error: ${data.error}`);
      }
      await fetchDb();
    } catch (e: any) {
      setToolResult(`Network Error: ${e.message}`);
    } finally {
      setToolRunning(false);
    }
  };

  const handleSelectTool = (tool: any) => {
    setSelectedTool(tool);
    const defaults: Record<string, any> = {};
    tool.parameters.forEach((p: any) => {
      defaults[p.name] = p.defaultValue !== undefined ? p.defaultValue : (p.type === 'boolean' ? false : (p.type === 'number' ? 0 : ''));
    });
    setToolParams(defaults);
    setToolResult('');
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteTitle, content: noteContent })
      });
      await fetchDb();
      // Select newly added note
      const data = await res.json();
      if (data.note) {
        setSelectedNote(data.note);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch('/api/notes/' + id, { method: 'DELETE' });
      await fetchDb();
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodo })
      });
      setNewTodo('');
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTodo = async (id: string) => {
    try {
      await fetch(`/api/todos/${id}/toggle`, { method: 'POST' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim()) return;

    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMemory, category: newMemoryCat })
      });
      setNewMemory('');
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillTrigger.trim() || !newSkillSystem.trim()) return;

    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSkillName,
          description: newSkillDesc,
          triggerPrompt: newSkillTrigger,
          systemPrompt: newSkillSystem,
          outputTemplate: newSkillOutput
        })
      });
      setNewSkillName('');
      setNewSkillDesc('');
      setNewSkillTrigger('');
      setNewSkillSystem('');
      setNewSkillOutput('');
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAutonomousSynthesis = async () => {
    setLearningStep(1);
    setLearningLogs([
      "📄 [1/4] Scanning chat transcripts...",
      "📄 Detected active conversation session.",
      "📄 Analyzing message blocks for repetitive instructions and pattern templates..."
    ]);

    setTimeout(() => {
      setLearningStep(2);
      setLearningLogs(prev => [
        ...prev,
        "🔍 [2/4] Resolving custom skill parameters...",
        `🔍 Synthesizing declarative Skill Manifest: "${learningName}"`,
        `🔍 Trigger phrase registered as: "${learningTrigger}"`,
        `🔍 System core prompts aligned: "${learningSystem}"`
      ]);

      setTimeout(() => {
        setLearningStep(3);
        if (learningSimMode === 'healing') {
          setLearningLogs(prev => [
            ...prev,
            "💻 [3/4] Compiling sandbox executable...",
            "❌ ERROR: Skill trigger overlaps with built-in command context or is unrelated.",
            "🔄 [SELF-HEALING] Initiating Auto-Refine & Repair algorithm...",
            "🛡️ [SELF-HEALING] Scanning container state and system rules dictionary...",
            "🛡️ [SELF-HEALING] Adjusting trigger prompt to safe identifier: 'docker monitor'...",
            "🛡️ [SELF-HEALING] Re-compiling optimized payload...",
            "✅ [SELF-HEALING] Compilation succeeded on retry! Code verification: OK"
          ]);
        } else {
          setLearningLogs(prev => [
            ...prev,
            "💻 [3/4] Compiling sandbox executable...",
            "✅ Compilation succeeded! Verification: OK"
          ]);
        }

        setTimeout(async () => {
          setLearningStep(4);
          setLearningLogs(prev => [
            ...prev,
            "🚀 [4/4] Activating Custom Skill into secure DB node...",
            "🚀 Deploying to cloud container pod...",
            "🚀 Autonomous Skill activated and live!"
          ]);

          try {
            const finalTrigger = learningSimMode === 'healing' ? 'docker monitor' : learningTrigger;
            await fetch('/api/skills', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: learningName,
                description: learningDesc,
                triggerPrompt: finalTrigger,
                systemPrompt: learningSystem,
                outputTemplate: ''
              })
            });

            // Post self-learning lesson item
            await fetch('/api/learnings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: learningSimMode === 'healing' ? 'failure_healing' : 'task',
                title: learningSimMode === 'healing' ? `Auto-Healed & Registered ${learningName}` : `Synthesized Skill ${learningName}`,
                description: learningSimMode === 'healing' 
                  ? `Healed trigger overlap collision and registered safe identifier: "${finalTrigger}"` 
                  : `Successfully compiled declarative custom skill core from pattern templates.`,
                details: learningSimMode === 'healing'
                  ? `Alice detected a trigger overlap collision between "${learningTrigger}" and system command prefixes. Invoked self-repair logic to adjust prefix to "${finalTrigger}" and deployed healed sandbox.`
                  : `Alice scanned transcripts, mapped functional parameters, validated syntax models, and registered custom prompt trigger: "${learningTrigger}"`,
                status: learningSimMode === 'healing' ? 'healing_completed' : 'learned'
              })
            });

            await fetchDb();
          } catch (err) {
            console.error("Failed to register synthesized skill:", err);
          }
        }, 2000);

      }, 2000);

    }, 2000);
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLearning = async (id: string) => {
    try {
      await fetch(`/api/learnings/${id}`, { method: 'DELETE' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearLearnings = async () => {
    try {
      await fetch('/api/learnings/clear', { method: 'POST' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunSkillTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSkillName || !testSkillInput) return;
    setSkillResult('Running skill synthesizer on cloud server node...');

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'execute_skill',
          parameters: { skillName: testSkillName, inputPayload: testSkillInput }
        })
      });
      const data = await res.json();
      setSkillResult(data.result || 'Finished execution.');
    } catch (e: any) {
      setSkillResult(`Error: ${e.message}`);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle.trim() || !schedPrompt.trim()) return;

    try {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schedTitle,
          description: schedDesc,
          cron: schedCron,
          taskPrompt: schedPrompt,
          outputChannel: schedChannel
        })
      });
      setSchedTitle('');
      setSchedDesc('');
      setSchedPrompt('');
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}/toggle`, { method: 'POST' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSchedule = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            provider: aiProvider,
            modelName,
            customApiKey,
            customEndpoint
          },
          gateway: {
            telegramToken,
            telegramChatId,
            discordWebhookUrl,
            enabledChannels: {
              telegram: tgEnabled,
              discord: dcEnabled,
              terminal: termEnabled
            }
          }
        })
      });
      await fetchDb();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCheckCustomModels = async () => {
    if (!customEndpoint.trim()) {
      setCustomModelsError('Please fill in custom endpoint URL first.');
      return;
    }
    setFetchingModels(true);
    setCustomModelsError('');
    try {
      const res = await fetch('/api/custom-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customEndpoint, customApiKey })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.models)) {
        setCustomModels(data.models);
        setCustomModelsError('');
        if (data.models.length > 0) {
          setModelName(data.models[0]);
        }
      } else {
        setCustomModelsError(data.error || 'Failed to fetch models from endpoint.');
      }
    } catch (err: any) {
      setCustomModelsError('Connection error: ' + err.message);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSimulateGateway = async () => {
    alert("Triggered active channel ping check. Check your background server node logs to view simulated message routing streams!");
  };

  const handleClearNeuronLogs = async () => {
    try {
      await fetch('/api/neuron-events/clear', { method: 'POST' });
      await fetchDb();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewChat = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      });
      const data = await res.json();
      if (data.success) {
        await fetchDb();
        setChatInput('');
      }
    } catch (e) {
      console.error('Failed to create new chat session', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/sessions/${sessionId}/select`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        await fetchDb();
      }
    } catch (e) {
      console.error('Failed to select chat session', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!db?.sessions || db.sessions.length <= 1) {
      alert('Cannot delete the only remaining conversation.');
      return;
    }
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      setRefreshing(true);
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchDb();
      }
    } catch (e) {
      console.error('Failed to delete chat session', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearSession = async () => {
    if (!confirm('Are you sure you want to clear the messages in this chat session?')) return;
    try {
      setRefreshing(true);
      const res = await fetch('/api/sessions/clear', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        await fetchDb();
      }
    } catch (e) {
      console.error('Failed to clear conversation', e);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredTools = CLIENT_TOOLS.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(toolSearch.toLowerCase()) || 
                          t.description.toLowerCase().includes(toolSearch.toLowerCase());
    const matchesCat = toolCatFilter === 'all' || t.category === toolCatFilter;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div id="loader-node" className="min-h-screen flex flex-col items-center justify-center bg-[#0b1121] text-[#22c55e] font-mono p-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="mb-3"
        >
          <RefreshCw size={36} />
        </motion.div>
        <h2 className="text-base font-semibold tracking-wider text-slate-200">Starting Alice...</h2>
        <p className="text-[10px] text-slate-500 mt-1">Loading memory, skills, and tools...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#0f0d0b] text-stone-300 font-sans selection:bg-amber-600/20 selection:text-amber-400 overflow-hidden">
      
      {/* Mobile Header (only visible on mobile/tablet) */}
      <div className="lg:hidden h-14 bg-[#140f0c] border-b border-[#2d231d] flex items-center justify-between px-4 shrink-0 select-none z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-md text-stone-400 hover:text-[#f5f5f4] hover:bg-[#201813] transition-all cursor-pointer"
            title="Open Workspace Navigation"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-bold text-[#f5f5f4] tracking-wider font-mono uppercase">Alice AI</span>
        </div>
        <div className="flex items-center space-x-2">
          {activeTab === 'terminal' && (
            <button
              onClick={() => setHistorySidebarOpen(!historySidebarOpen)}
              className="p-1.5 rounded-md text-stone-400 hover:text-[#f5f5f4] hover:bg-[#201813] transition-all cursor-pointer"
              title="Toggle Chat History"
            >
              <MessageSquare size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Sidebar Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <nav 
        id="left-navbar" 
        className={`fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 lg:flex w-56 shrink-0 bg-[#17120e] border-r border-[#2d231d] flex flex-col h-full overflow-hidden select-none transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        
        {/* Brand Header */}
        <div className="px-4 py-5 flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-[#ea580c]"></span>
          <span className="text-sm font-semibold text-[#f5f5f4]">Alice</span>
        </div>

        {/* Menu Items */}
        <div className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {[
            { tab: 'terminal' as const, icon: <MessageSquare size={15} />, label: 'Chat' },
            { tab: 'brain' as const, icon: <Brain size={15} />, label: 'Memories' },
            { tab: 'tools' as const, icon: <Wrench size={15} />, label: 'Skills' },
            { tab: 'learning' as const, icon: <Layers size={15} />, label: 'Learning' },
            { tab: 'scheduler' as const, icon: <Clock size={15} />, label: 'Schedules' },
            { tab: 'settings' as const, icon: <Settings size={15} />, label: 'Settings' },
          ].map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => handleSelectTab(tab)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#251d17] text-[#f5f5f4] font-medium'
                  : 'text-stone-400 hover:text-[#f5f5f4] hover:bg-[#1e1713]'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={() => {
            if (confirm("Sign out of Alice?")) {
              window.location.reload();
            }
          }}
          className="w-full flex items-center space-x-3 px-5 py-4 border-t border-[#2d231d] hover:bg-[#1e1713] text-stone-500 hover:text-stone-300 transition-all text-sm"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </nav>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex h-full overflow-hidden bg-[#1e1713]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex-1 flex h-full overflow-hidden"
          >
              
              {/* Terminal View */}
              {activeTab === 'terminal' && (
                <div className="flex-1 flex h-full overflow-hidden">
                  
                  {/* Collapsible Chat History Sidebar */}
                  {historySidebarOpen && (
                    <>
                      {/* Overlay on mobile */}
                      <div 
                        className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                        onClick={() => setHistorySidebarOpen(false)}
                      />
                      <div className="w-64 lg:w-56 shrink-0 bg-[#110e0b] border-r border-[#2d231d] flex flex-col h-full overflow-hidden select-none fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto transition-transform duration-300">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-[#2d231d]">
                          <span className="text-sm font-semibold text-stone-300">History</span>
                          <button
                            onClick={() => setHistorySidebarOpen(false)}
                            className="p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-[#1e1713] transition-all cursor-pointer"
                          >
                            <ChevronLeft size={15} />
                          </button>
                        </div>

                        <div className="p-3">
                          <button
                            onClick={handleNewChat}
                            className="w-full py-2 px-3 border border-[#2d231d] hover:border-[#3e3026] bg-[#1a1612] hover:bg-[#201813] text-stone-300 text-sm rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>New chat</span>
                          </button>
                        </div>

                        <div className="px-3 pb-3">
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-2.5 text-stone-500" />
                            <input
                              type="text"
                              value={sessionSearch}
                              onChange={(e) => setSessionSearch(e.target.value)}
                              placeholder="Search..."
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/40"
                            />
                          </div>
                        </div>

                        {/* Sessions scrollable list */}
                        {(!db?.sessions || db.sessions.length === 0) ? (
                          <div className="flex-1 p-4 text-center text-stone-600 text-xs font-mono">
                            No conversations yet
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
                            {(db.sessions || [])
                              .filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase()))
                              .map((s) => {
                                const isActive = db?.activeSessionId === s.id;
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => handleSelectSession(s.id)}
                                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-all ${
                                      isActive
                                        ? 'bg-[#251d18] text-amber-400 border border-amber-900/40 font-semibold'
                                        : 'text-stone-400 hover:text-[#f5f5f4] hover:bg-[#1e1713]'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 truncate flex-1 pr-1 font-mono text-xs">
                                      <span className="opacity-40">#</span>
                                      <span className="truncate">{s.title}</span>
                                    </div>
                                    <button
                                      onClick={(e) => handleDeleteSession(e, s.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-rose-400 transition-all cursor-pointer"
                                      title="Delete Conversation"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Main Chat Area */}
                  <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#1e1713]">
                    
                    <div className="flex-1 flex flex-col bg-[#0f0d0b] h-full overflow-hidden relative sm:border-l sm:border-r lg:border-l-0 lg:border-r-0 border-[#2d231d]">
                      {/* Chat Head */}
                      <div className="px-4 py-2.5 border-b border-[#2d231d] bg-[#0f0d0b] flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {!historySidebarOpen && (
                            <button
                              onClick={() => setHistorySidebarOpen(true)}
                              className="hidden lg:flex p-1 rounded hover:bg-[#1e1713] text-stone-500 hover:text-stone-300 transition-all cursor-pointer mr-1"
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectTab('settings')}
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-[#1a1612] border border-[#2d231d] hover:border-[#3e3026] text-stone-300 text-xs transition-all cursor-pointer"
                            title="API Configuration"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]"></span>
                            <span>API (default)</span>
                            <ChevronRight size={10} className="rotate-90 opacity-50" />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSelectTab('tools')}
                            className="px-2.5 py-1.5 rounded-md bg-[#1a1612] border border-[#2d231d] hover:border-[#3e3026] text-stone-400 hover:text-stone-200 transition-all text-xs flex items-center space-x-1.5 cursor-pointer"
                            title="Save current conversation as a skill"
                          >
                            <Save size={11} />
                            <span className="hidden sm:inline">Save as skill</span>
                          </button>
                          <button
                            onClick={handleClearSession}
                            className="px-2.5 py-1.5 rounded-md bg-[#1a1612] border border-[#2d231d] hover:border-[#3e3026] text-stone-400 hover:text-stone-200 transition-all text-xs flex items-center space-x-1.5 cursor-pointer"
                            title="Clear chat"
                          >
                            <Trash2 size={11} />
                            <span className="hidden sm:inline">Clear</span>
                          </button>
                        </div>
                      </div>

                      {/* Messages Body */}
                      <div className="flex-1 overflow-y-auto py-8 px-4 custom-scrollbar bg-[#0f0d0b]">
                        <div className="w-full max-w-2xl mx-auto space-y-5">
                          
                          {/* Central Greeting */}
                          {(!db?.messages || db.messages.filter(m => m.role !== 'system').length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center py-16 text-center select-none">
                              <div className="max-w-lg rounded-2xl p-8 bg-[#161210] border border-[#2a2018] text-stone-300 space-y-3">
                                <h3 className="text-lg font-semibold text-[#f5f5f4]">Say hi to Alice.</h3>
                                <p className="text-sm text-stone-400 leading-relaxed italic">
                                  I'll remember what matters across sessions — facts about you, your preferences, your goals. Try telling me about yourself, or ask me to help with something.
                                </p>
                              </div>
                            </div>
                          ) : (
                            db.messages
                              .filter(m => m.role !== 'system')
                              .map((m, idx) => (
                                <div key={m.id || idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 shadow-md ${
                                    m.role === 'user' 
                                      ? 'bg-amber-700 text-white rounded-tr-none' 
                                      : 'bg-[#201813] border border-[#2d231d] text-stone-200 rounded-tl-none'
                                  }`}>
                                    <div className="flex items-center space-x-1 mb-1 text-[9px] font-mono opacity-50">
                                      <span>{m.role === 'user' ? 'USER' : 'ALICE'}</span>
                                      <span>•</span>
                                      <span>{m.timestamp ? m.timestamp.slice(11, 16) : ''}</span>
                                    </div>
                                    {m.role === 'model' && m.thinkingSteps && (
                                      <ThinkingStepsView steps={m.thinkingSteps} timeSec={m.thinkingTime} />
                                    )}
                                    <div className="markdown-body select-text text-xs sm:text-[13px] leading-relaxed font-sans text-stone-200">
                                      <ReactMarkdown
                                        components={{
                                          code({ node, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isInline = !match && !String(children).includes('\n');
                                            return isInline ? (
                                              <code className="px-1.5 py-0.5 bg-[#140f0c] text-amber-500 rounded font-mono text-xs border border-[#2d231d]/40" {...props}>
                                                {children}
                                              </code>
                                            ) : (
                                              <SyntaxHighlighter 
                                                code={String(children).replace(/\n$/, '')} 
                                                language={match ? match[1] : 'javascript'} 
                                              />
                                            );
                                          },
                                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-stone-200">{children}</p>,
                                          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-stone-300">{children}</ul>,
                                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-stone-300">{children}</ol>,
                                          li: ({ children }) => <li className="text-stone-300">{children}</li>,
                                          h1: ({ children }) => <h1 className="text-base font-bold text-[#f5f5f4] mt-3 mb-1.5 font-mono uppercase tracking-wider">{children}</h1>,
                                          h2: ({ children }) => <h2 className="text-sm font-bold text-[#f5f5f4] mt-2.5 mb-1 font-mono uppercase tracking-wide">{children}</h2>,
                                          h3: ({ children }) => <h3 className="text-xs font-bold text-[#f5f5f4] mt-2 mb-1 font-mono uppercase">{children}</h3>,
                                          blockquote: ({ children }) => (
                                            <blockquote className="border-l-2 border-amber-600/60 pl-3 italic text-stone-400 my-2 bg-[#1b1512] py-1 pr-2 rounded-r">
                                              {children}
                                            </blockquote>
                                          ),
                                          table: ({ children }) => (
                                            <div className="overflow-x-auto my-3 rounded-md border border-[#2d231d]">
                                              <table className="w-full text-left text-xs text-stone-300 border-collapse">{children}</table>
                                            </div>
                                          ),
                                          thead: ({ children }) => <thead className="bg-[#1a1411] text-stone-400 font-mono text-[10px] uppercase border-b border-[#2d231d]">{children}</thead>,
                                          tbody: ({ children }) => <tbody className="divide-y divide-[#2d231d]">{children}</tbody>,
                                          tr: ({ children }) => <tr>{children}</tr>,
                                          th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
                                          td: ({ children }) => <td className="px-3 py-2 text-stone-300 font-mono text-[11px]">{children}</td>,
                                          a: ({ href, children }) => (
                                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                                              {children}
                                            </a>
                                          ),
                                        }}
                                      >
                                        {m.role === 'model' ? stripToolCallBlocks(m.content || '') : (m.content || '')}
                                      </ReactMarkdown>
                                    </div>
                                    {/* Render intercepts */}
                                    {m.toolCalls && m.toolCalls.map((tc, tcIdx) => (
                                      <div key={tcIdx} className="mt-2.5 p-2.5 bg-[#140f0c] rounded border border-[#ea580c]/20 font-mono text-[10px] text-amber-400">
                                        <div className="flex items-center justify-between font-semibold border-b border-[#2d231d] pb-1.5 mb-1.5 text-[9px]">
                                          <span>[MODULE_TRIGGER: {tc.toolName}]</span>
                                          <span className="text-[8px] bg-amber-500/10 px-1 rounded uppercase">{tc.status}</span>
                                        </div>
                                        <div className="text-[9px] text-stone-500 mb-1">Params: {JSON.stringify(tc.parameters)}</div>
                                        <pre className="max-h-24 overflow-y-auto text-[9px] whitespace-pre-wrap custom-scrollbar text-stone-300">{tc.result}</pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                          )}
                          {/* Streaming / Thinking bubble */}
                          {chatSending && (
                            <div className="flex justify-start">
                              <div className="max-w-[85%] rounded-lg rounded-tl-none px-4 py-3 shadow-md bg-[#161210] border border-[#2a2018] text-stone-200">
                                <div className="flex items-center space-x-1.5 mb-2 text-[10px] font-mono text-stone-500">
                                  <span>Alice</span>
                                  <span className="animate-pulse text-[#ea580c]">●</span>
                                </div>
                                {streamingPhase === 'tool' && (
                                  <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 mb-2">
                                    <span className="animate-spin inline-block">⚙</span>
                                    <span>running <b>{streamingTool}</b>...</span>
                                  </div>
                                )}
                                {!streamingContent && streamingPhase !== 'tool' && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                  </div>
                                )}
                                {streamingContent && (
                                  <div className="markdown-body text-xs sm:text-[13px] leading-relaxed font-sans text-stone-200">
                                    <ReactMarkdown
                                      components={{
                                        code({ node, className, children, ...props }) {
                                          const match = /language-(\w+)/.exec(className || '');
                                          const isInline = !match && !String(children).includes('\n');
                                          return isInline ? (
                                            <code className="px-1.5 py-0.5 bg-[#0f0d0b] text-amber-400 rounded font-mono text-xs border border-[#2d231d]/40" {...props}>{children}</code>
                                          ) : (
                                            <SyntaxHighlighter code={String(children).replace(/\n$/, '')} language={match ? match[1] : 'text'} />
                                          );
                                        },
                                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-stone-200">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-stone-300">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-stone-300">{children}</ol>,
                                        li: ({ children }) => <li className="text-stone-300">{children}</li>,
                                      }}
                                    >
                                      {stripToolCallBlocks(streamingContent)}
                                    </ReactMarkdown>
                                    <span className="inline-block w-1.5 h-3.5 bg-[#ea580c] animate-pulse rounded-sm align-middle ml-0.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div ref={chatBottomRef} />
                        </div>
                      </div>

                      {/* Chat Footer Input */}
                      <div className="p-4 border-t border-[#2d231d] bg-[#0f0d0b]">
                        <form onSubmit={handleChatSend} className="w-full max-w-2xl mx-auto">
                          <div className="flex items-end space-x-3 bg-[#161210] border border-[#2a2018] rounded-2xl px-4 py-3 shadow-md focus-within:border-[#ea580c]/40 transition-all">
                            <textarea
                              value={chatInput}
                              onChange={(e) => {
                                setChatInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (chatInput.trim() && !chatSending) {
                                    handleChatSend(e as any);
                                  }
                                }
                              }}
                              placeholder="Message Alice... (Enter to send, Shift+Enter for newline)"
                              rows={1}
                              className="flex-1 bg-transparent text-sm text-stone-200 focus:outline-none placeholder-stone-500 font-sans resize-none overflow-hidden leading-relaxed"
                              style={{ minHeight: '24px', maxHeight: '160px' }}
                            />
                            {chatSending ? (
                              <button
                                type="button"
                                onClick={handleAbort}
                                className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Stop"
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <rect x="5" y="5" width="14" height="14" rx="2" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                type="submit"
                                disabled={!chatInput.trim()}
                                className="p-2 bg-[#ea580c] hover:bg-[#c2410c] disabled:bg-[#1e1713] disabled:text-stone-600 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                              >
                                <Send size={14} />
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Brain Core Tab */}
              {activeTab === 'brain' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  <NeuronLive events={db?.neuronEvents || []} onClearLogs={handleClearNeuronLogs} />
                  
                  {/* Left Column: User Persona Profile */}
                  <div className="lg:col-span-4 bg-[#140f0c] rounded-md border border-[#2d231d] p-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-3 border-b border-[#2d231d] pb-2">
                      <User size={15} className="text-amber-500" />
                      <h3 className="font-semibold text-[10px] font-mono tracking-wide uppercase text-stone-300">USER_PROFILE_PERSONA</h3>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div>
                        <span className="text-stone-500 block uppercase text-[9px]">Name</span>
                        <input
                          type="text"
                          value={db?.profile.name || ''}
                          onChange={(e) => {
                            if (db) setDb({ ...db, profile: { ...db.profile, name: e.target.value } });
                          }}
                          onBlur={() => {
                            fetch('/api/profile', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: db?.profile.name })
                            });
                          }}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 mt-1 text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                        />
                      </div>

                      <div>
                        <span className="text-stone-500 block uppercase text-[9px]">Profession</span>
                        <input
                          type="text"
                          value={db?.profile.profession || ''}
                          onChange={(e) => {
                            if (db) setDb({ ...db, profile: { ...db.profile, profession: e.target.value } });
                          }}
                          onBlur={() => {
                            fetch('/api/profile', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ profession: db?.profile.profession })
                            });
                          }}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 mt-1 text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                        />
                      </div>

                      <div>
                        <span className="text-stone-500 block uppercase text-[9px]">Short Bio</span>
                        <textarea
                          rows={3}
                          value={db?.profile.bio || ''}
                          onChange={(e) => {
                            if (db) setDb({ ...db, profile: { ...db.profile, bio: e.target.value } });
                          }}
                          onBlur={() => {
                            fetch('/api/profile', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ bio: db?.profile.bio })
                            });
                          }}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 mt-1 text-stone-200 focus:outline-none focus:border-[#ea580c]/60 resize-none font-sans"
                        />
                      </div>

                      <div>
                        <span className="text-stone-500 block uppercase text-[9px] mb-1">Extracted Habits</span>
                        <div className="flex flex-wrap gap-1">
                          {db?.profile.habits.map((h, i) => (
                            <span key={i} className="px-1.5 py-0.2 rounded text-[9px] bg-[#1c1410] text-amber-500 border border-[#2d231d]">{h}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-stone-500 block uppercase text-[9px] mb-1">Interests</span>
                        <div className="flex flex-wrap gap-1">
                          {db?.profile.interests.map((int, i) => (
                            <span key={i} className="px-1.5 py-0.2 rounded text-[9px] bg-[#1c1410] text-amber-500 border border-[#2d231d]">{int}</span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 text-[9px] text-stone-500 border-t border-[#2d231d]">
                        *Fields automatically sync and consolidate when the agent NLP models parse facts during conversation loops.
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Memory Ledger */}
                  <div className="lg:col-span-4 flex flex-col bg-[#140f0c] rounded-md border border-[#2d231d] p-4 shadow-sm max-h-[520px]">
                    <div className="flex items-center space-x-2 mb-3 border-b border-[#2d231d] pb-2 justify-between">
                      <div className="flex items-center space-x-2">
                        <Hash size={15} className="text-amber-500" />
                        <h3 className="font-semibold text-[10px] font-mono tracking-wide uppercase text-stone-300">PERSISTENT_MEMORY_LEDGER</h3>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950/60 text-amber-400 font-mono">{db?.memories.length || 0} ITEMS</span>
                    </div>

                    {/* Quick Add Form */}
                    <form onSubmit={handleAddMemory} className="mb-3">
                      <div className="flex space-x-1">
                        <input
                          type="text"
                          placeholder="Inject factual log manually..."
                          value={newMemory}
                          onChange={(e) => setNewMemory(e.target.value)}
                          className="flex-1 bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                        />
                        <select
                          value={newMemoryCat}
                          onChange={(e) => setNewMemoryCat(e.target.value)}
                          className="bg-[#100b08] border border-[#2d231d] rounded px-1 text-[9px] font-mono text-stone-300"
                        >
                          <option value="preference">Pref</option>
                          <option value="professional">Work</option>
                          <option value="personal">Pers</option>
                        </select>
                        <button type="submit" className="px-2 bg-amber-600 hover:bg-amber-500 rounded text-xs text-white cursor-pointer"><Plus size={12} /></button>
                      </div>
                    </form>

                    {/* Memories list */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {db?.memories.map((m) => (
                        <div key={m.id} className="p-2 bg-[#1c1410]/40 border border-[#2d231d]/60 rounded flex items-start justify-between group">
                          <div>
                            <span className={`text-[8px] uppercase px-1 py-0.2 rounded font-mono border ${
                              m.category === 'preference' ? 'bg-amber-950/40 text-amber-500 border-amber-500/20' :
                              m.category === 'professional' ? 'bg-orange-950/40 text-orange-400 border-orange-500/20' :
                              'bg-stone-900/40 text-stone-400 border-stone-800'
                            }`}>{m.category}</span>
                            <p className="text-xs text-stone-300 mt-1 leading-relaxed font-sans select-text">{m.text}</p>
                            <span className="text-[8px] text-stone-500 block mt-0.5 font-mono">{m.timestamp.slice(0, 10)}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="text-stone-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Skill Synthesizer */}
                  <div className="lg:col-span-4 flex flex-col bg-[#140f0c] rounded-md border border-[#2d231d] p-4 shadow-sm max-h-[520px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center space-x-2 mb-3 border-b border-[#2d231d] pb-2">
                      <Layers size={15} className="text-amber-500" />
                      <h3 className="font-semibold text-[10px] font-mono tracking-wide uppercase text-stone-300">SYNTHESIZED_SKILL_CORES</h3>
                    </div>

                    {/* Skill List */}
                    <div className="space-y-2 mb-3 border-b border-[#2d231d] pb-3">
                      {db?.skills.map((s) => (
                        <div key={s.id} className="p-2.5 bg-[#1c1410]/30 border border-[#2d231d] rounded">
                          <div className="flex items-center justify-between border-b border-[#2d231d] pb-1 mb-1 font-mono text-xs">
                            <span className="font-semibold text-stone-200">{s.name}</span>
                            <button onClick={() => handleDeleteSkill(s.id)} className="text-stone-500 hover:text-rose-400 cursor-pointer"><Trash2 size={11} /></button>
                          </div>
                          <p className="text-[11px] text-stone-400 leading-normal font-sans">{s.description}</p>
                          <div className="mt-1 text-[9px] font-mono text-amber-500 bg-[#100b08]/80 px-1.5 py-0.2 rounded inline-block">Trigger: "{s.triggerPrompt}"</div>
                        </div>
                      ))}
                    </div>

                    {/* Create Skill Form */}
                    <h4 className="text-[10px] font-mono font-semibold text-stone-400 uppercase mb-2 flex items-center"><Plus size={10} className="mr-0.5" /> Synthesize Custom Skill</h4>
                    <form onSubmit={handleAddSkill} className="space-y-2 font-mono text-xs">
                      <div>
                        <input
                          type="text"
                          placeholder="Skill Name (e.g. CodeFormatter)"
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Description (What it accomplishes)"
                          value={newSkillDesc}
                          onChange={(e) => setNewSkillDesc(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Trigger Keyword/Prompt"
                          value={newSkillTrigger}
                          onChange={(e) => setNewSkillTrigger(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                          required
                        />
                      </div>
                      <div>
                        <textarea
                          placeholder="Expert System Instruction Template for the LLM..."
                          value={newSkillSystem}
                          onChange={(e) => setNewSkillSystem(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#ea580c]/60 resize-none"
                          rows={2}
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Output markdown template (Optional)"
                          value={newSkillOutput}
                          onChange={(e) => setNewSkillOutput(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-[#ea580c]/60"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-all cursor-pointer"
                      >
                        SYNTHESIZE_SKILL_CORE
                      </button>
                    </form>

                    {/* Interactive Test Block */}
                    <div className="mt-3 pt-3 border-t border-[#2d231d]">
                      <h4 className="text-[10px] font-mono font-semibold text-stone-400 uppercase mb-2 flex items-center"><Play size={10} className="mr-0.5" /> Core Test-Executor</h4>
                      <form onSubmit={handleRunSkillTest} className="space-y-1.5 text-xs font-mono">
                        <select
                          value={testSkillName}
                          onChange={(e) => setTestSkillName(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded p-1 text-stone-200"
                        >
                          <option value="">-- Choose synthesized skill --</option>
                          {db?.skills.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Test payload contents..."
                          value={testSkillInput}
                          onChange={(e) => setTestSkillInput(e.target.value)}
                          className="w-full bg-[#100b08] border border-[#2d231d] rounded px-2 py-1 text-stone-200"
                        />
                        <button type="submit" className="w-full py-1 bg-[#251d18] hover:bg-[#2d231d] text-stone-300 border border-[#2d231d] rounded transition-all cursor-pointer">EXECUTE_SKILL_FLOW</button>
                      </form>
                      {skillResult && (
                        <pre className="mt-2 p-2 bg-[#100b08] border border-[#2d231d] rounded text-[9px] text-amber-500 whitespace-pre-wrap font-mono max-h-24 overflow-y-auto custom-scrollbar">{skillResult}</pre>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* Tool Shed Grid (40 Tools) */}
              {activeTab === 'tools' && (
                <div className="flex flex-col h-full min-h-0">
                  
                  {/* Filter & Search Dashboard */}
                  <div className="bg-[#17120e] border border-[#2d231d] rounded-md p-3 mb-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm font-mono text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {['all', 'memory', 'utility', 'text', 'information', 'creative'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setToolCatFilter(cat)}
                          className={`px-2 py-1 rounded-sm uppercase font-semibold text-[9px] border transition-all cursor-pointer ${
                            toolCatFilter === cat 
                              ? 'bg-amber-950/60 border-amber-600/40 text-amber-450' 
                              : 'bg-[#1c1410] border-[#2d231d] text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full md:w-72">
                      <input
                        type="text"
                        placeholder="Search 40 built-in tools..."
                        value={toolSearch}
                        onChange={(e) => setToolSearch(e.target.value)}
                        className="w-full bg-[#1c1410] border border-[#2d231d] rounded pl-8 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-600/40"
                      />
                      <Search className="absolute left-2.5 top-2 text-stone-500" size={12} />
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTools.map((tool, idx) => (
                      <div
                        key={tool.name}
                        onClick={() => handleSelectTool(tool)}
                        className={`p-3 bg-[#17120e] border transition-all rounded-md hover:border-amber-600/20 cursor-pointer group flex flex-col justify-between ${
                          selectedTool?.name === tool.name ? 'border-amber-500 bg-[#1c1410]' : 'border-[#2d231d]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-[#2d231d]/40 pb-1.5 mb-1.5 font-mono text-xs">
                            <span className="font-semibold text-stone-300 group-hover:text-amber-450 transition-colors">[{tool.name}]</span>
                            <span className="text-[8px] px-1 py-0.2 rounded bg-[#1c1410] text-stone-400 font-semibold uppercase">{tool.category}</span>
                          </div>
                          <p className="text-[11px] text-stone-400 leading-normal font-sans">{tool.description}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between font-mono text-[9px] text-stone-500">
                          <span>Params: {tool.parameters.length}</span>
                          <span className="text-amber-500/60 group-hover:translate-x-0.5 transition-transform inline-flex items-center font-bold">RUN <ChevronRight size={10} /></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Execution overlay panel (Drawer-like) */}
                  <AnimatePresence>
                    {selectedTool && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                      >
                        <div className="w-full max-w-2xl bg-[#17120e] border border-[#2d231d] rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                          {/* Overlay Head */}
                          <div className="px-3.5 py-2.5 border-b border-[#2d231d] bg-[#140f0c] flex items-center justify-between font-mono text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_#ea580c]"></span>
                              <span className="font-semibold text-stone-300 uppercase text-[10px]">EXECUTE_TOOL: [{selectedTool.name}]</span>
                            </div>
                            <button onClick={() => setSelectedTool(null)} className="text-stone-400 hover:text-stone-200 cursor-pointer text-[10px]">Close [X]</button>
                          </div>

                          {/* Overlay Body */}
                          <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                            <p className="text-[11px] text-stone-400 border-l-2 border-amber-500 pl-2 leading-normal font-sans">{selectedTool.description}</p>

                            {/* Dynamically generated form fields */}
                            {selectedTool.parameters.length > 0 ? (
                              <div className="space-y-2 pt-2 font-mono text-xs">
                                {selectedTool.parameters.map((p: any) => (
                                  <div key={p.name}>
                                    <label className="text-stone-400 block mb-0.5 uppercase text-[9px]">{p.name} {p.required && <span className="text-rose-400">*</span>}</label>
                                    {p.type === 'boolean' ? (
                                      <input
                                        type="checkbox"
                                        checked={toolParams[p.name] || false}
                                        onChange={(e) => setToolParams({ ...toolParams, [p.name]: e.target.checked })}
                                        className="w-3.5 h-3.5 rounded bg-[#1c1410] border-[#2d231d] text-amber-600 focus:ring-0 focus:ring-offset-0"
                                      />
                                    ) : p.type === 'number' ? (
                                      <input
                                        type="number"
                                        value={toolParams[p.name] !== undefined ? toolParams[p.name] : ''}
                                        onChange={(e) => setToolParams({ ...toolParams, [p.name]: parseFloat(e.target.value) })}
                                        className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-600/40"
                                        placeholder={p.description}
                                        required={p.required}
                                      />
                                    ) : (
                                      <textarea
                                        rows={2}
                                        value={toolParams[p.name] || ''}
                                        onChange={(e) => setToolParams({ ...toolParams, [p.name]: e.target.value })}
                                        className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-600/40 resize-none font-sans"
                                        placeholder={p.description}
                                        required={p.required}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-stone-500 font-mono italic p-2 bg-[#100b08] border border-[#2d231d] rounded">This tool executes without any arguments.</div>
                            )}

                            {/* Execute button */}
                            <button
                              onClick={handleRunTool}
                              disabled={toolRunning}
                              className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-[#201813] text-white font-bold font-mono text-[10px] rounded transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                            >
                              {toolRunning ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />}
                              <span>RUN_MODULE_CORE</span>
                            </button>

                            {/* Result Terminal */}
                            {toolResult && (
                              <div className="pt-3 border-t border-[#2d231d]">
                                <span className="text-[9px] font-mono text-stone-400 block mb-0.5 uppercase">Output Stream Result:</span>
                                <pre className="p-3 bg-[#100b08] rounded border border-amber-600/20 text-[11px] text-amber-400 font-mono whitespace-pre-wrap select-text max-h-52 overflow-y-auto shadow-inner custom-scrollbar">
                                  {toolResult}
                                </pre>
                              </div>
                            )}

                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}

              {/* Chron Scheduler Tab */}
              {activeTab === 'scheduler' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
                  
                  {/* Left Column: Schedules List */}
                  <div className="lg:col-span-4 bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm max-h-[520px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center space-x-2 mb-3 border-b border-[#2d231d] pb-2 justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="text-amber-500" size={15} />
                        <h3 className="font-semibold text-[10px] font-mono tracking-wide uppercase text-stone-300">AUTOMATION_ROUTINES</h3>
                      </div>
                      <span className="text-[9px] bg-[#1c1410] text-stone-400 px-1.5 py-0.5 rounded font-mono">CRONS</span>
                    </div>

                    <div className="space-y-3">
                      {db?.schedules.map((sc) => (
                        <div key={sc.id} className={`p-3 bg-[#1c1410]/60 border rounded-md transition-all ${sc.enabled ? 'border-[#2d231d]' : 'border-[#140f0c] opacity-60'}`}>
                          <div className="flex items-center justify-between border-b border-[#2d231d]/40 pb-1.5 mb-1.5 font-mono text-xs">
                            <span className="font-bold text-stone-200">{sc.title}</span>
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[8px] px-1 py-0.2 rounded font-semibold border ${sc.enabled ? 'bg-amber-950/60 text-amber-500 border-amber-600/20' : 'bg-[#100b08] text-stone-500 border-[#2d231d]'}`}>
                                {sc.enabled ? 'ACTIVE' : 'MUTED'}
                              </span>
                              <button
                                onClick={() => handleToggleSchedule(sc.id)}
                                className="text-stone-400 hover:text-amber-500 transition-colors text-[9px] border border-[#2d231d] rounded px-1.5 py-0.2 bg-[#100b08] cursor-pointer"
                              >
                                {sc.enabled ? 'Mute' : 'Active'}
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-stone-400 leading-normal font-sans mb-2">{sc.description}</p>
                          <div className="space-y-1 font-mono text-[9px] text-stone-500 border-t border-[#2d231d]/40 pt-2">
                            <div><span className="text-stone-400 uppercase">Interval</span>: {sc.cron}</div>
                            <div><span className="text-stone-400 uppercase">Task Trigger</span>: "{sc.taskPrompt}"</div>
                            <div><span className="text-stone-400 uppercase">Out Routing</span>: {sc.outputChannel}</div>
                            {sc.lastRun && <div><span className="text-stone-400 uppercase">Last Run</span>: {sc.lastRun.slice(11, 19)}</div>}
                            <div><span className="text-amber-500 uppercase font-semibold">Next Tick</span>: {sc.nextRun.slice(11, 19)}</div>
                          </div>
                          <button
                            onClick={() => handleTriggerSchedule(sc.id)}
                            className="mt-2 w-full py-1 bg-[#1c1410] hover:bg-[#201813] text-stone-200 border border-[#2d231d] hover:border-amber-600/20 rounded font-mono text-[9px] transition-all cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <Play size={8} />
                            <span>TRIGGER_AUTOMATION_NOW</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Add Schedule */}
                    <div className="mt-4 pt-4 border-t border-[#2d231d]/40">
                      <h4 className="text-[10px] font-mono font-semibold text-stone-400 uppercase mb-2 flex items-center"><Plus size={10} className="mr-0.5" /> New Automated Timed Task</h4>
                      <form onSubmit={handleAddSchedule} className="space-y-2 font-mono text-xs">
                        <div>
                          <input
                            type="text"
                            placeholder="Title (e.g. Server Backup)"
                            value={schedTitle}
                            onChange={(e) => setSchedTitle(e.target.value)}
                            className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-600/40"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Description (What it executes)"
                            value={schedDesc}
                            onChange={(e) => setSchedDesc(e.target.value)}
                            className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-600/40"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <select
                              value={schedCron}
                              onChange={(e) => setSchedCron(e.target.value)}
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded p-1 text-stone-200 text-xs"
                            >
                              <option value="interval_10_sec">10 Seconds (Test)</option>
                              <option value="hourly">Hourly</option>
                              <option value="daily_9_am">Daily @ 9:00 AM</option>
                            </select>
                          </div>
                          <div>
                            <select
                              value={schedChannel}
                              onChange={(e) => setSchedChannel(e.target.value as any)}
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded p-1 text-stone-200 text-xs"
                            >
                              <option value="terminal">Terminal Log</option>
                              <option value="telegram">Telegram Bot</option>
                              <option value="discord">Discord Webhook</option>
                              <option value="all">All Routing</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Prompt task instructions for LLM..."
                            value={schedPrompt}
                            onChange={(e) => setSchedPrompt(e.target.value)}
                            className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-600/40"
                            required
                          />
                        </div>
                        <button type="submit" className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold cursor-pointer text-[10px]">DEPLOY_AUTOMATION_CHRON</button>
                      </form>
                    </div>

                  </div>

                  {/* Right Column: Execution Console Logs */}
                  <div className="lg:col-span-8 flex flex-col bg-[#140f0c] border border-[#2d231d] rounded-md overflow-hidden shadow-sm h-[450px] lg:h-full">
                    <div className="px-3.5 py-2 border-b border-[#2d231d] bg-[#100b08] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TerminalIcon className="text-amber-500" size={13} />
                        <span className="font-mono text-[10px] font-semibold text-stone-300 tracking-wide uppercase">AUTOMATED_EXECUTION_LOGGER</span>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 bg-[#100b08]/80 font-mono text-[11px] text-amber-500 space-y-2 custom-scrollbar">
                      {db?.logs && db.logs.length > 0 ? (
                        db.logs.map((log) => (
                           <div key={log.id} className="p-2.5 bg-[#1c1410]/30 border border-[#2d231d]/60 rounded">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2d231d]/40 pb-1 mb-1.5">
                              <span className="text-amber-500 font-bold text-[10px]">[{log.timestamp.slice(11, 19)}] EVENT: {log.toolName}</span>
                              <div className="flex items-center space-x-2 mt-0.5 sm:mt-0 text-[8px]">
                                <span className="text-stone-500">ID: {log.id}</span>
                                <span className="text-stone-500">Duration: {log.durationMs}ms</span>
                                <span className={`px-1 rounded uppercase font-bold ${log.status === 'success' ? 'bg-amber-950/40 text-amber-500 border border-amber-600/20' : 'bg-rose-950/40 text-rose-400 border border-rose-900/20'}`}>{log.status}</span>
                              </div>
                            </div>
                            {log.parameters && Object.keys(log.parameters).length > 0 && (
                              <div className="text-stone-500 mb-1 text-[9px]">Arguments: {JSON.stringify(log.parameters)}</div>
                            )}
                            <pre className="whitespace-pre-wrap select-text leading-normal font-mono font-medium text-stone-300 p-1.5 bg-[#100b08] rounded border border-[#2d231d] text-[10px] custom-scrollbar">{log.result}</pre>
                          </div>
                        ))
                      ) : (
                        <div className="text-stone-500 text-center py-8 italic text-xs">No automated executions logged. Automated tasks check for triggers every 10 seconds.</div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Diary Scratchpad Tab */}
              {activeTab === 'diary' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
                  
                  {/* Left Column: Note Catalog */}
                  <div className="lg:col-span-4 bg-[#17120e] border border-[#2d231d] rounded-md p-3 shadow-sm flex flex-col h-[280px] lg:h-full max-h-[520px]">
                    <div className="flex items-center justify-between border-b border-[#2d231d]/40 pb-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen size={14} className="text-amber-500" />
                        <h3 className="font-semibold text-[10px] font-mono tracking-wide uppercase text-stone-300">NOTEBOOK_REPOSITORIES</h3>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedNote(null);
                          setNoteTitle('New Note Entry');
                          setNoteContent('');
                        }}
                        className="p-1 rounded bg-[#1c1410] hover:bg-[#201813] text-amber-500 border border-[#2d231d] cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {db?.notes && db.notes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setSelectedNote(n);
                            setNoteTitle(n.title);
                            setNoteContent(n.content);
                          }}
                          className={`p-2.5 rounded border transition-all cursor-pointer text-xs ${
                            selectedNote?.id === n.id ? 'bg-amber-950/20 border-amber-600/40' : 'bg-[#1c1410]/60 border-[#2d231d]/80 hover:border-amber-600/20'
                          }`}
                        >
                          <div className="font-semibold text-stone-200 font-mono mb-0.5 truncate">{n.title}</div>
                          <p className="text-stone-400 font-sans line-clamp-2 leading-relaxed text-[11px]">{n.content}</p>
                          <span className="text-[8px] text-stone-500 font-mono block mt-1.5 text-right">{n.updatedAt.slice(11, 16)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Note Viewer/Editor */}
                  <div className="lg:col-span-8 flex flex-col bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm h-[450px] lg:h-full font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-[#2d231d]/40 pb-2 mb-3">
                      <span className="font-semibold text-stone-400 text-[10px]">NOTE_EDITOR</span>
                      {selectedNote && (
                        <button
                          onClick={() => handleDeleteNote(selectedNote.id)}
                          className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 border border-rose-900/40 px-1.5 py-0.5 bg-rose-950/20 rounded cursor-pointer text-[9px]"
                        >
                          <Trash2 size={10} />
                          <span>DELETE</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col">
                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Note Title</span>
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Note Title..."
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 font-semibold"
                        />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase font-mono">Content Markdown</span>
                        <textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Type notes or diary details here (Markdown supported)..."
                          className="w-full flex-1 bg-[#1c1410] border border-[#2d231d] rounded p-2.5 text-stone-200 focus:outline-none focus:border-amber-600/40 font-sans resize-none text-[12px] leading-relaxed custom-scrollbar"
                        />
                      </div>

                      <button
                        onClick={handleSaveNote}
                        disabled={savingNote}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold font-mono transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-[10px]"
                      >
                        <Save size={12} />
                        <span>{savingNote ? 'WRITING...' : 'SAVE_NOTE_PERSISTENCE'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Tasks Checklist Tab */}
              {activeTab === 'checklist' && (
                <div className="max-w-xl mx-auto bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm font-mono text-xs">
                  <div className="flex items-center space-x-2 border-b border-[#2d231d]/40 pb-2 mb-4 justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckSquare size={15} className="text-amber-500" />
                      <h3 className="font-semibold text-[10px] tracking-wide uppercase text-stone-300">TASKS_CHECKLIST</h3>
                    </div>
                    <span className="text-[8px] bg-[#1c1410] px-1.5 py-0.5 rounded text-stone-500">STATE_PERSISTED</span>
                  </div>

                  {/* Add checklist item */}
                  <form onSubmit={handleAddTodo} className="mb-4 flex space-x-1.5">
                    <input
                      type="text"
                      placeholder="Add task content descriptor..."
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      className="flex-1 bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-600/40 text-stone-200"
                    />
                    <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1.5 font-semibold flex items-center space-x-1 transition-all cursor-pointer text-[10px]">
                      <Plus size={12} />
                      <span>ADD</span>
                    </button>
                  </form>

                  {/* Checklist items */}
                  <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {db?.todos && db.todos.length > 0 ? (
                      db.todos.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTodo(t.id)}
                          className={`p-2.5 bg-[#1c1410]/40 border rounded flex items-center justify-between cursor-pointer group transition-all ${
                            t.completed ? 'border-[#2d231d]/20 opacity-60' : 'border-[#2d231d]/60 hover:border-amber-600/20'
                          }`}
                        >
                          <div className="flex items-center space-x-2 select-none">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                              t.completed ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2d231d]'
                            }`}>
                              {t.completed && <Check size={9} />}
                            </div>
                            <span className={`text-[11px] ${t.completed ? 'line-through text-stone-500 font-sans' : 'text-stone-300 font-sans'}`}>{t.text}</span>
                          </div>
                          <span className="text-[8px] text-stone-500 group-hover:text-rose-400 transition-colors uppercase">Mute ID [{t.id}]</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-stone-500 text-center py-8 italic text-xs">No checklist items registered. Create one above.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Chatbot Gateways Tab */}
              {activeTab === 'gateway' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* Webhook Settings Form */}
                  <div className="lg:col-span-5 bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm font-mono text-xs">
                    <div className="flex items-center space-x-2 border-b border-[#2d231d] pb-2 mb-3">
                      <Globe size={15} className="text-amber-500" />
                      <h3 className="font-semibold text-[10px] tracking-wide uppercase text-stone-200">GATEWAY_WEBHOOKS</h3>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-3">
                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Telegram Bot Token</span>
                        <input
                          type="password"
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          placeholder="Token from @BotFather..."
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-600/40"
                        />
                      </div>

                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Telegram Chat ID</span>
                        <input
                          type="text"
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          placeholder="Your Telegram User/Chat ID..."
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-600/40"
                        />
                      </div>

                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Discord Webhook URL</span>
                        <input
                          type="password"
                          value={discordWebhookUrl}
                          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                          placeholder="Discord Server Integration Webhook link..."
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-600/40"
                        />
                      </div>

                      <div className="pt-2 border-t border-[#2d231d] space-y-2">
                        <span className="text-stone-500 text-[9px] block uppercase font-semibold">Active Transmission Channels</span>
                        <div className="flex items-center justify-between">
                          <label className="text-stone-400 select-none text-[11px]">Mute Telegram Channel</label>
                          <input
                            type="checkbox"
                            checked={tgEnabled}
                            onChange={(e) => setTgEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 rounded bg-[#1c1410] border-[#2d231d] text-amber-600 focus:ring-0"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-stone-400 select-none text-[11px]">Mute Discord Channel</label>
                          <input
                            type="checkbox"
                            checked={dcEnabled}
                            onChange={(e) => setDcEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 rounded bg-[#1c1410] border-[#2d231d] text-amber-600 focus:ring-0"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-stone-400 select-none text-[11px]">Mute Terminal CLI Logs</label>
                          <input
                            type="checkbox"
                            checked={termEnabled}
                            onChange={(e) => setTermEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 rounded bg-[#1c1410] border-[#2d231d] text-amber-600 focus:ring-0"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex space-x-1.5">
                        <button
                          type="submit"
                          disabled={savingConfig}
                          className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold cursor-pointer font-mono text-[10px]"
                        >
                          {savingConfig ? 'SYNCING...' : 'SAVE_GATEWAY_CONFIG'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSimulateGateway}
                          className="px-2.5 bg-[#201813] hover:bg-[#2c211b] text-stone-200 border border-[#2d231d] hover:border-amber-600/40 rounded font-mono text-[10px] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Play size={12} />
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Step-by-Step Instructions Panel */}
                  <div className="lg:col-span-7 bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm text-xs leading-relaxed">
                    <div className="flex items-center space-x-2 border-b border-[#2d231d] pb-2 mb-3">
                      <Info size={14} className="text-amber-500" />
                      <h3 className="font-semibold font-mono text-[10px] tracking-wide uppercase text-stone-200">DEPLOYING_GATEWAYS_ON_CLOUD</h3>
                    </div>

                    <div className="space-y-3 text-stone-300">
                      <p className="text-[11px]">Because this application runs server-side on your secure container, it is capable of operating 24/7 as an autonomous bridge to your primary chatting software. Here is how to configure actual integrations:</p>
                      
                      <div className="p-2.5 bg-[#201813]/40 rounded border border-[#2d231d]">
                        <h4 className="font-semibold text-stone-200 font-mono text-[10px] uppercase mb-1 text-amber-500">1. Telegram Chatbot Routing</h4>
                        <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                          <li>Message <b className="text-stone-200">@BotFather</b> on Telegram, send <code className="text-amber-400 bg-slate-950 px-1 py-0.2 rounded font-mono">/newbot</code>, and save your token.</li>
                          <li>Lookup your Chat ID by messaging <b className="text-stone-200">@userinfobot</b> on Telegram.</li>
                          <li>Paste these details in the configuration form on the left, check "Mute Telegram Channel" to UNMUTE, and click Save.</li>
                        </ol>
                      </div>

                      <div className="p-2.5 bg-[#201813]/40 rounded border border-[#2d231d]">
                        <h4 className="font-semibold text-stone-200 font-mono text-[10px] uppercase mb-1 text-amber-500">2. Discord Server Webhooks</h4>
                        <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                          <li>In your Discord server, select a text channel, click **Edit Channel** (gear icon) &gt; **Integrations** &gt; **Webhooks**.</li>
                          <li>Click **Create Webhook**, copy the link, paste it in the Discord input field, and unmute.</li>
                          <li>Any automated cron schedule outputs will automatically bridge straight to your Discord server!</li>
                        </ol>
                      </div>

                      <p className="text-[10px] text-stone-500 font-mono italic">
                        *Gateways utilize async node modules to safely process notifications without exposing system configurations or secret API keys to clients.
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {/* Learning & Skill Synthesizer Tab */}
              {activeTab === 'learning' && (
                <div className="flex flex-col gap-4 w-full h-full min-h-0 overflow-y-auto custom-scrollbar">
                  
                  {/* Visual Cognitive Synapse Net */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 flex flex-col">
                      <div className="h-[250px] w-full">
                        <InteractiveNeuronNetwork learnings={db?.learnings || []} memories={db?.memories || []} />
                      </div>
                    </div>

                    {/* Synaptic Net Legend / Status Panel */}
                    <div className="lg:col-span-4 flex flex-col bg-[#140f0c] border border-[#2d231d] rounded-md p-4 justify-between font-mono text-xs">
                      <div>
                        <div className="flex items-center space-x-2 border-b border-[#2d231d] pb-2 mb-2">
                          <Brain size={14} className="text-orange-500 animate-pulse" />
                          <h3 className="font-bold text-[10px] uppercase text-stone-200">COGNITIVE_PROJECTION_LEGEND</h3>
                        </div>
                        <p className="text-[10px] text-stone-400 leading-normal mb-3 font-sans">
                          Alice's neural model simulates active knowledge projection. Synapses adapt relative to mouse proximity and database size.
                        </p>
                        <div className="space-y-1.5 text-[9px] uppercase">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shadow-[0_0_6px_#ea580c]" />
                            <span className="text-orange-400 font-bold">Active Learnings ({db?.learnings?.length || 0})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]" />
                            <span className="text-amber-400 font-bold">Long-Term Memories ({db?.memories?.length || 0})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#45352c]" />
                            <span className="text-stone-500">Latent Synaptic Buffers</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#2d231d] mt-2 bg-[#1c1410]/40 p-2 rounded text-[9px] font-sans text-stone-400">
                        <span className="font-mono text-[8px] font-bold uppercase text-amber-500 block mb-0.5">DYNAMIC REAL-TIME ACTION</span>
                        Interactive Nodes: Hover over any active neuron projection to pull the synapse. Hover to inspect corresponding memory titles and learning nodes!
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Bento Grid for Self-Learning Dashboard & Synthesizer Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    
                    {/* Column 1: Self-Learning Dashboard & Lessons Ledger */}
                    <div className="lg:col-span-7 flex flex-col bg-[#140f0c] border border-[#2d231d] rounded-md p-4 font-mono text-xs overflow-y-auto max-h-[500px] custom-scrollbar">
                      <div className="flex items-center justify-between border-b border-[#2d231d] pb-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <BookOpen size={14} className="text-amber-500" />
                          <h3 className="font-bold text-[10px] tracking-wide uppercase text-stone-200">SELF_LEARNING_LEDGER</h3>
                        </div>
                        <button 
                          onClick={handleClearLearnings}
                          className="text-[9px] bg-red-950/40 text-red-400 hover:bg-red-900/30 border border-red-900/40 px-2 py-0.5 rounded cursor-pointer transition-all"
                        >
                          Clear Ledger Cache
                        </button>
                      </div>

                      {/* Dynamic Counters Row */}
                      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                        <div className="bg-[#1c1410] border border-[#2d231d] p-1.5 rounded">
                          <span className="text-[14px] font-bold text-orange-500 font-mono block">
                            {db?.learnings?.filter(l => l.type === 'conversation').length || 0}
                          </span>
                          <span className="text-[8px] text-stone-500 uppercase block font-sans">Chats</span>
                        </div>
                        <div className="bg-[#1c1410] border border-[#2d231d] p-1.5 rounded">
                          <span className="text-[14px] font-bold text-amber-500 font-mono block">
                            {db?.learnings?.filter(l => l.type === 'task').length || 0}
                          </span>
                          <span className="text-[8px] text-stone-500 uppercase block font-sans">Tasks</span>
                        </div>
                        <div className="bg-[#1c1410] border border-[#2d231d] p-1.5 rounded">
                          <span className="text-[14px] font-bold text-emerald-500 font-mono block">
                            {db?.learnings?.filter(l => l.type === 'code_fix').length || 0}
                          </span>
                          <span className="text-[8px] text-stone-500 uppercase block font-sans">Code Fixes</span>
                        </div>
                        <div className="bg-[#1c1410] border border-[#2d231d] p-1.5 rounded">
                          <span className="text-[14px] font-bold text-[#ea580c] font-mono block">
                            {db?.learnings?.filter(l => l.type === 'failure_healing').length || 0}
                          </span>
                          <span className="text-[8px] text-stone-500 uppercase block font-sans">Self Healed</span>
                        </div>
                      </div>

                      {/* Scrollable list of lessons */}
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {db?.learnings && db.learnings.length > 0 ? (
                          db.learnings.map((lesson) => {
                            const isExpanded = expandedLessonId === lesson.id;
                            let typeIcon = '💬';
                            let typeColor = 'text-sky-400 border-sky-900/40 bg-sky-950/40';
                            if (lesson.type === 'task') {
                              typeIcon = '⚙️';
                              typeColor = 'text-amber-400 border-amber-900/40 bg-amber-950/40';
                            } else if (lesson.type === 'code_fix') {
                              typeIcon = '💻';
                              typeColor = 'text-emerald-400 border-emerald-900/40 bg-emerald-950/40';
                            } else if (lesson.type === 'failure_healing') {
                              typeIcon = '🛡️';
                              typeColor = 'text-orange-400 border-orange-900/40 bg-orange-950/40';
                            }

                            return (
                              <div 
                                key={lesson.id} 
                                className={`p-2.5 rounded border transition-all ${
                                  isExpanded 
                                    ? 'bg-[#1c1410] border-amber-600/40 shadow-md' 
                                    : 'bg-[#17110e]/60 border-[#2d231d] hover:border-amber-600/20'
                                }`}
                              >
                                <div 
                                  className="flex items-start justify-between cursor-pointer"
                                  onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id)}
                                >
                                  <div className="flex items-start space-x-2">
                                    <span className="text-sm mt-0.5 shrink-0">{typeIcon}</span>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-stone-200 text-xs hover:text-amber-500 transition-colors">{lesson.title}</span>
                                        <span className={`text-[8px] px-1 py-0.2 rounded border font-bold uppercase shrink-0 ${typeColor}`}>
                                          {lesson.type.replace('_', ' ')}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-stone-400 mt-1 font-sans leading-relaxed">
                                        {lesson.description}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                                    <span className="text-[8px] text-stone-500">{lesson.timestamp?.slice(0, 16).replace('T', ' ')}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLearning(lesson.id);
                                      }}
                                      className="text-stone-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                {/* Expandable detailed review panel */}
                                {isExpanded && (
                                  <div className="mt-3 pt-2.5 border-t border-[#2d231d] text-[10px] text-stone-300 font-sans leading-relaxed animate-fadeIn">
                                    <span className="font-mono text-[8px] text-amber-500 font-semibold block uppercase mb-1">
                                      Alice Cognitive Insight Details
                                    </span>
                                    <p className="bg-[#120c09] border border-[#2d231d] p-2 rounded text-stone-300 font-mono text-[9px] whitespace-pre-wrap leading-normal">
                                      {lesson.details || 'No deep analytical telemetry captured for this milestone. Connection stable.'}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between font-mono text-[8px] text-stone-500">
                                      <span>PERSISTENCE: ENVELOPE STABLE</span>
                                      <span className="uppercase text-emerald-500 font-semibold">Status: {lesson.status}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-stone-600 text-center py-10">
                            <span>💬 // NO LESSONS STORED YET</span>
                            <p className="text-[10px] font-sans text-stone-500 max-w-xs mt-1">
                              Chat with Alice or synthesize custom skills to trigger autonomous cognitive learning!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Original Autonomous Synthesizer Form & Logs Console */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                      
                      {/* Sub-panel 1: Blueprint Form */}
                      <div className="bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm font-mono text-xs overflow-y-auto custom-scrollbar">
                        <div className="flex items-center space-x-2 border-b border-[#2d231d] pb-2 mb-3">
                          <Layers size={14} className="text-amber-500" />
                          <h3 className="font-semibold text-[10px] tracking-wide uppercase text-stone-200">SKILL_METADATA_BLUEPRINT</h3>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Skill Name (Unique Identifier)</span>
                            <input
                              type="text"
                              value={learningName}
                              onChange={(e) => setLearningName(e.target.value.replace(/\s+/g, ''))}
                              placeholder="e.g., DockerMonitor"
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 text-xs font-sans"
                            />
                          </div>

                          <div>
                            <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Skill Description</span>
                            <input
                              type="text"
                              value={learningDesc}
                              onChange={(e) => setLearningDesc(e.target.value)}
                              placeholder="Describe what this skill executes..."
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 text-xs font-sans"
                            />
                          </div>

                          <div>
                            <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Trigger Phrase / Keyword</span>
                            <input
                              type="text"
                              value={learningTrigger}
                              onChange={(e) => setLearningTrigger(e.target.value)}
                              placeholder="Phrase to trigger this skill (e.g. docker status)"
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 text-xs font-sans"
                            />
                          </div>

                          <div>
                            <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">System Instructions / Execution Script</span>
                            <textarea
                              rows={3}
                              value={learningSystem}
                              onChange={(e) => setLearningSystem(e.target.value)}
                              placeholder="Core instructions for this skill sandbox execution..."
                              className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 text-xs font-sans"
                            />
                          </div>

                          {/* Simulation Strategy */}
                          <div className="p-3 bg-[#201813] border border-[#2d231d] rounded-md space-y-2">
                            <span className="text-stone-400 text-[9px] block uppercase font-bold tracking-wider">Validation Simulation Mode</span>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-stone-300 text-[11px] font-medium flex items-center space-x-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="simMode"
                                  checked={learningSimMode === 'standard'}
                                  onChange={() => setLearningSimMode('standard')}
                                  className="w-3 h-3 text-amber-600 bg-stone-900 border-stone-800 focus:ring-0 focus:ring-offset-0"
                                />
                                <span>Standard Compilation (Healthy)</span>
                              </label>
                              <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1 py-0.2 rounded font-mono font-semibold uppercase">1-TICK</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <label className="text-stone-300 text-[11px] font-medium flex items-center space-x-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="simMode"
                                  checked={learningSimMode === 'healing'}
                                  onChange={() => setLearningSimMode('healing')}
                                  className="w-3 h-3 text-amber-600 bg-stone-900 border-stone-800 focus:ring-0 focus:ring-offset-0"
                                />
                                <span>Trigger Overlap (Auto-Repair & Healing)</span>
                              </label>
                              <span className="text-[8px] bg-rose-950 text-rose-400 px-1 py-0.2 rounded font-mono font-semibold uppercase">SELF-HEAL</span>
                            </div>
                          </div>

                          <button
                            onClick={handleRunAutonomousSynthesis}
                            disabled={learningStep > 0 && learningStep < 4}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-[#241d18] disabled:text-stone-600 text-white font-bold rounded transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                          >
                            <RefreshCw className={learningStep > 0 && learningStep < 4 ? 'animate-spin' : ''} size={13} />
                            <span>{learningStep > 0 && learningStep < 4 ? 'Synthesizing Skill...' : 'Activate Autonomous Synthesizer'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-panel 2: Console Logs Screen */}
                      <div className="flex flex-col bg-[#140f0c] border border-[#2d231d] rounded-md overflow-hidden font-mono text-xs max-h-[300px]">
                        <div className="px-3 py-2 border-b border-[#2d231d] bg-[#100b08] flex items-center justify-between select-none">
                          <div className="flex items-center space-x-2">
                            <TerminalIcon className="text-amber-500" size={13} />
                            <span className="font-bold text-stone-400 text-[10px]">AUTONOMOUS_LEARNING_CONSOLE</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {learningStep === 0 && <span className="text-[8px] bg-[#251d18] text-stone-400 px-1.5 py-0.5 rounded">STANDBY</span>}
                            {learningStep > 0 && learningStep < 4 && <span className="text-[8px] bg-amber-950 text-amber-500 px-1.5 py-0.5 rounded animate-pulse">PROCESSING</span>}
                            {learningStep === 4 && <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">ACTIVE & REGISTERED</span>}
                          </div>
                        </div>

                        <div className="p-3 bg-[#100b08] overflow-y-auto space-y-1.5 custom-scrollbar text-[10px] min-h-[120px] max-h-[180px]">
                          {learningLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-stone-600 space-y-1 py-8">
                              <span>// SYNAPSE SYSTEM ONLINE</span>
                              <span className="text-[9px] animate-pulse">Waiting for compile signal...</span>
                            </div>
                          ) : (
                            learningLogs.map((log, idx) => (
                              <div
                                key={idx}
                                className={`leading-relaxed whitespace-pre-wrap ${
                                  log.startsWith('❌') 
                                    ? 'text-rose-400 font-bold' 
                                    : log.startsWith('✅') 
                                      ? 'text-emerald-400 font-bold' 
                                      : log.includes('[SELF-HEALING]') 
                                        ? 'text-amber-500 font-semibold' 
                                        : 'text-stone-300'
                                }`}
                              >
                                {log}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Registered list panel inside console box */}
                        <div className="p-3 border-t border-[#2d231d] bg-[#140f0c] text-[9px] space-y-1.5">
                          <span className="block font-bold uppercase text-stone-500 tracking-wider">Currently Deployed Custom Skills ({db?.skills?.length || 0})</span>
                          <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
                            {db?.skills && db.skills.length > 0 ? (
                              db.skills.map((s) => (
                                <div key={s.id} className="flex items-center justify-between p-1 rounded bg-[#1c1410] border border-[#2d231d]">
                                  <div className="flex items-center space-x-1 truncating w-5/6">
                                    <span className="text-amber-500 font-bold shrink-0">#{s.name}</span>
                                    <span className="text-stone-500 truncate">({s.triggerPrompt}) - {s.description}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteSkill(s.id)}
                                    className="text-stone-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="text-stone-600 italic">No skills registered. Run synthesizer to create one!</div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* Node Settings Tab */}
              {activeTab === 'settings' && (
                <div className="max-w-xl mx-auto bg-[#17120e] border border-[#2d231d] rounded-md p-4 shadow-sm font-mono text-xs">
                  <div className="flex items-center space-x-2 border-b border-[#2d231d]/40 pb-2 mb-4">
                    <Settings size={15} className="text-amber-500" />
                    <h3 className="font-semibold text-[10px] tracking-wide uppercase text-stone-300">NODE_CONFIGURATION_MANAGER</h3>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">AI Model Provider</span>
                        <select
                          value={aiProvider}
                          onChange={(e: any) => {
                            setAiProvider(e.target.value);
                            if (e.target.value === 'gemini') {
                              setModelName('gemini-3.5-flash');
                            } else if (e.target.value === 'openai') {
                              setModelName('gpt-4o-mini');
                            } else if (e.target.value === 'anthropic') {
                              setModelName('claude-3-5-sonnet-latest');
                            } else if (e.target.value === 'custom') {
                              setModelName('');
                            }
                          }}
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 text-xs"
                        >
                          <option value="gemini">Google Gemini AI</option>
                          <option value="openai">OpenAI Endpoint</option>
                          <option value="anthropic">Anthropic Claude</option>
                          <option value="openrouter">OpenRouter Gateway</option>
                          <option value="custom">Custom Endpoint Provider</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Model Endpoint / Model Name</span>
                        <input
                          type="text"
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="gemini-3.5-flash, gpt-4o, etc."
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 font-sans"
                        />
                      </div>
                    </div>

                    {aiProvider === 'custom' ? (
                      <CustomProviderSettings
                        customEndpoint={customEndpoint}
                        setCustomEndpoint={setCustomEndpoint}
                        customApiKey={customApiKey}
                        setCustomApiKey={setCustomApiKey}
                        customModels={customModels}
                        fetchingModels={fetchingModels}
                        modelsError={customModelsError}
                        onCheckModels={handleCheckCustomModels}
                        modelName={modelName}
                        setModelName={setModelName}
                      />
                    ) : (
                      <div>
                        <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Custom Provider API Key</span>
                        <input
                          type="password"
                          value={customApiKey}
                          onChange={(e) => setCustomApiKey(e.target.value)}
                          placeholder="Paste your custom secret API Key..."
                          className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-amber-600/40 font-sans"
                        />
                        <div className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                          *If you select **Google Gemini AI (Default)**, your secret key is automatically provisioned securely from your **Settings &gt; Secrets** environment panel. You can leave this key field blank unless switching to external providers.
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#2d231d]/60 space-y-1 text-stone-400 leading-normal text-[10px]">
                      <h4 className="font-bold text-stone-300 uppercase text-[9px] mb-1">Cluster Sandbox Telemetry:</h4>
                      <div>• **Runtime Environment**: Cloud Run Sandboxed Node Container</div>
                      <div>• **Node Ingress Port**: 3000 (Forwarded to live preview iframe proxy)</div>
                      <div>• **Persistence Host**: Local server file storage: <code className="text-amber-500">/data/db.json</code> (Active)</div>
                      <div>• **Memory consolidation logic**: Enabled on chat intercept ticks</div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono rounded transition-all cursor-pointer flex items-center justify-center space-x-1 text-[10px]"
                    >
                      <Save size={12} />
                      <span>{savingConfig ? 'SYNCHRONIZING...' : 'SYNCHRONIZE_SETTINGS'}</span>
                    </button>
                  </form>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }
