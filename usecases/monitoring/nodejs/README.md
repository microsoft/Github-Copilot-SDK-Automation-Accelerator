# AKS Monitor Agent — Node.js

AKS cluster health monitoring agent built with the GitHub Copilot SDK.

## Quick Start

```bash
npm install
npx tsx aks-monitor-agent.ts
```

## What It Does

1. **Authenticates** with Azure (collects tenant ID and subscription ID)
2. **Connects** to your AKS cluster (cluster name, resource group)
3. **Diagnoses** cluster health (nodes, pods, services, resources)
4. **Creates GitHub issues** for any problems found

## Tools

| Tool | Description |
|------|-------------|
| `capture_azure_auth` | Store Azure tenant/subscription credentials |
| `capture_aks_cluster` | Store AKS cluster name and resource group |
| `get_auth_state` | Check current authentication state |
| `diagnose_aks_cluster` | Run cluster diagnostics (simulated) |
| `prepare_github_issue` | Format diagnostic findings as GitHub issues |

## MCP Servers

| Server | Type | Package |
|--------|------|---------|
| GitHub | HTTP | `https://api.githubcopilot.com/mcp/` |
| Azure | stdio | `@microsoft/mcp-server-azure` |
| AKS | stdio | `@azure/mcp-server-aks` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub authentication token |
| `AZURE_TENANT_ID` | Optional | Pre-set Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Optional | Pre-set Azure subscription ID |

## Configuration

The agent uses `gpt-4o` model with streaming enabled. Modify the `model` parameter in `aks-monitor-agent.ts` to change the model.
