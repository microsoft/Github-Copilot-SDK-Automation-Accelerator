# Contributing to GitHub Copilot SDK Accelerator

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test your changes
5. Submit a pull request

## Project Structure

```
.
├── automation/           # Runner scripts and configuration
├── actions/              # GitHub Actions workflows
├── azure-pipelines/      # Azure DevOps templates
├── gitlab-ci/            # GitLab CI templates
├── bitbucket-pipelines/  # Bitbucket templates
├── circleci/             # CircleCI templates
├── sdk/                  # SDK helpers (per language)
├── usecases/             # Use-case agents (per language)
├── examples/             # Getting started examples
└── docs/                 # Documentation
```

## Adding a New Use Case

1. Create a folder under `usecases/<your-usecase>/`
2. Add language-specific subfolders (`nodejs/`, `python/`, `go/`, `dotnet/`)
3. Include a `README.md` in each folder
4. Add CI/CD pipeline templates for the use case
5. Update the root `README.md` use case table
6. Update `INDEX.md`

### Use Case Folder Structure

```
usecases/<your-usecase>/
├── README.md
├── nodejs/
│   ├── package.json
│   ├── tsconfig.json
│   ├── <agent-name>.ts
│   └── README.md
├── python/
│   ├── requirements.txt
│   ├── <agent_name>.py
│   └── README.md
├── go/
│   ├── go.mod
│   ├── main.go
│   └── README.md
└── dotnet/
    ├── <AgentName>.csproj
    ├── Program.cs
    └── README.md
```

## Adding a New Language

1. Create the language folder under `sdk/<language>/`
2. Add starter templates for each existing use case
3. Update the CLI runner script to support the new language
4. Add CI/CD pipeline support
5. Update documentation

## Security Best Practices

- **Never commit tokens** to version control
- **Use environment variables** for sensitive configuration
- **Use GitHub Secrets** for CI/CD workflows
- **Validate inputs** at system boundaries
- **Follow least-privilege** for tool permissions

## Code Style

- **Node.js**: TypeScript with strict mode
- **Python**: PEP 8 with type hints
- **Go**: Standard Go formatting (`gofmt`)
- **.NET**: C# coding conventions
