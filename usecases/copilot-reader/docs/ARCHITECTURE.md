# Reader IDE — Architecture & Design

This document describes the high-level architecture, component responsibilities, data flow, and key design decisions behind Reader IDE.

---

## Overview

Reader IDE is a full-stack application that presents EPUB books in a VS Code-style reading interface with an AI chat companion powered by the GitHub Copilot SDK. It consists of three main layers:

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                   │
│   Library Page  ·  Three-Panel Reader  ·  Copilot Chat   │
├──────────────────────────────────────────────────────────┤
│                 FastAPI Backend (Python)                  │
│   REST API  ·  EPUB Processor  ·  Chat Manager (SSE)     │
├──────────────────────────────────────────────────────────┤
│                   GitHub Copilot SDK                     │
│   CopilotClient  ·  Sessions  ·  Tool Execution         │
└──────────────────────────────────────────────────────────┘
│                  File System (data/)                      │
│   Book folders  ·  Chapter .txt files  ·  metadata.json  │
└──────────────────────────────────────────────────────────┘
```

---

## System Architecture

```
                          ┌─────────────┐
                          │   Browser    │
                          └──────┬──────┘
                                 │ HTTP / SSE
                                 ▼
                ┌────────────────────────────────┐
                │   FastAPI  (uvicorn :8000)      │
                │                                │
                │  /api/upload    POST  ──────►  EPUB Processor
                │  /api/books     GET            │
                │  /api/books/:id/chapters  GET  │
                │  /api/books/:id/chat  POST ──►  ChatManager ──► Copilot SDK
                │  /api/books/:id/notes  CRUD    │
                │  /api/skills    GET            │
                │  /api/agents    GET            │
                │  /api/auth/*    GET/POST       │
                │                                │
                │  Static file serving (prod)     │
                └───────────┬────────────────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │    data/<book-slug>/   │
                │    ├── metadata.json   │
                │    ├── 01-chapter.txt  │
                │    ├── 02-chapter.txt  │
                │    └── ...             │
                │    data/<slug>_notes/  │
                │    ├── my_note.txt     │
                │    └── ...             │
                └────────────────────────┘
```

---

## Component Deep Dive

### 1. Frontend — React + TypeScript + Vite

The frontend is a single-page application built with React, TypeScript, and Vite.

**Pages:**

| Page | Route | Purpose |
|------|-------|---------|
| **Library** | `/` | Landing page — upload EPUBs, browse book collection, authenticate with GitHub token |
| **Reader** | `/read/:bookId` | Three-panel reading environment |

**Reader Layout — Three Resizable Panels:**

```
┌──────────┬───────────────────────────┬──────────────────────┐
│          │                           │  COPILOT — Book Title│
│ EXPLORER │   Chapter Title     [tab] │                      │
│          │   breadcrumb / path       │  ┌────────────────┐  │
│ chapter1 │                           │  │ assistant msg   │  │
│ chapter2 │   Chapter text content    │  │ tool usage      │  │
│ chapter3 │   rendered as plain text  │  │ reasoning       │  │
│ chapter4◄│   with scroll             │  └────────────────┘  │
│ chapter5 │                           │  ┌────────────────┐  │
│ ...      │                           │  │ user msg        │  │
│          │                           │  └────────────────┘  │
│ [NOTES]  │                           │                      │
│          │                           │  [input] [send]      │
└──────────┴───────────────────────────┴──────────────────────┘
│  Status bar: Book title · Chapter · N chapters              │
└─────────────────────────────────────────────────────────────┘
```

- **FileTree** (`FileTree.tsx`) — Sidebar explorer listing chapters as files. Also has a NOTES tab for viewing saved notes.
- **TextViewer** (`TextViewer.tsx`) — Center panel displaying chapter plain text with tabs and breadcrumb navigation.
- **CopilotChat** (`CopilotChat.tsx`) — Right panel with the AI chat interface. Shows streaming responses, inline tool-use indicators, reasoning traces, and supports `/skill` and `@agent` commands.
- **NotesPanel** (`NotesPanel.tsx`) — AI-generated and manually-created notes for the book.

**Key frontend patterns:**
- **SSE streaming** — The chat uses `fetch` with a readable stream to parse Server-Sent Events from the backend. Each SSE event is typed (`delta`, `tool_start`, `tool_complete`, `reasoning`, `error`).
- **Model selector** — Users can switch between allowed models (`gpt-4.1`, `claude-sonnet-4`, `gpt-5-mini`).
- **Skill/Agent dropdowns** — Type `/` for skills or `@` for agents; a popup lets the user pick from available options.
- **Markdown rendering** — Assistant responses are rendered with `react-markdown`.

### 2. Backend — FastAPI (Python)

A single FastAPI application serving REST endpoints, SSE chat streams, and (in production) the built React static files.

**Module breakdown:**

| Module | Responsibility |
|--------|---------------|
| `main.py` | FastAPI app setup, CORS, route definitions, lifespan (start/stop Copilot SDK), static file serving |
| `epub_processor.py` | Parse EPUB files → extract chapters as `.txt` → write `metadata.json`. Adapted from [karpathy/reader3](https://github.com/karpathy/reader3) |
| `copilot_chat.py` | `ChatManager` class wrapping the Copilot SDK. Manages client lifecycle, per-book sessions, tool definitions, skill/agent prompt injection, SSE streaming |
| `skills/__init__.py` | Auto-discovers `*.skill.md` files, parses YAML frontmatter + prompt body, exposes registry |
| `agents/__init__.py` | Auto-discovers `*.agent.md` files, parses YAML frontmatter + persona prompt, exposes registry |

**Key backend patterns:**
- **Lifespan management** — The `CopilotClient` starts when the app starts (if `GITHUB_TOKEN` is set) and stops on shutdown.
- **File-based storage** — No database; books are stored as folders of `.txt` files with a `metadata.json`. Notes are stored in a sibling `<book_id>_notes/` folder.
- **Path traversal protection** — All file-read endpoints validate that resolved paths stay within expected directories.

### 3. EPUB Processor

Adapted from [Karpathy's reader3](https://github.com/karpathy/reader3), this module transforms an uploaded EPUB into a folder of plain-text chapter files.

**Processing pipeline:**

```
EPUB file
  │
  ▼
ebooklib.epub.read_epub()
  │
  ├── extract_metadata()  →  title, authors, language, subjects, ...
  ├── parse_toc_recursive()  →  TOC entries (title ↔ file_href mapping)
  │   └── get_fallback_toc()  (if TOC is empty, derive from spine)
  │
  ▼
For each spine item:
  ├── BeautifulSoup parse HTML
  ├── clean_html_content()  →  strip scripts, styles, nav, forms
  ├── extract_plain_text()  →  whitespace-normalised text
  ├── Skip if < 20 chars
  └── Write  NN-slugified-title.txt
  │
  ▼
Write metadata.json  →  { book_id, title, authors, chapters[], ... }
```

**Output structure:**
```
data/dracula/
├── metadata.json
├── 01-d-r-a-c-u-l-a.txt
├── 02-contents.txt
├── 03-section-4.txt
├── 04-chapter-i.txt
├── ...
└── 32-the-full-project-gutenberg-license.txt
```

### 4. Copilot Chat — The AI Layer

The `ChatManager` in `copilot_chat.py` is the heart of the AI features.

**Lifecycle:**

```
App startup
  └── ChatManager.start()  →  CopilotClient()  →  client.start()

User sends a message to /api/books/:id/chat
  └── ChatManager.chat_stream()
        ├── Parse /skill or @agent prefix
        ├── Inject skill prompt or agent persona
        ├── Inject current chapter text as context (up to 12k chars)
        ├── Get or create session for (book_id, model)
        │     └── create_session() with system message, tools, custom_agents
        ├── session.send_and_wait() — async with event handler
        └── Yield SSE events from queue → StreamingResponse

App shutdown
  └── ChatManager.stop()  →  client.stop()
```

**Grounding strategy:**
1. A **system message** establishes the AI as a reading companion for the specific book, including rules about staying on-topic.
2. The **current chapter text** (up to 12k chars) is prepended to the user message as context.
3. The AI has **tools** to read other chapters, search the entire book, and manage notes — so it can answer questions that span beyond the visible chapter.

**Registered tools (Copilot SDK `@define_tool`):**

| Tool | Description |
|------|-------------|
| `read_chapter` | Read the full text of a specific chapter |
| `list_chapters` | List all chapters with titles and filenames |
| `search_book` | Case-insensitive text search across all chapters |
| `create_note` | Create a new `.txt` note in the book's notes folder |
| `edit_note` | Overwrite an existing note |
| `append_note` | Append text to an existing note |
| `list_notes` | List all saved notes |
| `read_note` | Read a specific note |
| `delete_note` | Delete a specific note |

**SSE event types streamed to the frontend:**

| Event Type | Payload | Description |
|-----------|---------|-------------|
| `delta` | `{ content }` | Token-by-token assistant text |
| `tool_start` | `{ tool_name, arguments }` | A tool call is beginning |
| `tool_complete` | `{ tool_name, result }` | A tool call finished (result preview capped at 500 chars) |
| `reasoning` | `{ content }` | Model's chain-of-thought reasoning deltas |
| `error` | `{ message }` | Session error |
| `[DONE]` | — | Stream complete |

### 5. Skills System

Skills are **slash commands** (`/recap`, `/summary`, `/explain`, `/theme`, `/timeline`) that inject a structured prompt into the conversation.

**How it works:**
1. User types `/recap` in the chat input.
2. Frontend sends the raw `/recap ...` string to the backend.
3. `ChatManager._parse_skill()` detects the prefix, looks up the skill.
4. The skill's `prompt_template` (from the `.skill.md` body) replaces the user message.
5. The AI follows the skill's instructions (e.g., read earlier chapters, produce a structured recap).

**Adding a new skill:** Drop a `.skill.md` file in `backend/skills/` with YAML frontmatter:
```yaml
---
name: mytheme
display_name: My Theme
description: "Does something cool"
icon: Sparkles
placeholder: "Optional hint text..."
---

Your prompt instructions here...
```

No Python code changes needed — the registry auto-discovers it.

**Built-in skills:**

| Skill | Command | Purpose |
|-------|---------|---------|
| Summary | `/summary` | Concise summary of a chapter or section |
| Recap | `/recap` | Catch-up briefing of everything before the current chapter |
| Explain | `/explain` | Explain a passage, term, or concept |
| Theme | `/theme` | Analyse themes in the current chapter |
| Timeline | `/timeline` | Chronological timeline of events |

### 6. Agents System

Agents are **persona modes** (`@archivist`, `@critic`, `@philosopher`, `@historian`, `@debater`) that change the AI's personality and focus.

**How it works:**
1. User types `@critic What do you think of the writing style?`
2. `ChatManager._parse_agent()` detects the prefix, looks up the agent.
3. The agent's persona prompt is prepended to the user's message.
4. The AI responds in-character (e.g., the Critic gives a literary review).

**Adding a new agent:** Drop an `.agent.md` file in `backend/agents/`:
```yaml
---
name: myagent
display_name: My Agent
description: "Agent description"
icon: Bot
placeholder: "Hint text..."
---

Your persona prompt here...
```

**Built-in agents:**

| Agent | Handle | Persona |
|-------|--------|---------|
| Archivist | `@archivist` | Maintains a character bible — names, traits, relationships |
| Critic | `@critic` | Literary critic offering analysis and reviews |
| Philosopher | `@philosopher` | Explores philosophical themes and moral questions |
| Historian | `@historian` | Provides historical context for the book's setting and era |
| Debater | `@debater` | Takes contrarian positions to spark discussion |

---

## Data Flow Diagrams

### EPUB Upload Flow

```
User uploads .epub
       │
       ▼
POST /api/upload
       │
       ▼
Save to temp file
       │
       ▼
epub_processor.process_epub()
  ├── Parse with ebooklib
  ├── Extract metadata (title, authors, etc.)
  ├── Parse TOC → chapter title mapping
  ├── For each spine item:
  │     ├── Parse HTML → BeautifulSoup
  │     ├── Strip non-content elements
  │     ├── Extract plain text
  │     └── Write NN-slug.txt
  └── Write metadata.json
       │
       ▼
Return metadata to frontend
       │
       ▼
Library page shows new book card
```

### Chat Message Flow

```
User types message in CopilotChat
       │
       ▼
POST /api/books/:id/chat  { message, current_chapter, model }
       │
       ▼
ChatManager.chat_stream()
  ├── Detect /skill or @agent prefix
  ├── Inject skill prompt or agent persona
  ├── Prepend current chapter text (≤12k chars)
  ├── Get/create Copilot SDK session
  │     └── System message grounding the AI to the book
  ├── session.send_and_wait() with event handler
  │     ├── ASSISTANT_MESSAGE_DELTA  → { type: "delta", content }
  │     ├── TOOL_EXECUTION_START    → { type: "tool_start", tool_name, arguments }
  │     ├── TOOL_EXECUTION_COMPLETE → { type: "tool_complete", tool_name, result }
  │     ├── ASSISTANT_REASONING_DELTA → { type: "reasoning", content }
  │     ├── SESSION_ERROR           → { type: "error", message }
  │     └── SESSION_IDLE            → done
  └── Yield as SSE: "data: {json}\n\n"
       │
       ▼
Frontend reads SSE stream
  ├── "delta"        → append to message content
  ├── "tool_start"   → show spinner + tool name
  ├── "tool_complete" → update tool indicator
  ├── "reasoning"    → append to collapsible reasoning section
  ├── "error"        → show error in chat
  └── "[DONE]"       → mark message complete
```

---

## Deployment

### Docker (Single Container)

The Dockerfile uses a **multi-stage build**:

```
Stage 1: node:20-slim
  └── npm ci && npm run build  →  frontend/dist/

Stage 2: python:3.12-slim
  ├── Install Node.js 20 (needed for Copilot CLI)
  ├── npm install -g @github/copilot
  ├── pip install -r requirements.txt
  ├── Copy backend/ source
  ├── Copy frontend/dist/ → backend/static/
  └── CMD: uvicorn main:app --host 0.0.0.0 --port 8000
```

In production, FastAPI serves both the API (`/api/*`) and the React SPA (all other routes fall through to `index.html`).

### Azure Container Apps (CI/CD)

Infrastructure is defined in `infra/main.bicep`:

```
Resource Group
  ├── Log Analytics Workspace
  ├── Azure Container Registry (ACR)
  ├── Container Apps Environment
  └── Container App
        ├── Image from ACR
        ├── Ingress on port 8000
        └── GITHUB_TOKEN secret
```

A GitHub Actions workflow builds the Docker image, pushes to ACR, and updates the Container App.

---

## Authentication

Reader IDE uses a **GitHub Personal Access Token** for Copilot SDK authentication:

1. On first visit, the Library page checks `/api/auth/status`.
2. If not authenticated, a modal prompts for a GitHub token.
3. The token is sent to `POST /api/auth/token`, which calls `ChatManager.restart_with_token()`.
4. The token is stored in memory (and set as `GITHUB_TOKEN` env var) — not persisted to disk.
5. In Docker, `GITHUB_TOKEN` can be passed as an environment variable at runtime.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Plain text extraction** | LLMs work best with clean text. HTML/CSS noise wastes context tokens. Adapted from reader3's approach. |
| **File-based storage (no DB)** | Simplicity. Books are read-heavy, write-once data. A folder of `.txt` files is easy to inspect, debug, and backup. |
| **Per-book sessions** | Each book gets its own Copilot SDK session with a tailored system prompt. Keeps conversation context isolated. |
| **SSE streaming** | Real-time token-by-token display. SSE is simpler than WebSockets for unidirectional server→client streams. |
| **Markdown-based skills & agents** | Adding new skills or agents requires zero Python code — just drop a `.md` file. The registry auto-discovers them at import time. |
| **Chapter text in user message** | Instead of relying solely on tools, the current chapter is injected directly so the AI always has immediate context. Tools are available for cross-chapter queries. |
| **Single-container deploy** | Frontend and backend in one image simplifies hosting. No need for a reverse proxy or separate static file server. |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Router, react-markdown, Lucide icons |
| Backend | Python 3.12, FastAPI, uvicorn, Pydantic |
| EPUB parsing | ebooklib, BeautifulSoup4, lxml |
| AI | GitHub Copilot SDK (`github-copilot-sdk`), custom tools via `@define_tool` |
| Containerisation | Docker (multi-stage), Node.js 20 + Python 3.12 |
| Infrastructure | Azure Container Apps, Azure Container Registry, Bicep |
| CI/CD | GitHub Actions |
