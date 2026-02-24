# Copilot SDK Automation Scripts

Local automation scripts for running Copilot SDK agents.

## Script Files

| File | Description |
|------|-------------|
| [copilot-sdk-runner.sh](copilot-sdk-runner.sh) | Bash runner for Linux/macOS |
| [copilot-sdk.properties](copilot-sdk.properties) | Default configuration |
| [examples/](examples/) | Example configurations |

## Quick Start

```bash
# List available use cases
./copilot-sdk-runner.sh --list

# Run a specific use case
./copilot-sdk-runner.sh --usecase monitoring --lang nodejs

# Run system diagnostics
./copilot-sdk-runner.sh --diagnose

# Initialize configuration
./copilot-sdk-runner.sh --init
```

## Configuration

### Properties File

```properties
# copilot-sdk.properties
copilot.model=gpt-4o
default.language=nodejs
github.token=
timeout.minutes=30
log.level=info
```

### Command-Line Arguments

| Argument | Description |
|----------|-------------|
| `--usecase <name>` | Use case to run (monitoring, code-review, security-analysis) |
| `--lang <language>` | Language runtime (nodejs, python, go, dotnet) |
| `--list` | List available use cases |
| `--diagnose` | Run system diagnostics |
| `--init` | Initialize default configuration |
| `--config <file>` | Use custom configuration file |
| `--help` | Show help message |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub authentication token |
| `COPILOT_MODEL` | Override default model |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
