# Use Cases

This directory contains use-case-specific Copilot SDK agents organized by domain and language.

## Available Use Cases

| Use Case | Description | Primary Language |
|----------|-------------|-----------------|
| [monitoring/](monitoring/) | AKS cluster health monitoring, diagnostics, GitHub issue creation | Node.js |
| [code-review/](code-review/) | AI-powered code review with custom analysis | Node.js |
| [security-analysis/](security-analysis/) | Automated security vulnerability scanning | Node.js |

## Structure

Each use case follows the same multi-language structure:

```
<usecase>/
├── README.md         # Use case overview
├── nodejs/           # Node.js implementation
│   ├── package.json
│   ├── tsconfig.json
│   ├── <agent>.ts
│   └── README.md
├── python/           # Python implementation
│   ├── requirements.txt
│   ├── <agent>.py
│   └── README.md
├── go/               # Go implementation
│   ├── go.mod
│   ├── main.go
│   └── README.md
└── dotnet/           # .NET implementation
    ├── <Agent>.csproj
    ├── Program.cs
    └── README.md
```

## Running a Use Case

### Via CLI Runner

```bash
# From the repo root
./automation/copilot-sdk-runner.sh --usecase monitoring --lang nodejs
./automation/copilot-sdk-runner.sh --usecase code-review --lang python
```

### Directly

```bash
# Node.js
cd usecases/monitoring/nodejs && npm install && npx tsx aks-monitor-agent.ts

# Python
cd usecases/monitoring/python && pip install -r requirements.txt && python aks_monitor_agent.py

# Go
cd usecases/monitoring/go && go run .

# .NET
cd usecases/monitoring/dotnet && dotnet run
```

## Adding a New Use Case

1. Create a new folder: `usecases/<your-usecase>/`
2. Add `README.md` describing the use case
3. Add at least one language implementation
4. Update the runner script in `automation/copilot-sdk-runner.sh`
5. Add CI/CD pipeline templates
6. Update this README
