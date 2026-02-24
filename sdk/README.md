# SDK Utilities

Reusable SDK helpers and utilities organized by language.

## Languages

| Language | Path | Description |
|----------|------|-------------|
| [Node.js](nodejs/) | TypeScript helpers for Copilot SDK agent development |
| [Python](python/) | Python helpers and wrappers |
| [Go](go/) | Go helpers and wrappers |
| [.NET](dotnet/) | .NET helpers and wrappers |

## Node.js Utilities

The Node.js SDK utilities provide:
- `createAgent()` — factory function for creating Copilot SDK agents
- `withMcpServers()` — configure MCP servers declaratively
- `withTools()` — register tools with type-safe handlers
- `runInteractive()` — standard readline-based interactive loop

## Usage

```typescript
import { createAgent, runInteractive } from "../../sdk/nodejs/src/agent-factory";

const agent = await createAgent({
  name: "my-agent",
  model: "gpt-4o",
  systemPrompt: "You are a helpful assistant.",
  tools: [myTool],
  mcpServers: {
    github: { type: "http", url: "https://api.githubcopilot.com/mcp/" },
  },
});

await runInteractive(agent);
```
