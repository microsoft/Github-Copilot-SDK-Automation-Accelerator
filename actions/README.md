# GitHub Actions Workflows

Reusable GitHub Actions workflows for running Copilot SDK agents in CI/CD pipelines.

## Available Workflows

| Workflow | Description |
|----------|-------------|
| [copilot-sdk-action.yml](copilot-sdk-action.yml) | General-purpose reusable workflow for any use case |
| [aks-monitor.yml](aks-monitor.yml) | AKS cluster monitoring workflow |

## Quick Start

### Run AKS Monitor Agent

```yaml
# .github/workflows/aks-monitor.yml
name: AKS Monitoring
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  monitor:
    uses: ./.github/workflows/copilot-sdk-action.yml
    with:
      usecase: monitoring
      language: nodejs
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Run Any Use Case

```yaml
name: Custom Agent
on: [workflow_dispatch]

jobs:
  run:
    uses: ./.github/workflows/copilot-sdk-action.yml
    with:
      usecase: code-review
      language: nodejs
      prompt: "Review the latest changes for security issues"
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Required Permissions

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
```

## Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub token for Copilot SDK authentication |
| `AZURE_TENANT_ID` | For Azure agents | Azure Active Directory tenant ID |
| `AZURE_SUBSCRIPTION_ID` | For Azure agents | Azure subscription ID |
| `AZURE_CLIENT_ID` | For Azure agents | Azure service principal client ID |
| `AZURE_CLIENT_SECRET` | For Azure agents | Azure service principal secret |

## Related

- [Main README](../README.md) — Project overview
- [Automation Scripts](../automation/README.md) — Local runner scripts
- [Use Cases](../usecases/README.md) — Available use cases
