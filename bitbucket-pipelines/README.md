# Bitbucket Pipelines Integration

Reusable Bitbucket Pipelines templates for running Copilot SDK agents.

## Available Templates

| Template | Description |
|----------|-------------|
| [copilot-sdk-bitbucket.yml](copilot-sdk-bitbucket.yml) | General-purpose pipeline template |
| [aks-monitor.yml](aks-monitor.yml) | AKS cluster monitoring pipeline |

## Quick Start

### Run AKS Monitor Agent

Copy the pipeline definition to your `bitbucket-pipelines.yml`:

```yaml
# bitbucket-pipelines.yml
image: node:20

pipelines:
  custom:
    aks-monitor:
      - step:
          name: Run AKS Monitor Agent
          caches:
            - node
          script:
            - cd usecases/monitoring/nodejs
            - npm ci
            - npx tsx aks-monitor-agent.ts
```

## Repository Variables

Set these in **Repository Settings > Pipelines > Repository Variables**:

| Variable | Required | Secured | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | Yes | GitHub token for Copilot SDK |
| `AZURE_TENANT_ID` | For Azure agents | No | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | For Azure agents | No | Azure subscription ID |

## Related

- [GitHub Actions](../actions/README.md)
- [Azure Pipelines](../azure-pipelines/README.md)
- [Use Cases](../usecases/README.md)
