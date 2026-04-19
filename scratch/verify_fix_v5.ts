
import { ModelProvider } from '../src/bridge/provider';

async function test() {
    const provider = new ModelProvider();
    
    const tests = [
        {
            name: "Use httpx explicitly",
            prompt: 'use httpx para identificar tecnologias e status do attime.com.br'
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
        }
    }
}

test().catch(console.error);
