# GitHub Copilot SDK Automation Accelerator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive framework for building, running, and automating AI agents using the **GitHub Copilot SDK** across CI/CD pipelines and local development environments. Supports multiple languages (Node.js, Python, Go, .NET) and all major CI/CD platforms.

> **Looking for the CLI Accelerator?** See [copilot-cli-automation-accelerator](https://github.com/neildcruz/copilot-cli-automation-accelerator)

---

## 🚀 30-Second Quick Start

**Choose your path:**
- **☁️ CI/CD Integration** → [Jump to CI/CD setup](#️-cicd-integration)
- **💻 Local Development** → Continue reading below
- **📦 Use Cases** → [Browse use cases](#-use-cases)

### Local Development Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/copilot-sdk-accelerator.git
cd copilot-sdk-accelerator

# Run the AKS Monitor agent (Node.js)
cd usecases/monitoring/nodejs
npm install
npx tsx aks-monitor-agent.ts

# Or use the CLI runner from the root
./automation/copilot-sdk-runner.sh --usecase monitoring --lang nodejs
```

**Prerequisites:** Node.js 20+, GitHub authentication (`gh auth login` or `GITHUB_TOKEN` env var)

---

## 📋 What Can I Do?

| Goal | Command |
|------|---------|
| **AKS Monitoring** | `./automation/copilot-sdk-runner.sh --usecase monitoring --lang nodejs` |
| **Code Review Agent** | `./automation/copilot-sdk-runner.sh --usecase code-review --lang nodejs` |
| **Security Analysis** | `./automation/copilot-sdk-runner.sh --usecase security-analysis --lang python` |
| **List Use Cases** | `./automation/copilot-sdk-runner.sh --list` |
| **Run Any Agent** | `./automation/copilot-sdk-runner.sh --usecase <name> --lang <language>` |
| **Initialize Config** | `./automation/copilot-sdk-runner.sh --init` |
| **System Diagnostics** | `./automation/copilot-sdk-runner.sh --diagnose` |

---

<details>
<summary><strong>📁 Project Structure</strong> (click to expand)</summary>

```
copilot-sdk-accelerator/
├── README.md                          # This file - start here
├── INDEX.md                           # Navigation guide
├── INSTALL.md                         # Installation details
├── CONTRIBUTING.md                    # Contributing guide
├── CHANGELOG.md                       # Version history
├── LICENSE                            # MIT License
│
├── automation/                        # SDK runner scripts & configuration
│   ├── copilot-sdk-runner.sh          # Bash runner (Linux/macOS)
│   ├── copilot-sdk.properties         # Default configuration
│   ├── README.md                      # Automation documentation
│   └── examples/                      # Example agent configurations
│       ├── mcp-config.json
│       └── README.md
│
├── actions/                           # GitHub Actions workflows
│   ├── copilot-sdk-action.yml         # Reusable workflow
│   ├── aks-monitor.yml                # AKS monitoring workflow
│   └── README.md
│
├── azure-pipelines/                   # Azure DevOps Pipelines
│   ├── copilot-sdk-azure.yml          # Reusable template
│   ├── aks-monitor.yml                # AKS monitoring pipeline
│   └── README.md
│
├── gitlab-ci/                         # GitLab CI/CD
│   ├── copilot-sdk-gitlab.yml         # Reusable template
│   ├── aks-monitor.yml                # AKS monitoring job
│   └── README.md
│
├── bitbucket-pipelines/               # Bitbucket Pipelines
│   ├── copilot-sdk-bitbucket.yml      # Reusable template
│   ├── aks-monitor.yml                # AKS monitoring pipeline
│   └── README.md
│
├── circleci/                          # CircleCI
│   ├── copilot-sdk-circleci.yml       # Reusable config
│   ├── aks-monitor.yml                # AKS monitoring job
│   └── README.md
│
├── sdk/                               # SDK helpers & utilities (per language)
│   ├── README.md
│   ├── nodejs/                        # Node.js SDK utilities
│   ├── python/                        # Python SDK utilities
│   ├── go/                            # Go SDK utilities
│   └── dotnet/                        # .NET SDK utilities
│
├── usecases/                          # Use-case specific agents
│   ├── README.md
│   ├── monitoring/                    # Cloud/AKS monitoring
│   │   ├── nodejs/                    # ★ AKS Monitor Agent (primary)
│   │   ├── python/
│   │   ├── go/
│   │   └── dotnet/
│   ├── code-review/                   # AI-powered code review
│   │   ├── nodejs/
│   │   ├── python/
│   │   ├── go/
│   │   └── dotnet/
│   └── security-analysis/             # Security scanning
│       ├── nodejs/
│       ├── python/
│       ├── go/
│       └── dotnet/
│
├── examples/                          # Getting started examples
│   ├── README.md
│   ├── hello-world/
│   └── weather-assistant/
│
└── docs/                              # Additional documentation
    ├── architecture.md
    ├── custom-agents.md
    └── mcp-integration.md
```

</details>

---

## ☁️ CI/CD Integration

<details>
<summary><strong>GitHub Actions</strong></summary>

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

See [actions/README.md](actions/README.md) for full documentation.

</details>

<details>
<summary><strong>Azure DevOps Pipelines</strong></summary>

```yaml
trigger: none
schedules:
  - cron: '0 */6 * * *'
    displayName: 'AKS Monitor Schedule'
stages:
  - template: azure-pipelines/aks-monitor.yml
    parameters:
      language: nodejs
```

See [azure-pipelines/README.md](azure-pipelines/README.md) for full documentation.

</details>

<details>
<summary><strong>GitLab CI</strong></summary>

```yaml
include:
  - local: 'gitlab-ci/aks-monitor.yml'
```

See [gitlab-ci/README.md](gitlab-ci/README.md) for full documentation.

</details>

<details>
<summary><strong>Bitbucket Pipelines</strong></summary>

```yaml
pipelines:
  custom:
    aks-monitor:
      - step:
          name: Run AKS Monitor Agent
          script:
            - ./automation/copilot-sdk-runner.sh --usecase monitoring --lang nodejs
```

See [bitbucket-pipelines/README.md](bitbucket-pipelines/README.md) for full documentation.

</details>

<details>
<summary><strong>CircleCI</strong></summary>

```yaml
version: 2.1
workflows:
  aks-monitor:
    jobs:
      - run-copilot-sdk-agent:
          usecase: monitoring
          language: nodejs
```

See [circleci/README.md](circleci/README.md) for full documentation.

</details>

---

## 📦 Use Cases

| Use Case | Description | Languages |
|----------|-------------|-----------|
| **[Monitoring](usecases/monitoring/)** | AKS cluster health monitoring, diagnostics, auto-issue creation | Node.js, Python, Go, .NET |
| **[Code Review](usecases/code-review/)** | AI-powered code review with Copilot SDK | Node.js, Python, Go, .NET |
| **[Security Analysis](usecases/security-analysis/)** | Automated security vulnerability scanning | Node.js, Python, Go, .NET |

---

## 🔧 Key Features

- **Multi-Language Support** — Node.js, Python, Go, .NET starter templates
- **CI/CD Ready** — GitHub Actions, Azure Pipelines, GitLab CI, Bitbucket, CircleCI
- **MCP Integration** — Azure, AKS, GitHub MCP server support built-in
- **CLI Runner** — Unified runner script for all use cases
- **Modular Architecture** — Each use case is self-contained with its own dependencies
- **Production Patterns** — Auth handling, error management, logging, diagnostics

---

## 📖 Documentation

| Component | Documentation |
|-----------|---------------|
| **Getting Started** | [INSTALL.md](INSTALL.md) |
| **Navigation Guide** | [INDEX.md](INDEX.md) |
| **Architecture** | [docs/architecture.md](docs/architecture.md) |
| **Custom Agents** | [docs/custom-agents.md](docs/custom-agents.md) |
| **MCP Integration** | [docs/mcp-integration.md](docs/mcp-integration.md) |
| **CI/CD Platforms** | [actions/](actions/), [azure-pipelines/](azure-pipelines/), [gitlab-ci/](gitlab-ci/), [bitbucket-pipelines/](bitbucket-pipelines/), [circleci/](circleci/) |
| **SDK Utilities** | [sdk/README.md](sdk/README.md) |
| **Use Cases** | [usecases/README.md](usecases/README.md) |
| **Examples** | [examples/README.md](examples/README.md) |
| **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) |

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE)
