# GitLab CI Integration

Reusable GitLab CI/CD pipeline templates for running Copilot SDK agents.

## Available Templates

| Template | Description |
|----------|-------------|
| [copilot-sdk-gitlab.yml](copilot-sdk-gitlab.yml) | General-purpose reusable template for any use case |
| [aks-monitor.yml](aks-monitor.yml) | AKS cluster monitoring pipeline |

## Quick Start

### Run AKS Monitor Agent

```yaml
# .gitlab-ci.yml
include:
  - local: 'gitlab-ci/aks-monitor.yml'
```

### Run Any Use Case

```yaml
# .gitlab-ci.yml
include:
  - local: 'gitlab-ci/copilot-sdk-gitlab.yml'

run-code-review:
  extends: .copilot-sdk-agent
  variables:
    USECASE: code-review
    LANGUAGE: nodejs
```

## Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub token (store as CI/CD variable) |
| `AZURE_TENANT_ID` | For Azure agents | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | For Azure agents | Azure subscription ID |

## Related

- [GitHub Actions](../actions/README.md)
- [Azure Pipelines](../azure-pipelines/README.md)
- [Use Cases](../usecases/README.md)
