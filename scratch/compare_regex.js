
const regex1 = /([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/; // From provider.ts
const regex2 = /([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/; // From run.ts

const tests = [
    "faça um scan em attime.com.br",
    "teste no example.com",
    "sub.dominio.com.br",
    "net.br"
];

console.log("Testing Regex 1 (provider.ts):");
tests.forEach(t => {
    const m = t.match(regex1);
    console.log(`Input: ${t} => Match: ${m ? m[1] : 'null'}`);
});

console.log("\nTesting Regex 2 (run.ts):");
tests.forEach(t => {
    const m = t.match(regex2);
    console.log(`Input: ${t} => Match: ${m ? m[1] : 'null'}`);
});
