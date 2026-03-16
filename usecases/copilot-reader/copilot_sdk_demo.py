"""
GitHub Copilot SDK Demo - Python
This script demonstrates how to use the GitHub Copilot SDK to:
1. Accept user queries
2. Generate responses with streaming
3. Print intermediate events for tool calling
"""

import asyncio
import random
import sys
from copilot import CopilotClient
from copilot.tools import define_tool
from copilot.generated.session_events import SessionEventType
from pydantic import BaseModel, Field


# Define a custom tool with Pydantic schema
class GetWeatherParams(BaseModel):
    city: str = Field(description="The name of the city to get weather for")


@define_tool(description="Get the current weather for a city")
async def get_weather(params: GetWeatherParams) -> dict:
    """Simulated weather API call"""
    conditions = ["sunny", "cloudy", "rainy", "partly cloudy", "snowy"]
    temp = random.randint(30, 90)
    condition = random.choice(conditions)
    return {
        "city": params.city,
        "temperature": f"{temp}°F",
        "condition": condition,
        "humidity": f"{random.randint(30, 80)}%"
    }


class CalculatorParams(BaseModel):
    expression: str = Field(description="Mathematical expression to evaluate")


@define_tool(description="Evaluate a mathematical expression")
async def calculator(params: CalculatorParams) -> dict:
    """Simple calculator tool"""
    try:
        # Note: In production, use a safer evaluation method
        result = eval(params.expression)
        return {"expression": params.expression, "result": result}
    except Exception as e:
        return {"expression": params.expression, "error": str(e)}


def handle_event(event):
    """
    Event handler that prints intermediate events including tool calls.
    
    Event types include:
    - user.message: User input added
    - assistant.message: Complete model response
    - assistant.message_delta: Streaming response chunk
    - assistant.reasoning: Model reasoning
    - assistant.reasoning_delta: Streaming reasoning chunk
    - tool.execution_start: Tool invocation started
    - tool.execution_complete: Tool execution finished
    - session.idle: No active processing
    - session.error: Error occurred
    """
    
    # Handle streaming response chunks
    if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
        sys.stdout.write(event.data.delta_content)
        sys.stdout.flush()
    
    # Handle tool execution start
    elif event.type == SessionEventType.TOOL_EXECUTION_START:
        print(f"\n\n🔧 [TOOL CALL START] Tool: {event.data.tool_name}")
        if hasattr(event.data, 'arguments') and event.data.arguments:
            print(f"   Arguments: {event.data.arguments}")
        print()
    
    # Handle tool execution complete
    elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
        print(f"\n✅ [TOOL CALL COMPLETE] Tool: {event.data.tool_name}")
        if hasattr(event.data, 'result') and event.data.result:
            print(f"   Result: {event.data.result}")
        print()
    
    # Handle model reasoning (if available)
    elif event.type == SessionEventType.ASSISTANT_REASONING_DELTA:
        # Print reasoning in a different color/format
        sys.stdout.write(f"💭 {event.data.delta_content}")
        sys.stdout.flush()
    
    # Handle session errors
    elif event.type == SessionEventType.SESSION_ERROR:
        print(f"\n❌ [ERROR] {event.data.message}")
    
    # Handle session idle (response complete)
    elif event.type == SessionEventType.SESSION_IDLE:
        print()  # New line when done


async def single_query_demo():
    """Demo: Process a single query and show all events"""
    print("=" * 60)
    print("GitHub Copilot SDK - Single Query Demo")
    print("=" * 60)
    
    client = CopilotClient()
    await client.start()
    
    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
        "tools": [get_weather, calculator],
    })
    
    session.on(handle_event)
    
    # Example query that will trigger tool calls
    query = "What's the weather like in Seattle and Tokyo? Also, what is 25 * 4 + 100?"
    print(f"\n📝 User Query: {query}\n")
    print("-" * 60)
    print("🤖 Assistant Response:\n")
    
    await session.send_and_wait({"prompt": query})
    
    print("\n" + "=" * 60)
    await client.stop()


async def interactive_demo(use_all_tools: bool = False, use_github_mcp: bool = False):
    """Demo: Interactive chat session with tool calling"""
    print("=" * 60)
    print("GitHub Copilot SDK - Interactive Assistant")
    print("=" * 60)
    
    if use_github_mcp:
        print("\nMode: FULL POWER (All tools + GitHub MCP)")
        print("  • Web search, file operations, and all CLI tools")
        print("  • GitHub MCP: repos, issues, PRs, code search, file contents")
        print("  • Custom tools: get_weather, calculator")
    elif use_all_tools:
        print("\nMode: ALL BUILT-IN TOOLS ENABLED")
        print("  • Web search, file operations, and all CLI tools available")
        print("  • Plus custom tools: get_weather, calculator")
    else:
        print("\nMode: CUSTOM TOOLS ONLY")
        print("  • get_weather - Get weather for any city")
        print("  • calculator - Evaluate math expressions")
    
    print("\nType 'exit' or 'quit' to end the session")
    print("-" * 60)
    
    client = CopilotClient()
    await client.start()
    
    # Session config differs based on mode
    if use_github_mcp:
        # Full power mode: GitHub MCP server (no custom tools to avoid confusion)
        print("\n⏳ Connecting to GitHub MCP server...")
        session = await client.create_session({
            "model": "gpt-4.1",
            "streaming": True,
            # DON'T include custom tools - they confuse the model when MCP tools are available
            # "tools": [get_weather, calculator],
            # Connect to GitHub MCP server for repo/issue/PR access
            "mcp_servers": {
                "github": {
                    "type": "http",
                    "url": "https://api.githubcopilot.com/mcp/",
                },
            },
            "system_message": {
                "content": """You are a helpful assistant with access to GitHub via MCP tools.

IMPORTANT: You have access to GitHub MCP tools. When users ask about GitHub repos, you MUST use tools like:
- mcp_github_get_file_contents: Read files from GitHub repos (owner, repo, path)
- mcp_github_search_code: Search code on GitHub
- mcp_github_list_commits: View commit history
- mcp_github_get_repository: Get repo info
- mcp_github_list_issues: List repository issues
- mcp_github_list_pull_requests: List PRs

For example, to read README from facebook/react, call mcp_github_get_file_contents with:
  owner: "facebook"
  repo: "react"
  path: "README.md"

DO NOT use get_weather or calculator - they are not available in this mode.
Always use the GitHub MCP tools for any GitHub-related requests."""
            }
        })
        print("✅ Connected to GitHub MCP server\n")
    elif use_all_tools:
        # Don't restrict tools - let all built-in tools be available
        # Adding custom tools alongside built-in ones
        session = await client.create_session({
            "model": "gpt-4.1",
            "streaming": True,
            # Custom tools are ADDED to built-in tools, not replacing them
            "tools": [get_weather, calculator],
            # Don't set available_tools or excluded_tools to allow all
            "system_message": {
                "content": "You are a helpful assistant with access to web search, file operations, and other tools. Use web_search when users ask to search the internet. Use available tools proactively to help users."
            }
        })
    else:
        session = await client.create_session({
            "model": "gpt-4.1",
            "streaming": True,
            "tools": [get_weather, calculator],
            # Explicitly restrict to only custom tools
            "available_tools": ["get_weather", "calculator"],
            "system_message": {
                "content": "You are a helpful assistant. When users ask about weather or need calculations, use the available tools to help them."
            }
        })
    
    session.on(handle_event)
    
    while True:
        try:
            print()
            user_input = input("👤 You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nGoodbye!")
            break
        
        if not user_input:
            continue
        
        if user_input.lower() in ("exit", "quit"):
            print("\nGoodbye!")
            break
        
        print("\n🤖 Assistant: ", end="")
        await session.send_and_wait({"prompt": user_input})
        print()
    
    await client.stop()


async def main():
    """Main entry point"""
    print("\nGitHub Copilot SDK Demo")
    print("-" * 40)
    print("1. Single Query Demo (see all events)")
    print("2. Interactive Chat (custom tools only)")
    print("3. Interactive Chat (ALL TOOLS - web search, files, etc.)")
    print("4. Interactive Chat (FULL POWER - GitHub MCP + all tools)")
    print("-" * 40)
    
    try:
        choice = input("Select mode (1, 2, 3, or 4): ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nExiting...")
        return
    
    if choice == "1":
        await single_query_demo()
    elif choice == "2":
        await interactive_demo(use_all_tools=False)
    elif choice == "3":
        await interactive_demo(use_all_tools=True)
    elif choice == "4":
        await interactive_demo(use_all_tools=True, use_github_mcp=True)
    else:
        print("Invalid choice. Running single query demo...")
        await single_query_demo()


if __name__ == "__main__":
    asyncio.run(main())
