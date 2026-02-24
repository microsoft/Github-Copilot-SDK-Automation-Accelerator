# Architecture

## Overview

The Copilot SDK Accelerator is a modular framework for building AI agents using the GitHub Copilot SDK. It provides:

- **Use-case agents** — domain-specific agents (monitoring, code review, security)
- **Multi-language support** — Node.js, Python, Go, .NET templates
- **CI/CD pipelines** — ready-to-use workflows for all major platforms
- **SDK utilities** — reusable helpers for agent development
- **CLI runner** — unified script for running any agent

## Data Flow

```
                         ┌─────────────────────────┐
                         │   CLI Runner / CI/CD     │
                         │  copilot-sdk-runner.sh   │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │    Use Case Agent        │
                         │  (e.g., aks-monitor)     │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   @github/copilot-sdk    │
                         │     CopilotClient        │
                         └────────────┬────────────┘
                                      │ JSON-RPC (stdio)
                         ┌────────────▼────────────┐
                         │   Copilot CLI Server     │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                  │
           ┌────────▼───────┐ ┌──────▼──────┐ ┌────────▼───────┐
           │  Custom Tools  │ │  MCP Servers │ │   LLM (GPT-4o) │
           │  (defineTool)  │ │  GitHub/AKS  │ │                │
           └────────────────┘ └─────────────┘ └────────────────┘
```

## Agent Lifecycle

1. **Initialization**: `CopilotClient` spawns a Copilot CLI server process
2. **Session Creation**: `client.createSession()` configures model, tools, MCP servers, system prompt
3. **Interaction Loop**: User messages → `session.sendAndWait()` → LLM processes → tool calls → response streaming
4. **Cleanup**: `client.stop()` terminates the CLI server and MCP child processes

## MCP Server Integration

MCP (Model Context Protocol) servers extend the agent's capabilities:

| Server | Transport | Purpose |
|--------|-----------|---------|
| GitHub | HTTP | Issue creation, PR management via `api.githubcopilot.com/mcp/` |
| Azure | stdio (npx) | Azure resource management via `@microsoft/mcp-server-azure` |
| AKS | stdio (npx) | AKS cluster diagnostics via `@azure/mcp-server-aks` |

## Directory Layout Rationale

- **`usecases/`** — Each use case is self-contained with its own `package.json` and dependencies, avoiding version conflicts
- **`sdk/`** — Shared utilities are separate so use cases can import them without coupling
- **`automation/`** — The runner script provides a unified entry point regardless of which use case or language is selected
- **CI/CD folders** — Separated by platform for easy copy-paste into target repositories
