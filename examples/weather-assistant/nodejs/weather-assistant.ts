import { CopilotClient, defineTool } from "@github/copilot-sdk";
import * as readline from "readline";

/**
 * Weather Assistant
 * A simple Copilot SDK agent that demonstrates tool calling
 * with a simulated weather API.
 */

const getWeather = defineTool("get_weather", {
    description: "Get the current weather for a city",
    parameters: {
        type: "object",
        properties: {
            city: { type: "string", description: "The city name" },
        },
        required: ["city"],
    },
    handler: async ({ city }) => {
        const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
        const temp = Math.floor(Math.random() * 30) + 50;
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        return { city, temperature: `${temp}°F`, condition };
    },
});

async function main() {
    const client = new CopilotClient();
    const session = await client.createSession({
        model: "gpt-4o",
        streaming: true,
        tools: [getWeather],
        systemPrompt: "You are a friendly weather assistant. Use the get_weather tool to look up weather for cities.",
    });

    session.on("assistant.message_delta", (event) => {
        process.stdout.write(event.data.deltaContent);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("🌤️  Weather Assistant (type 'exit' to quit)");
    console.log("   Try: 'What's the weather in Paris?'\n");

    const prompt = () => {
        rl.question("You: ", async (input) => {
            if (input.toLowerCase() === "exit") {
                await client.stop();
                rl.close();
                return;
            }
            if (!input.trim()) { prompt(); return; }
            process.stdout.write("Assistant: ");
            await session.sendAndWait({ prompt: input });
            console.log("\n");
            prompt();
        });
    };

    prompt();
}

main().catch(console.error);
