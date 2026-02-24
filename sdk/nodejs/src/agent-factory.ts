import { CopilotClient } from "@github/copilot-sdk";
import * as readline from "readline";

/**
 * Agent Factory - Reusable helper for creating Copilot SDK agents.
 *
 * Usage:
 *   const agent = await createAgent({ name, model, systemPrompt, tools, mcpServers });
 *   await runInteractive(agent);
 */

interface AgentConfig {
    name: string;
    model?: string;
    systemPrompt: string;
    tools?: any[];
    mcpServers?: Record<string, any>;
}

interface Agent {
    client: CopilotClient;
    session: any;
    name: string;
}

export async function createAgent(config: AgentConfig): Promise<Agent> {
    const client = new CopilotClient();

    const session = await client.createSession({
        model: config.model || "gpt-4o",
        streaming: true,
        tools: config.tools || [],
        mcpServers: config.mcpServers || {},
        systemPrompt: config.systemPrompt,
    });

    // Default event listeners
    session.on("assistant.message_delta", (event: any) => {
        process.stdout.write(event.data.deltaContent);
    });

    session.on("tool.call", (event: any) => {
        console.log(`\n🔧 [Tool Call: ${event.data.toolName}]`);
    });

    session.on("tool.result", (event: any) => {
        console.log(`✅ [Tool Result: ${event.data.toolName}]`);
    });

    return { client, session, name: config.name };
}

export async function runInteractive(agent: Agent): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log(`🚀 ${agent.name} Ready!`);
    console.log("=".repeat(60));
    console.log("Type 'exit' to quit\n");
    console.log("=".repeat(60) + "\n");

    // Initial greeting
    process.stdout.write("Assistant: ");
    await agent.session.sendAndWait({
        prompt: "Hello! Please introduce yourself briefly.",
    });
    console.log("\n");

    const prompt = () => {
        rl.question("You: ", async (input: string) => {
            if (input.toLowerCase() === "exit") {
                console.log(`\n👋 Shutting down ${agent.name}...`);
                await agent.client.stop();
                rl.close();
                return;
            }

            if (!input.trim()) {
                prompt();
                return;
            }

            process.stdout.write("\nAssistant: ");
            await agent.session.sendAndWait({ prompt: input });
            console.log("\n");
            prompt();
        });
    };

    prompt();
}
