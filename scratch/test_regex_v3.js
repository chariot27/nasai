
const regex = /\b([a-zA-Z0-9.-]+\.(?!txt|log|md|json|png|jpg|pdf|exe|zip|gz|tar)[a-zA-Z]{2,})\b/i;
const tests = [
    "faça um scan em attime.com.br",
    "teste no example.com",
    "rode nmap em results.txt",
    "salve em resultados.log",
    "site.com.br"
];

tests.forEach(t => {
    const m = t.match(regex);
    console.log(`Input: ${t} => Match: ${m ? m[1] : 'null'}`);
});
