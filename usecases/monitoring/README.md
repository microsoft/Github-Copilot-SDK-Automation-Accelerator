# Monitoring Use Case

AKS (Azure Kubernetes Service) cluster health monitoring agent that:

1. Authenticates with Azure (tenant ID, subscription ID)
2. Connects to an AKS cluster
3. Runs diagnostics (node health, pod health, services, resource utilization)
4. Creates GitHub issues for any problems found

## Implementations

| Language | Path | Status |
|----------|------|--------|
| **Node.js** | [nodejs/](nodejs/) | ✅ Complete |
| **Python** | [python/](python/) | 🔧 Starter template |
| **Go** | [go/](go/) | 🔧 Starter template |
| **.NET** | [dotnet/](dotnet/) | 🔧 Starter template |

## Quick Start

```bash
# Node.js (primary implementation)
cd nodejs && npm install && npx tsx aks-monitor-agent.ts

# Or via CLI runner from repo root
./automation/copilot-sdk-runner.sh --usecase monitoring --lang nodejs
```

## MCP Servers Used

| Server | Type | Purpose |
|--------|------|---------|
| GitHub | HTTP | Issue creation via GitHub API |
| Azure | stdio | Azure authentication & resource management |
| AKS | stdio | AKS cluster diagnostics |

## Architecture

```
User Input → Copilot SDK Agent → GPT-4o
                                    ↓
                              Tool Calls
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
              Custom Tools    Azure MCP      AKS MCP
              (diagnose,      (auth,         (cluster
               prepare         resources)     operations)
               issue)
                    │              │              │
                    └──────────────┼──────────────┘
                                   ↓
                             GitHub MCP
                            (create issues)
```
