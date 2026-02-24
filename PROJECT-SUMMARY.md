# AKS Monitor Agent - Project Summary

## 🎯 Project Overview

An intelligent, interactive AI agent built with the **GitHub Copilot SDK** that monitors Azure Kubernetes Service (AKS) clusters, diagnoses issues, and automatically creates GitHub issues for problems found.

## 📁 Project Structure

```
copilot-sdk-demo/
├── aks-monitor-agent.ts          # Main agent implementation
├── weather-assistant.ts            # Example weather agent
├── index.ts                        # Basic example
├── package.json                    # Project dependencies and scripts
├── AKS-MONITOR-README.md          # Agent documentation
├── SETUP-GUIDE.md                  # Detailed setup instructions
├── USAGE-EXAMPLES.md               # Usage examples and workflows
└── PROJECT-SUMMARY.md              # This file
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the AKS Monitor Agent
npm run aks-monitor

# Run other examples
npm run weather      # Weather assistant
npm start            # Basic example
```

## 🏗️ Architecture

### Components

1. **AKS Monitor Agent** (`aks-monitor-agent.ts`)
   - Interactive conversational AI
   - GitHub Copilot SDK powered
   - GPT-4o model for intelligence
   - Custom tools for Azure/AKS operations

2. **MCP Server Integration** (hybrid approach)
   - **GitHub MCP**: HTTP-based (`https://api.githubcopilot.com/mcp/`) - Issue creation and management
   - **Azure MCP**: npm package (`@microsoft/mcp-server-azure`) - Authentication and resource access
   - **AKS MCP**: npm package (`@azure/mcp-server-aks`) - Cluster diagnostics and monitoring

3. **Custom Tools**
   - `capture_azure_auth`: Collect Azure credentials
   - `capture_aks_cluster`: Store cluster information
   - `get_auth_state`: Check authentication status
   - `diagnose_aks_cluster`: Run cluster diagnostics
   - `prepare_github_issue`: Format issues for GitHub

## 🔧 Features

### Authentication & Connection
- ✅ Interactive Azure tenant and subscription authentication
- ✅ AKS cluster connection with cluster name and resource group
- ✅ State management for credentials and cluster info

### Diagnostics
- ✅ Node health monitoring (Ready/NotReady status)
- ✅ Pod status tracking (Running/Failed/Pending)
- ✅ Service availability checks
- ✅ Resource utilization monitoring (CPU, Memory, Disk)

### Issue Reporting
- ✅ Automatic GitHub issue creation
- ✅ Severity-based categorization (High/Medium/Low)
- ✅ Detailed issue descriptions with context
- ✅ Recommended remediation actions
- ✅ Automatic labeling for organization

### User Experience
- ✅ Conversational interface
- ✅ Step-by-step guidance
- ✅ Real-time feedback with tool execution events
- ✅ Confirmation before creating issues

## 🎯 Use Cases

### 1. Proactive Cluster Monitoring
Monitor AKS clusters regularly and get notified of issues through GitHub issues.

### 2. Incident Management
Automatically document cluster problems with standardized GitHub issues.

### 3. DevOps Automation
Integrate with CI/CD pipelines for automated cluster health checks.

### 4. Multi-Cluster Management
Monitor multiple AKS clusters across different subscriptions.

## 📊 Diagnostic Categories

### Node Health Issues
- **Severity**: High
- **Detection**: Nodes in NotReady state
- **Impact**: Workload availability issues

### Pod Failures
- **Severity**: Medium
- **Detection**: Pods in Failed state
- **Impact**: Application functionality issues

### Pending Pods
- **Severity**: Low
- **Detection**: Pods stuck in Pending state
- **Impact**: Resource constraints or scheduling issues

### Service Health
- **Severity**: High
- **Detection**: Unhealthy services
- **Impact**: Application accessibility issues

### Resource Utilization
- **Severity**: Medium
- **Detection**: High CPU/Memory usage (>80%)
- **Impact**: Performance degradation risk

## 🔐 Security Considerations

1. **Credentials Management**
   - Tenant IDs and subscription IDs stored in memory (session-only)
   - No persistent credential storage
   - Use environment variables for GitHub tokens

2. **Access Control**
   - Requires appropriate Azure RBAC permissions
   - GitHub token needs write access for issue creation
   - Least privilege principle recommended

3. **Data Privacy**
   - Diagnostic data includes cluster metadata
   - No sensitive workload data collected
   - Review issue templates before creation

## 🛠️ Customization

### Adding Custom Diagnostics
Edit [aks-monitor-agent.ts](aks-monitor-agent.ts#L103-L197) to add new diagnostic checks: