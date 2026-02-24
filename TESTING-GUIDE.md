# Testing Guide for AKS Monitor Agent

## Pre-Testing Checklist

Before testing the agent, ensure you have:

- [ ] Node.js 18+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] GitHub Copilot subscription active
- [ ] Azure tenant ID and subscription ID ready
- [ ] AKS cluster name and resource group name ready
- [ ] GitHub Personal Access Token (optional, for issue creation)

## Test Scenarios

### Test 1: Basic Agent Startup

**Objective**: Verify the agent starts correctly

```bash
npm run aks-monitor
```

**Expected Output**:
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