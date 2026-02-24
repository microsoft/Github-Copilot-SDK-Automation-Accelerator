import { CopilotClient, defineTool } from "@github/copilot-sdk";
import * as readline from "readline";

/**
 * Code Review Agent
 * 
 * AI-powered code review using GitHub Copilot SDK.
 * Analyzes code for quality, security, performance, and best practices.
 */

const analyzeCode = defineTool("analyze_code", {
    description: "Analyze a code snippet or file for quality issues, security vulnerabilities, and best practices",
    parameters: {
        type: "object",
        properties: {
            code: {
                type: "string",
                description: "The code to analyze",
            },
            language: {
                type: "string",
                description: "Programming language of the code",
            },
            focus: {
                type: "string",
                description: "Focus area: security, performance, quality, all",
            },
        },
        required: ["code", "language"],
    },
    handler: async ({ code, language, focus }) => {
        const findings = [];

        // Simulated analysis
        if (code.length > 100) {
            findings.push({
                type: "complexity",
                severity: "medium",
                message: "Consider breaking this into smaller functions",
                line: 1,
            });
        }

        if (code.includes("TODO") || code.includes("FIXME")) {
            findings.push({
                type: "maintenance",
                severity: "low",
                message: "Found TODO/FIXME comments that need attention",
                line: 1,
            });
        }

        return {
            language,
            focus: focus || "all",
            findings,
            summary: `Analyzed ${code.length} characters of ${language} code. Found ${findings.length} issue(s).`,
        };
    },
});

const prepareReviewComment = defineTool("prepare_review_comment", {
    description: "Prepare a structured code review comment",
    parameters: {
        type: "object",
        properties: {
            file: { type: "string", description: "File path" },
            line: { type: "number", description: "Line number" },
            severity: { type: "string", description: "Severity: critical, major, minor, suggestion" },
            comment: { type: "string", description: "Review comment" },
            suggestion: { type: "string", description: "Suggested fix (optional)" },
        },
        required: ["file", "line", "severity", "comment"],
    },
    handler: async ({ file, line, severity, comment, suggestion }) => {
        return {
            status: "comment_prepared",
            reviewComment: {
                file,
                line,
                severity,
                comment,
                suggestion: suggestion || null,
            },
        };
    },
});

async function startCodeReviewAgent() {
    console.log("🔍 Code Review Agent starting...\n");

    const client = new CopilotClient();

    const session = await client.createSession({
        model: "gpt-4o",
        streaming: true,
        tools: [analyzeCode, prepareReviewComment],
        mcpServers: {
            github: {
                type: "http",
                url: "https://api.githubcopilot.com/mcp/",
            },
        },
        systemPrompt: `You are an expert code reviewer. Your role is to:
1. Analyze code for quality, security, and performance issues
2. Provide actionable feedback with specific line references
3. Suggest improvements and best practices
4. Use the analyze_code tool for detailed analysis
5. Use prepare_review_comment to format structured feedback

Be thorough but constructive. Focus on meaningful improvements, not style nitpicks.`,
    });

    session.on("assistant.message_delta", (event) => {
        process.stdout.write(event.data.deltaContent);
    });

    session.on("tool.call", (event) => {
        console.log(`\n🔧 [Tool Call: ${event.data.toolName}]`);
    });

    session.on("tool.result", (event) => {
        console.log(`✅ [Tool Result: ${event.data.toolName}]`);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("🚀 Code Review Agent Ready!");
    console.log("=".repeat(60));
    console.log("\nPaste code or describe what you want reviewed.");
    console.log("Type 'exit' to quit\n");
    console.log("=".repeat(60) + "\n");

    const prompt = () => {
        rl.question("You: ", async (input) => {
            if (input.toLowerCase() === "exit") {
                console.log("\n👋 Shutting down Code Review Agent...");
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

    process.stdout.write("Assistant: ");
    await session.sendAndWait({
        prompt: "Hello! Please introduce yourself and explain how you can help review code.",
    });
    console.log("\n");
    prompt();
}

startCodeReviewAgent().catch((error) => {
    console.error("❌ Error starting Code Review Agent:", error);
    process.exit(1);
});
