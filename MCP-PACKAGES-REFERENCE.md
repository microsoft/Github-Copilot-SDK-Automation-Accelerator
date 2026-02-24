# MCP Server Configuration Reference

This document provides details about the MCP (Model Context Protocol) servers used in the AKS Monitor Agent.

## Overview

The agent uses a **hybrid approach** for MCP servers:
- **GitHub**: HTTP-based (GitHub-hosted service)
- **Azure & AKS**: stdio-based npm packages (auto-installed via `npx`)

This combination provides the best of both worlds: reliable GitHub integration and flexible local Azure/AKS tools.

## Configured Servers

### 1. GitHub MCP Server (HTTP-based)

**Type**: HTTP
**URL**: `https://api.githubcopilot.com/mcp/`

**Purpose**: Provides access to GitHub APIs for:
- Creating issues
- Managing repositories
- Working with pull requests
- Accessing GitHub data

**Configuration**:
```typescript
github: {
    type: "http",
    url: "https://api.githubcopilot.com/mcp/",
}
```

**Authentication**: Handled automatically through GitHub Copilot session

**Advantages**:
- ✅ No local installation required
- ✅ Managed and maintained by GitHub
- ✅ Always up-to-date
- ✅ High availability

---

### 2. Azure MCP Server (npm package)

**Package**: `@microsoft/mcp-server-azure`
**Type**: stdio

---

### 2. Azure MCP Server (npm package)

**Package**: `@microsoft/mcp-server-azure`
**Type**: stdio

**Purpose**: Provides access to Azure Resource Manager APIs for:
- Authentication with Azure
- Managing Azure resources
- Querying subscriptions and resource groups
- Azure CLI operations

**Configuration**:
```typescript
azure: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@microsoft/mcp-server-azure"],
}
```

**Environment Variables** (Optional):
- `AZURE_TENANT_ID`: Azure tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID
- `AZURE_CLIENT_ID`: Service principal client ID
- `AZURE_CLIENT_SECRET`: Service principal secret

**Note**: Authentication can also be interactive through the agent.

---

### 3. AKS MCP Server

**Package**: `@azure/mcp-server-aks`

**Purpose**: Provides AKS-specific operations for:
- Cluster status and health monitoring
- Node management
- Pod diagnostics
- Service monitoring
- Resource utilization tracking

**Configuration**:
```typescript
aks: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@azure/mcp-server-aks"],
}
```

**Environment Variables** (Optional):
- `AKS_CLUSTER_NAME`: Target AKS cluster name
- `AKS_RESOURCE_GROUP`: Resource group containing the cluster

**Note**: Cluster details can be provided interactively through the agent.

---

## How It Works

### stdio vs HTTP

**stdio (Standard Input/Output)**:
**stdio (Azure & AKS)**:
- ✅ No separate server process needed
- ✅ Automatic package installation via `npx`
- ✅ Simpler configuration
- ✅ Better for local development
- ✅ More secure (no network exposure)

**Why This Combination?**
- GitHub MCP via HTTP is production-ready and maintained by GitHub
- Azure & AKS via stdio packages provide flexibility and local control
- Best balance of convenience and functionality

### npx Usage

The `-y` flag in the args array automatically answers "yes" to installation prompts:

```typescript
args: ["-y", "@package-name"]
```Hybrid Architecture

**HTTP (GitHub)**:
- ✅ Hosted by GitHub - no local process needed
- ✅ Centrally managed and updated
- ✅ High availability and reliability
- ✅ Seamless authentication

**stdGitHub MCP** → Connects to hosted HTTP endpoint
3. **Azure/AKS MCP** → Spawns local processes via `npx`
4. **Communication** → HTTP for GitHub, stdin/stdout for Azure/AKS
5. **Tool calls** → MCP servers execute operations
6. **Agent stops** → Local MCP processes terminated, HTTP connection closed

## Installation

### GitHub MCP Server
**No installation required!** It's hosted by GitHub.

### Azure & AKS MCP Servers
**Auto-installed via npx**ations, etc.)
5. **Agent stops** → MCP server processes are terminated

## Installation

**No manual installation required!** The MCP servers are automatically installed when the agent starts.
icrosoft/mcp-server-azure
npm install -g @azure/mcp-server-aks
```

## Troubleshooting
# Azure/AKS Package Issues

**Package Not Found**:
**Package Not Found**:

**Connection Errors**:
- Check your internet connection
- Verify GitHub Copilot subscription is active
- Check if `https://api.githubcopilot.com` is accessible

**Authentication icrosoft/mcp-server-azure
npm install -g @azure/mcp-server-aks
```

**Authentication Issues
# Clear npx cache
npx clear-npx-cache

# Or manually install
npm install -g @modelcontextprotocol/server-github
npm install -g @microsoft/mcp-server-azure
npm install -g @azure/mcp-server-aks
```

### Authentication Issues

**GitHub**:
- Ensure `GITHUB_TOKEN` is set in `.env`
- Verify token has `repo` scope
- Check token hasn't expired

**Azure**:
**Permission Errors**:

```bash
# If npx fails due to permissions
sudo npm install -g @microsoft/mcp-server-azure
sudo npm install -g @azure/mcp-server-aks
```

## Alternative Configurations
# Using stdio for GitHub

If you prefer stdio for GitHub (not recommended):

```typescript
github: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    },
}
```

**Note**: The HTTP endpoint is preferred as it's officially hosted and maintained by GitHub. },
}
```

Then run the MCP servers separately:

```bash
npx @microsoft/mcp-server-azure --port 3001
npx @azure/mcp-server-aks --port 3002
```

### Using stdio for GitHub

If you prefer stdio for GitHub (not recommended):
Then run the MCP server separately:

```bash
npx @modelcontextprotocol/server-github --port 3000
```

## Package Updates

To ensure you're using the latest versions:

```bash
# Update all global packages
npm update -g

# Or use npx with latest
npx @latest @modelcontextprotocol/server-github
npx @HTTP Connections**: GitHub MCP uses HTTPS for secure communication
2. **Environment Variables**: Never commit `.env` files with tokens/secrets
3. **Azure Auth**: Prefer managed identities in production
4. **npx Security**: Always review packages before running via npx
5. **urity Considerations

1. **Environment Variables**: Never commit `.env` files with tokens/secrets
2. **Token Scopes**: Use minimal required scopes for GitHub tokens
3. **Azure Auth**: Prefer managed identities in production
4. **npx Security**: Always review packages before running via npx
5. ** Least Privilege**: Use service principals with minimal permissions

## Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Azure SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
