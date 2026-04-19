
import { ModelProvider } from '../src/bridge/provider';

async function test() {
    const provider = new ModelProvider();
    
    const tests = [
        {
            name: "Nmap using results.txt (no 'arquivo' keyword)",
            prompt: 'faça um nmap usando results.txt'
        }
    ];

    for (const t of tests) {
        console.log(`\n--- Testing: ${t.name} ---`);
        console.log(`Prompt: ${t.prompt}`);
        const mockMessages: any[] = [{ role: 'user', content: t.prompt }];
        const result = await provider.generate(mockMessages);
        console.log("Result Content:", result.content);
        if (result.tool_calls && result.tool_calls.length > 0) {
            console.log("Tool Call Arguments:", result.tool_calls[0].function.arguments);
        } else {
            console.log("No tool calls generated.");
        }
    }
}

test().catch(console.error);
