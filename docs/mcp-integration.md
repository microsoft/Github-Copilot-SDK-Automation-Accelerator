# MCP Integration

Guide for integrating Model Context Protocol (MCP) servers with Copilot SDK agents.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol for connecting AI models to external tools and data sources. The Copilot SDK supports MCP servers via two transport types:

| Transport | Description | Example |
|-----------|-------------|---------|
| **HTTP** | Remote MCP server accessed via HTTP | GitHub MCP at `api.githubcopilot.com/mcp/` |
| **stdio** | Local MCP server spawned as a child process | Azure MCP via `npx @microsoft/mcp-server-azure` |

## Configuring MCP Servers

### In Agent Code

```typescript
const session = await client.createSession({
    mcpServers: {
        // HTTP-based MCP server
        github: {
            type: "http",
            url: "https://api.githubcopilot.com/mcp/",
        },
        // stdio-based MCP server (spawned via npx)
        azure: {
            type: "stdio",
            command: "npx",
            args: ["-y", "@microsoft/mcp-server-azure"],
        },
        // Another stdio server
        aks: {
            type: "stdio",
            command: "npx",
            args: ["-y", "@azure/mcp-server-aks"],
        },
    },
});
```

### Via Configuration File

See [automation/examples/mcp-config.json](../automation/examples/mcp-config.json) for a reusable MCP configuration.

## Available MCP Servers

### GitHub MCP Server
- **Type**: HTTP
- **URL**: `https://api.githubcopilot.com/mcp/`
- **Capabilities**: Issue creation, PR management, repository operations
- **Auth**: Uses Copilot session authentication automatically

### Azure MCP Server
- **Type**: stdio
- **Package**: `@microsoft/mcp-server-azure`
- **Capabilities**: Azure resource management, authentication
- **Auth**: Azure CLI or service principal

### AKS MCP Server
- **Type**: stdio
- **Package**: `@azure/mcp-server-aks`
- **Capabilities**: AKS cluster diagnostics, node/pod management
- **Auth**: Azure CLI or service principal

## Creating Custom MCP Servers

You can create your own MCP servers and integrate them with agents. An MCP server exposes tools via the MCP protocol that the LLM can call during conversations.

See the [MCP specification](https://modelcontextprotocol.io/) for details on building custom servers.
