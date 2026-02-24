# AKS Monitor Agent - Complete Setup Guide

This guide will help you set up and run the AKS Monitor Agent that uses GitHub Copilot SDK with MCP servers.

## Overview

The AKS Monitor Agent is an interactive AI agent that:
- Authenticates with your Azure tenant and subscription
- Connects to your AKS (Azure Kubernetes Service) cluster
- Runs comprehensive diagnostics
- Creates GitHub issues for any problems found

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 AKS Monitor Agent                        │
│              (GitHub Copilot SDK + GPT-4)               │
└───────────┬─────────────┬───────────────┬──────────────┘
            │             │               │
            │             │               │
    ┌───────▼──────┐ ┌───▼────────┐ ┌────▼─────────┐
    │   GitHub     │ │   Azure    │ │     AKS      │
    │ MCP Server   │ │ MCP Server │ │  MCP Server  │
    └───────┬──────┘ └───┬────────┘ └────┬─────────┘
            │             │               │
            │             │               │
    ┌───────▼──────┐ ┌───▼────────┐ ┌────▼─────────┐
    │   GitHub     │ │   Azure    │ │     AKS      │
    │   Issues     │ │   Portal   │ │   Cluster    │
    └──────────────┘ └────────────┘ └──────────────┘
```

## Prerequisites

1. **Node.js Environment**
   - Node.js 18 or higher
   - npm or yarn package manager

2. **GitHub Copilot**
   - Active GitHub Copilot subscription
   - GitHub account with access token (personal access token)

3. **Azure Resources**
   - Azure subscription
   - AKS cluster already deployed
   - Azure tenant ID
   - Subscription ID
   - Cluster name and resource group

4. **GitHub Repository**
   - Repository where issues will be created
   - Write access to the repository

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /Users/somnathbanerjee/work-solution-engineer-July2025/git-clones/copilot-sdk-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify installation**
   ```bash
   npx tsx --version
   ```

## Configuration

### 1. MCP Server Setup

The agent uses three MCP (Model Context Protocol) servers:

#### GitHub MCP Server
- **Type**: HTTP-based
- **URL**: `https://api.githubcopilot.com/mcp/`
- **Status**: ✅ GitHub-hosted service
- **Purpose**: Create and manage GitHub issues
- **Authentication**: Via GitHub Copilot session

#### Azure MCP Server
- **Type**: stdio (npm package)
- **Package**: `@microsoft/mcp-server-azure`
- **Status**: ✅ Auto-installed via npx
- **Purpose**: Azure authentication and resource management

#### AKS MCP Server
- **Type**: stdio (npm package)
- **Package**: `@azure/mcp-server-aks`
- **Status**: ✅ Auto-installed via npx
- **Purpose**: AKS cluster diagnostics and monitoring

**No manual installation required!** Azure and AKS MCP servers are automatically installed and run via `npx` when the agent starts.

### 2. GitHub Authentication

Set up GitHub authentication for creating issues:

```bash
export GITHUB_TOKEN="your_github_personal_access_token"
```

Or configure in your environment variables.

### 3. Azure Credentials

You'll need to have ready:
- **Tenant ID**: Found in Azure Portal > Azure Active Directory > Overview
- **Subscription ID**: Found in Azure Portal > Subscriptions
- **Cluster Name**: Your AKS cluster name
- **Resource Group**: The resource group containing your AKS cluster

## Running the Agent

### Method 1: Using npm script (Recommended)

```bash
npm run aks-monitor
```

### Method 2: Direct execution

```bash
npx tsx aks-monitor-agent.ts
```

### Method 3: With tsx globally installed

```bash
tsx aks-monitor-agent.ts
```

## Usage Workflow

### Step 1: Start the Agent

```bash
npm run aks-monitor
```

You should see:
```
🔧 AKS Monitor Agent starting...
🚀 AKS Monitor Agent Ready!
============================================================

This agent will help you:
  • Authenticate with Azure
  • Connect to your AKS cluster
  • Diagnose cluster health issues
  • Create GitHub issues for problems found

Type 'exit' to quit

============================================================