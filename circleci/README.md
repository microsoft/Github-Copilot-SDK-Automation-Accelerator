# CircleCI Integration

Reusable CircleCI configuration templates for running Copilot SDK agents.

## Available Templates

| Template | Description |
|----------|-------------|
| [copilot-sdk-circleci.yml](copilot-sdk-circleci.yml) | General-purpose reusable config |
| [aks-monitor.yml](aks-monitor.yml) | AKS cluster monitoring job |

## Quick Start

### Run AKS Monitor Agent

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.2

jobs:
  aks-monitor:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: cd usecases/monitoring/nodejs && npm ci
      - run:
          name: Run AKS Monitor Agent
          command: cd usecases/monitoring/nodejs && npx tsx aks-monitor-agent.ts

workflows:
  monitoring:
    jobs:
      - aks-monitor
```

## Environment Variables

Set in **Project Settings > Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub token for Copilot SDK |
| `AZURE_TENANT_ID` | For Azure agents | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | For Azure agents | Azure subscription ID |

## Related

- [GitHub Actions](../actions/README.md)
- [Azure Pipelines](../azure-pipelines/README.md)
- [Use Cases](../usecases/README.md)
