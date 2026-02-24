# SDK Helpers — Node.js

Reusable TypeScript utilities for building Copilot SDK agents.

## Usage

```typescript
import { createAgent, runInteractive } from "./src/agent-factory";

const agent = await createAgent({
  name: "My Agent",
  systemPrompt: "You are a helpful assistant.",
  tools: [],
});

await runInteractive(agent);
```
