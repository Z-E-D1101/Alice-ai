---
name: Alice AI stack
description: Key architecture decisions for the Alice AI personal assistant app
---

**Storage**: File-based `data/db.json` — no Supabase or external DB. All sessions, memories, skills, profile stored here.

**Long-term memory**: `add_memory` tool writes to `db.memories[]`. Every AI call injects all stored memories into the system prompt via `profileContext`. This is genuine cross-session memory.

**Streaming**: SSE endpoint `/api/chat/stream` using `ai.models.generateContentStream`. Required `X-Accel-Buffering: no` + `res.flush()` to work through Replit's nginx proxy.

**Model**: Default `gemini-2.5-flash`. `thinkingConfig: { thinkingBudget: 8192, includeThoughts: true }` enabled for 2.5 models. Thinking tokens sent as `{ type: 'thinking_token' }` SSE events.

**Why no Supabase**: App was designed for zero-config local persistence. Supabase would require external setup and credentials.
