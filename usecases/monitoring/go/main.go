// AKS Monitor Agent - Go Starter Template
//
// The primary Copilot SDK implementation is in Node.js.
// This Go template demonstrates the monitoring logic structure
// and can invoke the Node.js agent or use Azure SDK for Go.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"time"
)

type AuthState struct {
	IsAuthenticated bool   `json:"isAuthenticated"`
	TenantID        string `json:"tenantId"`
	SubscriptionID  string `json:"subscriptionId"`
	ClusterName     string `json:"clusterName"`
	ResourceGroup   string `json:"resourceGroup"`
}

type Issue struct {
	Severity    string `json:"severity"`
	Category    string `json:"category"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type Diagnostics struct {
	Cluster             string            `json:"cluster"`
	Timestamp           string            `json:"timestamp"`
	NodeHealth          map[string]int    `json:"nodeHealth"`
	PodHealth           map[string]int    `json:"podHealth"`
	Services            map[string]int    `json:"services"`
	ResourceUtilization map[string]string `json:"resourceUtilization"`
}

type DiagnosticResult struct {
	Diagnostics Diagnostics `json:"diagnostics"`
	Issues      []Issue     `json:"issues"`
	IssueCount  int         `json:"issueCount"`
}

func diagnoseAKSCluster(clusterName string) DiagnosticResult {
	diagnostics := Diagnostics{
		Cluster:             clusterName,
		Timestamp:           time.Now().Format(time.RFC3339),
		NodeHealth:          map[string]int{"total": 3, "ready": 2, "notReady": 1},
		PodHealth:           map[string]int{"total": 15, "running": 12, "pending": 2, "failed": 1},
		Services:            map[string]int{"total": 8, "healthy": 7, "unhealthy": 1},
		ResourceUtilization: map[string]string{"cpu": "75%", "memory": "82%", "disk": "65%"},
	}

	var issues []Issue

	if diagnostics.NodeHealth["notReady"] > 0 {
		issues = append(issues, Issue{
			Severity:    "high",
			Category:    "node-health",
			Title:       fmt.Sprintf("%d Node(s) Not Ready in AKS Cluster %s", diagnostics.NodeHealth["notReady"], clusterName),
			Description: fmt.Sprintf("Found %d node(s) in NotReady state.", diagnostics.NodeHealth["notReady"]),
		})
	}

	if diagnostics.PodHealth["failed"] > 0 {
		issues = append(issues, Issue{
			Severity:    "medium",
			Category:    "pod-failure",
			Title:       fmt.Sprintf("%d Failed Pod(s) in AKS Cluster %s", diagnostics.PodHealth["failed"], clusterName),
			Description: fmt.Sprintf("Detected %d pod(s) in Failed state.", diagnostics.PodHealth["failed"]),
		})
	}

	if diagnostics.Services["unhealthy"] > 0 {
		issues = append(issues, Issue{
			Severity:    "high",
			Category:    "service-health",
			Title:       fmt.Sprintf("%d Unhealthy Service(s) in AKS Cluster %s", diagnostics.Services["unhealthy"], clusterName),
			Description: fmt.Sprintf("Detected %d service(s) with health issues.", diagnostics.Services["unhealthy"]),
		})
	}

	return DiagnosticResult{
		Diagnostics: diagnostics,
		Issues:      issues,
		IssueCount:  len(issues),
	}
}

func main() {
	fmt.Println("🔧 AKS Monitor Agent (Go) starting...")

	// Try to delegate to Node.js agent
	nodejsDir := "../nodejs"
	if _, err := os.Stat(nodejsDir + "/aks-monitor-agent.ts"); err == nil {
		fmt.Println("Delegating to Node.js Copilot SDK agent...")
		cmd := exec.Command("npx", "tsx", "aks-monitor-agent.ts")
		cmd.Dir = nodejsDir
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		if err := cmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Error running Node.js agent: %v\n", err)
			os.Exit(1)
		}
		return
	}

	// Fallback: run Go diagnostics
	clusterName := os.Getenv("AKS_CLUSTER_NAME")
	if clusterName == "" {
		clusterName = "demo-cluster"
	}

	result := diagnoseAKSCluster(clusterName)
	output, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(output))
}
