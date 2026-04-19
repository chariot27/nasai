
const regex = /([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/;
const tests = [
    "faça um scan em attime.com.br",
    "teste no example.com",
    "sub.dominio.com.br",
    "net.br"
];

tests.forEach(t => {
    const m = t.match(regex);
    console.log(`Input: ${t} => Match: ${m ? m[1] : 'null'}`);
});
