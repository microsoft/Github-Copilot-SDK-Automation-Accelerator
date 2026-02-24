# Creating Custom Agents

Build your own Copilot SDK agents and add them to the accelerator framework.

## Quick Start

```bash
# 1. Create a new use case directory
mkdir -p usecases/my-usecase/nodejs

# 2. Initialize with package.json
cd usecases/my-usecase/nodejs
npm init -y
npm install @github/copilot-sdk tsx

# 3. Create your agent
cat > my-agent.ts << 'EOF'
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import * as readline from "readline";

// Define your custom tools
const myTool = defineTool("my_tool", {
    description: "Description of what this tool does",
    parameters: {
        type: "object",
        properties: {
            input: { type: "string", description: "Tool input" },
        },
        required: ["input"],
    },
    handler: async ({ input }) => {
        return { result: `Processed: ${input}` };
    },
});

// Create the agent
const client = new CopilotClient();
const session = await client.createSession({
    model: "gpt-4o",
    streaming: true,
    tools: [myTool],
    systemPrompt: "You are a helpful agent. Use the my_tool tool when needed.",
});

// Set up streaming
session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
});

// Interactive loop
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = () => {
    rl.question("You: ", async (input) => {
        if (input === "exit") { await client.stop(); rl.close(); return; }
        process.stdout.write("\nAssistant: ");
        await session.sendAndWait({ prompt: input });
        console.log("\n");
        prompt();
    });
};
prompt();
EOF

# 4. Run it
npx tsx my-agent.ts
```

## Agent Structure

Each agent should follow this pattern:

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";

// 1. Define tools (defineTool)
// 2. Create CopilotClient
// 3. Create session with model, tools, MCP servers, system prompt
// 4. Set up event listeners (message_delta, tool.call, tool.result)
// 5. Run interactive loop or handle input programmatically
```

## Adding MCP Servers

```typescript
const session = await client.createSession({
    // ...
    mcpServers: {
        github: {
            type: "http",
            url: "https://api.githubcopilot.com/mcp/",
        },
        azure: {
            type: "stdio",
            command: "npx",
            args: ["-y", "@microsoft/mcp-server-azure"],
        },
    },
});
```

## Registering Your Agent

1. Add the use case folder under `usecases/<name>/<language>/`
2. Add a `README.md` describing the use case
3. Update `usecases/README.md` with the new entry
4. Add CI/CD pipeline templates (optional)
5. Test with: `./automation/copilot-sdk-runner.sh --usecase <name> --lang <language>`
