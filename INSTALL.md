# GitHub Copilot SDK Accelerator - Installation

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |
| GitHub CLI | 2.0+ | `gh --version` |
| Git | 2.30+ | `git --version` |

### Language-Specific Prerequisites

| Language | Requirement | Check |
|----------|-------------|-------|
| **Node.js** | Node.js 20+, npm 9+ | `node -v && npm -v` |
| **Python** | Python 3.10+ | `python3 --version` |
| **Go** | Go 1.21+ | `go version` |
| **.NET** | .NET 8.0+ | `dotnet --version` |

### Authentication

GitHub Copilot SDK requires authentication. Use one of these methods (in order of precedence):

1. `GITHUB_TOKEN` environment variable
2. `GH_TOKEN` environment variable
3. GitHub CLI authentication (`gh auth login`)

```bash
# Option 1: Environment variable
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# Option 2: GitHub CLI
gh auth login
```

---

## Installation

### Quick Install (Bash)

```bash
git clone https://github.com/your-org/copilot-sdk-accelerator.git
cd copilot-sdk-accelerator
chmod +x automation/copilot-sdk-runner.sh
```

### Run a Use Case

```bash
# Install dependencies for a specific usecase
cd usecases/monitoring/nodejs
npm install

# Run the agent
npx tsx aks-monitor-agent.ts

# Or use the runner script from the repo root
cd ../../..
./automation/copilot-sdk-runner.sh --usecase monitoring --lang nodejs
```

### Verify Installation

```bash
# Run system diagnostics
./automation/copilot-sdk-runner.sh --diagnose
```

---

## Per-Language Setup

### Node.js

```bash
cd usecases/monitoring/nodejs
npm install
npx tsx aks-monitor-agent.ts
```

### Python

```bash
cd usecases/monitoring/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python aks_monitor_agent.py
```

### Go

```bash
cd usecases/monitoring/go
go mod tidy
go run main.go
```

### .NET

```bash
cd usecases/monitoring/dotnet
dotnet restore
dotnet run
```

---

## Troubleshooting

### Node.js Version Issues

```bash
# Check Node.js version
node --version
# Should be 20.x or higher

# Use nvm to install correct version
nvm install 20
nvm use 20
```

### Authentication Issues

```bash
# Verify GitHub authentication
gh auth status

# Re-authenticate if needed
gh auth login --scopes "repo,read:org"

# Verify token
echo $GITHUB_TOKEN | head -c 10
```

### MCP Server Issues

```bash
# Verify npx is available
npx --version

# Test MCP server availability
npx -y @azure/mcp-server-aks --help 2>/dev/null && echo "AKS MCP available" || echo "AKS MCP not found"
```

---

## Support

- 📖 **Documentation**: Check the main [README.md](README.md)
- 🐛 **Issues**: Report problems in the GitHub repository
- 🔧 **Diagnostics**: Run `./automation/copilot-sdk-runner.sh --diagnose`
