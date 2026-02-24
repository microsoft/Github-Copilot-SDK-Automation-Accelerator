# Automation Examples

Example configurations for the Copilot SDK runner.

## MCP Configuration

[mcp-config.json](mcp-config.json) — Default MCP server configuration including:
- GitHub MCP Server (HTTP)
- Azure MCP Server (stdio)
- AKS MCP Server (stdio)

Use with the runner:
```bash
./copilot-sdk-runner.sh --usecase monitoring --lang nodejs --config automation/examples/mcp-config.json
```
