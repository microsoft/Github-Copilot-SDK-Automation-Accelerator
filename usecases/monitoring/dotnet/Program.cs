// AKS Monitor Agent - .NET Starter Template
// The primary Copilot SDK implementation is in Node.js.
// This template demonstrates the monitoring logic in C#.

using System.Diagnostics;
using System.Text.Json;

var clusterName = Environment.GetEnvironmentVariable("AKS_CLUSTER_NAME") ?? "demo-cluster";

Console.WriteLine("🔧 AKS Monitor Agent (.NET) starting...");

// Try to delegate to Node.js agent
var nodejsAgent = Path.Combine("..", "nodejs", "aks-monitor-agent.ts");
if (File.Exists(nodejsAgent))
{
    Console.WriteLine("Delegating to Node.js Copilot SDK agent...");
    var process = new Process
    {
        StartInfo = new ProcessStartInfo
        {
            FileName = "npx",
            Arguments = "tsx aks-monitor-agent.ts",
            WorkingDirectory = Path.Combine("..", "nodejs"),
            RedirectStandardOutput = false,
            UseShellExecute = false,
        }
    };
    process.Start();
    process.WaitForExit();
    return;
}

// Fallback: run .NET diagnostics
var diagnostics = new
{
    cluster = clusterName,
    timestamp = DateTime.UtcNow.ToString("o"),
    nodeHealth = new { total = 3, ready = 2, notReady = 1 },
    podHealth = new { total = 15, running = 12, pending = 2, failed = 1 },
    services = new { total = 8, healthy = 7, unhealthy = 1 },
    resourceUtilization = new { cpu = "75%", memory = "82%", disk = "65%" },
};

var issues = new List<object>();

if (diagnostics.nodeHealth.notReady > 0)
{
    issues.Add(new
    {
        severity = "high",
        category = "node-health",
        title = $"{diagnostics.nodeHealth.notReady} Node(s) Not Ready in AKS Cluster {clusterName}",
        description = $"Found {diagnostics.nodeHealth.notReady} node(s) in NotReady state.",
    });
}

if (diagnostics.podHealth.failed > 0)
{
    issues.Add(new
    {
        severity = "medium",
        category = "pod-failure",
        title = $"{diagnostics.podHealth.failed} Failed Pod(s) in AKS Cluster {clusterName}",
        description = $"Detected {diagnostics.podHealth.failed} pod(s) in Failed state.",
    });
}

if (diagnostics.services.unhealthy > 0)
{
    issues.Add(new
    {
        severity = "high",
        category = "service-health",
        title = $"{diagnostics.services.unhealthy} Unhealthy Service(s) in AKS Cluster {clusterName}",
        description = $"Detected {diagnostics.services.unhealthy} service(s) with health issues.",
    });
}

var result = new { diagnostics, issues, issueCount = issues.Count };
var json = JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });
Console.WriteLine(json);
