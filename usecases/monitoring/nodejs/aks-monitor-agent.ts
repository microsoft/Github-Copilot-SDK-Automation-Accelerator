import { CopilotClient, defineTool } from "@github/copilot-sdk";
import * as readline from "readline";

/**
 * AKS Monitor Agent
 * 
 * This agent integrates with:
 * - GitHub MCP Server: For creating issues
 * - Azure MCP Server: For Azure authentication and resource management
 * - AKS MCP Server: For AKS cluster monitoring and diagnostics
 * 
 * Workflow:
 * 1. Authenticate with Azure tenant and subscription
 * 2. Connect to AKS cluster
 * 3. Diagnose cluster health and identify issues
 * 4. Create GitHub issues for any problems found
 */

// Define authentication state tracking
let authState = {
    isAuthenticated: false,
    tenantId: "",
    subscriptionId: "",
    clusterName: "",
    resourceGroup: "",
};

// Tool to capture and store Azure authentication information
const captureAzureAuth = defineTool("capture_azure_auth", {
    description: "Capture Azure authentication details (tenant ID and subscription ID) from user",
    parameters: {
        type: "object",
        properties: {
            tenantId: { 
                type: "string", 
                description: "Azure tenant ID" 
            },
            subscriptionId: { 
                type: "string", 
                description: "Azure subscription ID" 
            },
        },
        required: ["tenantId", "subscriptionId"],
    },
    handler: async ({ tenantId, subscriptionId }) => {
        authState.tenantId = tenantId;
        authState.subscriptionId = subscriptionId;
        authState.isAuthenticated = true;
        return {
            status: "success",
            message: `Authentication details captured for tenant ${tenantId}`,
            tenantId,
            subscriptionId,
        };
    },
});

// Tool to capture AKS cluster information
const captureAksCluster = defineTool("capture_aks_cluster", {
    description: "Capture AKS cluster details (cluster name and resource group)",
    parameters: {
        type: "object",
        properties: {
            clusterName: { 
                type: "string", 
                description: "AKS cluster name" 
            },
            resourceGroup: { 
                type: "string", 
                description: "Azure resource group containing the AKS cluster" 
            },
        },
        required: ["clusterName", "resourceGroup"],
    },
    handler: async ({ clusterName, resourceGroup }) => {
        authState.clusterName = clusterName;
        authState.resourceGroup = resourceGroup;
        return {
            status: "success",
            message: `Cluster details captured: ${clusterName} in ${resourceGroup}`,
            clusterName,
            resourceGroup,
        };
    },
});

// Tool to get current authentication state
const getAuthState = defineTool("get_auth_state", {
    description: "Get current Azure authentication and cluster connection state",
    parameters: {
        type: "object",
        properties: {},
    },
    handler: async () => {
        return {
            isAuthenticated: authState.isAuthenticated,
            tenantId: authState.tenantId,
            subscriptionId: authState.subscriptionId,
            clusterName: authState.clusterName,
            resourceGroup: authState.resourceGroup,
            hasClusterInfo: !!(authState.clusterName && authState.resourceGroup),
        };
    },
});

// Tool to simulate AKS cluster diagnostics
const diagnoseAksCluster = defineTool("diagnose_aks_cluster", {
    description: "Run diagnostics on the AKS cluster to identify issues with nodes, pods, and services",
    parameters: {
        type: "object",
        properties: {
            clusterName: { 
                type: "string", 
                description: "AKS cluster name" 
            },
        },
        required: ["clusterName"],
    },
    handler: async ({ clusterName }) => {
        // Simulate cluster diagnostics
        const issues = [];
        const diagnostics = {
            cluster: clusterName,
            timestamp: new Date().toISOString(),
            nodeHealth: {
                total: 3,
                ready: 2,
                notReady: 1,
            },
            podHealth: {
                total: 15,
                running: 12,
                pending: 2,
                failed: 1,
            },
            services: {
                total: 8,
                healthy: 7,
                unhealthy: 1,
            },
            resourceUtilization: {
                cpu: "75%",
                memory: "82%",
                disk: "65%",
            },
        };

        // Identify issues
        if (diagnostics.nodeHealth.notReady > 0) {
            issues.push({
                severity: "high",
                category: "node-health",
                title: `${diagnostics.nodeHealth.notReady} Node(s) Not Ready in AKS Cluster ${clusterName}`,
                description: `Found ${diagnostics.nodeHealth.notReady} node(s) in NotReady state. This may impact workload availability.`,
                details: `Total Nodes: ${diagnostics.nodeHealth.total}, Ready: ${diagnostics.nodeHealth.ready}, NotReady: ${diagnostics.nodeHealth.notReady}`,
            });
        }

        if (diagnostics.podHealth.failed > 0) {
            issues.push({
                severity: "medium",
                category: "pod-failure",
                title: `${diagnostics.podHealth.failed} Failed Pod(s) in AKS Cluster ${clusterName}`,
                description: `Detected ${diagnostics.podHealth.failed} pod(s) in Failed state.`,
                details: `Total Pods: ${diagnostics.podHealth.total}, Running: ${diagnostics.podHealth.running}, Failed: ${diagnostics.podHealth.failed}, Pending: ${diagnostics.podHealth.pending}`,
            });
        }

        if (diagnostics.podHealth.pending > 0) {
            issues.push({
                severity: "low",
                category: "pod-pending",
                title: `${diagnostics.podHealth.pending} Pending Pod(s) in AKS Cluster ${clusterName}`,
                description: `Found ${diagnostics.podHealth.pending} pod(s) stuck in Pending state.`,
                details: `This may indicate resource constraints or scheduling issues.`,
            });
        }

        if (diagnostics.services.unhealthy > 0) {
            issues.push({
                severity: "high",
                category: "service-health",
                title: `${diagnostics.services.unhealthy} Unhealthy Service(s) in AKS Cluster ${clusterName}`,
                description: `Detected ${diagnostics.services.unhealthy} service(s) with health issues.`,
                details: `Total Services: ${diagnostics.services.total}, Healthy: ${diagnostics.services.healthy}, Unhealthy: ${diagnostics.services.unhealthy}`,
            });
        }

        if (parseInt(diagnostics.resourceUtilization.memory) > 80) {
            issues.push({
                severity: "medium",
                category: "resource-utilization",
                title: `High Memory Utilization in AKS Cluster ${clusterName}`,
                description: `Memory utilization is at ${diagnostics.resourceUtilization.memory}, which may cause performance degradation.`,
                details: `CPU: ${diagnostics.resourceUtilization.cpu}, Memory: ${diagnostics.resourceUtilization.memory}, Disk: ${diagnostics.resourceUtilization.disk}`,
            });
        }

        return {
            status: "diagnostics_complete",
            diagnostics,
            issues,
            issueCount: issues.length,
        };
    },
});

// Tool to prepare GitHub issue from AKS diagnostic issue
const prepareGitHubIssue = defineTool("prepare_github_issue", {
    description: "Prepare a GitHub issue from an AKS diagnostic finding",
    parameters: {
        type: "object",
        properties: {
            title: { 
                type: "string", 
                description: "Issue title" 
            },
            severity: { 
                type: "string", 
                description: "Issue severity (high, medium, low)" 
            },
            category: { 
                type: "string", 
                description: "Issue category" 
            },
            description: { 
                type: "string", 
                description: "Issue description" 
            },
            details: { 
                type: "string", 
                description: "Additional details" 
            },
        },
        required: ["title", "severity", "category", "description", "details"],
    },
    handler: async ({ title, severity, category, description, details }) => {
        const labels = [`severity:${severity}`, `category:${category}`, "aks-monitoring"];
        
        const issueBody = `## AKS Cluster Issue Report

**Cluster:** ${authState.clusterName}
**Resource Group:** ${authState.resourceGroup}
**Subscription:** ${authState.subscriptionId}
**Severity:** ${severity.toUpperCase()}
**Category:** ${category}
**Detected:** ${new Date().toISOString()}

### Description
${description}

### Details
${details}

### Recommended Actions
${getSeverityRecommendations(severity, category)}

---
*This issue was automatically created by the AKS Monitor Agent*`;

        return {
            status: "issue_prepared",
            issueData: {
                title,
                body: issueBody,
                labels,
            },
        };
    },
});

// Helper function to get severity-based recommendations
function getSeverityRecommendations(severity: string, category: string): string {
    const recommendations: Record<string, Record<string, string>> = {
        high: {
            "node-health": "- Investigate node logs immediately\n- Check node conditions and events\n- Consider cordon and drain operations\n- Verify network connectivity",
            "service-health": "- Check service endpoint health\n- Review service logs\n- Verify backend pod availability\n- Test service connectivity",
        },
        medium: {
            "pod-failure": "- Review pod logs and events\n- Check resource limits and requests\n- Verify image pull secrets\n- Inspect container exit codes",
            "resource-utilization": "- Consider scaling cluster nodes\n- Review resource quotas\n- Optimize pod resource requests\n- Monitor trends over time",
        },
        low: {
            "pod-pending": "- Check scheduler events\n- Verify node resources\n- Review pod affinity/anti-affinity rules\n- Check taints and tolerations",
        },
    };

    return recommendations[severity]?.[category] || "- Investigate the issue further\n- Check cluster logs\n- Review Azure Monitor insights";
}

// Main agent setup
async function startAksMonitorAgent() {
    console.log("🔧 AKS Monitor Agent starting...\n");
    
    const client = new CopilotClient();
    
    // Create session with MCP servers and tools
    const session = await client.createSession({
        model: "gpt-4o",
        streaming: true,
        tools: [
            captureAzureAuth,
            captureAksCluster,
            getAuthState,
            diagnoseAksCluster,
            prepareGitHubIssue,
        ],
        mcpServers: {
            // GitHub MCP Server for issue creation (HTTP-based)
            github: {
                type: "http",
                url: "https://api.githubcopilot.com/mcp/",
            },
            // Azure MCP Server for Azure resource management (npm package)
            azure: {
                type: "stdio",
                command: "npx",
                args: ["-y", "@microsoft/mcp-server-azure"],
            },
            // AKS MCP Server for cluster operations (npm package)
            aks: {
                type: "stdio",
                command: "npx",
                args: ["-y", "@azure/mcp-server-aks"],
            },
        },
        systemPrompt: `You are an AKS (Azure Kubernetes Service) monitoring and diagnostics agent. Your role is to:

1. Help users authenticate with Azure by collecting their tenant ID and subscription ID
2. Connect to their AKS cluster by collecting cluster name and resource group
3. Run diagnostics on the AKS cluster to identify issues
4. Create GitHub issues for any problems found

When users first interact with you:
- Ask for their Azure tenant ID and subscription ID
- Use the capture_azure_auth tool to store this information
- Then ask for their AKS cluster name and resource group
- Use the capture_aks_cluster tool to store this information

Once authenticated and connected:
- Run diagnostics using the diagnose_aks_cluster tool
- For each issue found, prepare a GitHub issue using prepare_github_issue
- Then use the GitHub MCP server to actually create the issue

Be conversational, helpful, and guide users through the process step by step.
Always confirm actions before creating GitHub issues.`,
    });

    // Event listeners
    session.on("assistant.message_delta", (event) => {
        process.stdout.write(event.data.deltaContent);
    });

    session.on("tool.call", (event) => {
        console.log(`\n🔧 [Tool Call: ${event.data.toolName}]`);
    });

    session.on("tool.result", (event) => {
        console.log(`✅ [Tool Result: ${event.data.toolName}]`);
    });

    // Interactive console
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("🚀 AKS Monitor Agent Ready!");
    console.log("=" .repeat(60));
    console.log("\nThis agent will help you:");
    console.log("  • Authenticate with Azure");
    console.log("  • Connect to your AKS cluster");
    console.log("  • Diagnose cluster health issues");
    console.log("  • Create GitHub issues for problems found");
    console.log("\nType 'exit' to quit\n");
    console.log("=" .repeat(60));
    console.log("\n");

    const prompt = () => {
        rl.question("You: ", async (input) => {
            if (input.toLowerCase() === "exit") {
                console.log("\n👋 Shutting down AKS Monitor Agent...");
                await client.stop();
                rl.close();
                return;
            }

            if (!input.trim()) {
                prompt();
                return;
            }

            process.stdout.write("\nAssistant: ");
            await session.sendAndWait({ prompt: input });
            console.log("\n");
            prompt();
        });
    };

    // Start with an initial greeting
    process.stdout.write("Assistant: ");
    await session.sendAndWait({ 
        prompt: "Hello! Please introduce yourself and explain how you can help me monitor my AKS cluster." 
    });
    console.log("\n");

    prompt();
}

// Start the agent
startAksMonitorAgent().catch((error) => {
    console.error("❌ Error starting AKS Monitor Agent:", error);
    process.exit(1);
});
