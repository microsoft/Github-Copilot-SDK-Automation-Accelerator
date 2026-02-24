import { CopilotClient } from "@github/copilot-sdk";
import * as readline from "readline";

/**
 * Hello World - Minimal Copilot SDK agent
 * The simplest possible agent: no tools, no MCP servers, just a system prompt.
 */

async function main() {
    console.log("👋 Hello World Agent starting...\n");

    const client = new CopilotClient();

    const session = await client.createSession({
        model: "gpt-4o",
        streaming: true,
        systemPrompt: "You are a friendly assistant. Keep responses brief and helpful.",
    });

    session.on("assistant.message_delta", (event) => {
        process.stdout.write(event.data.deltaContent);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("🚀 Hello World Agent Ready! Type 'exit' to quit.\n");

    const prompt = () => {
        rl.question("You: ", async (input) => {
            if (input.toLowerCase() === "exit") {
                await client.stop();
                rl.close();
                return;
            }
            if (!input.trim()) { prompt(); return; }
            process.stdout.write("\nAssistant: ");
            await session.sendAndWait({ prompt: input });
            console.log("\n");
            prompt();
        });
    };

    prompt();
}

main().catch(console.error);
