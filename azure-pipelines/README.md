# Azure DevOps Pipelines Integration

Reusable Azure DevOps pipeline templates for running Copilot SDK agents.

## Available Templates

| Template | Description |
|----------|-------------|
| [copilot-sdk-azure.yml](copilot-sdk-azure.yml) | General-purpose reusable template for any use case |
| [aks-monitor.yml](aks-monitor.yml) | AKS cluster monitoring pipeline |

## Quick Start

### Run AKS Monitor Agent

```yaml
# azure-pipelines.yml
trigger: none

schedules:
  - cron: '0 */6 * * *'
    displayName: 'AKS Monitor Schedule'
    branches:
      include:
        - main

stages:
  - template: azure-pipelines/aks-monitor.yml
    parameters:
      language: nodejs
```

### Run Any Use Case

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

stages:
  - template: azure-pipelines/copilot-sdk-azure.yml
    parameters:
      usecase: code-review
      language: nodejs
```

## Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub token (store as secret variable) |
| `AZURE_TENANT_ID` | For Azure agents | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | For Azure agents | Azure subscription ID |

## Related

- [GitHub Actions](../actions/README.md)
- [Use Cases](../usecases/README.md)
- [Main README](../README.md)
