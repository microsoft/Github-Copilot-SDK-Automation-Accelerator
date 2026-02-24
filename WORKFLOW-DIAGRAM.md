```mermaid
sequenceDiagram
    actor User
    participant Agent as AKS Monitor Agent
    participant Azure as Azure MCP Server
    participant AKS as AKS MCP Server
    participant GitHub as GitHub MCP Server
    participant Cluster as AKS Cluster

    User->>Agent: Start agent
    Agent->>User: Welcome! Please provide Azure credentials
    
    rect rgb(200, 220, 255)
    Note over User,Azure: Authentication Phase
    User->>Agent: Tenant ID & Subscription ID
    Agent->>Agent: capture_azure_auth()
    Agent->>Azure: Authenticate
    Azure-->>Agent: Auth successful
    Agent->>User: ✅ Authenticated with Azure
    end

    rect rgb(200, 255, 220)
    Note over User,AKS: Connection Phase
    User->>Agent: Cluster name & Resource group
    Agent->>Agent: capture_aks_cluster()
    Agent->>Azure: Get cluster credentials
    Azure-->>Agent: Credentials
    Agent->>User: ✅ Connected to cluster
    end

    rect rgb(255, 220, 220)
    Note over Agent,Cluster: Diagnostics Phase
    User->>Agent: Run diagnostics
    Agent->>Agent: diagnose_aks_cluster()
    Agent->>AKS: Query cluster status
    AKS->>Cluster: Get nodes, pods, services
    Cluster-->>AKS: Status data
    AKS-->>Agent: Diagnostic results
    
    alt Issues found
        Agent->>Agent: Identify issues
        Agent->>User: 🔴 Found 4 issues!
        Agent->>User: Display issues summary
    else No issues
        Agent->>User: ✅ Cluster healthy
    end
    end

    rect rgb(255, 240, 200)
    Note over Agent,GitHub: Issue Creation Phase
    User->>Agent: Create GitHub issues
    loop For each issue
        Agent->>Agent: prepare_github_issue()
        Agent->>GitHub: Create issue
        GitHub-->>Agent: Issue created (#123)
        Agent->>User: ✅ Created issue #123
    end
    end

    Agent->>User: All done! Issues created.
```

## Workflow Steps

### 1. Authentication
- User provides Azure tenant ID and subscription ID
- Agent stores credentials using `capture_azure_auth` tool
- Azure MCP server validates credentials

### 2. Cluster Connection
- User provides AKS cluster name and resource group
- Agent stores cluster info using `capture_aks_cluster` tool
- Connection to AKS cluster established via Azure MCP

### 3. Diagnostics
- Agent runs `diagnose_aks_cluster` tool
- Checks performed:
  - Node health (Ready/NotReady)
  - Pod status (Running/Failed/Pending)
  - Service health
  - Resource utilization (CPU/Memory/Disk)
- Issues identified and categorized by severity

### 4. Issue Reporting
- For each issue found:
  - Agent prepares formatted issue using `prepare_github_issue` tool
  - Creates GitHub issue via GitHub MCP server
  - Applies appropriate labels (severity, category)
  - Includes recommended actions

### 5. Completion
- User receives summary of all issues created
- GitHub repository now has tracking issues for all problems
- DevOps team can begin remediation