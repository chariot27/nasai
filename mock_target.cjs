const net = require('node:net');

const PORT = 8080;

const server = net.createServer((socket) => {
  console.log(`[MOCK TARGET] Nova conexão de ${socket.remoteAddress}`);

  socket.on('data', (data) => {
    const request = data.toString();
    console.log(`[MOCK TARGET] Recebido payload snippet: ${request.substring(0, 50).replace(/\n/g, '\\n')}`);

    // Simulação de Vulnerabilidades 0-Day para Heurísticas do Nasai

    // 1. Crash on Malformed Method
    if (request.includes('N@ZAI_HACK')) {
      console.log('[MOCK TARGET] Triggering CRASH/RESET Simulation...');
      socket.destroy(); // Simula um crash de parser (ECONNRESET)
      return;
    }

    // 2. Resource Exhaustion / Slow Response
    if (request.includes('X-Oversize')) {
      console.log('[MOCK TARGET] Simulating Resource Exhaustion (Slow Response)...');
      setTimeout(() => {
        socket.write('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nResource processed slowly.\n');
        socket.end();
      }, 4500); // Demora mais que 4s para cair na heurística do Nasai
      return;
    }

    // 3. Sensitive Leak / Framework Dump
    if (request.includes('%00../../etc/passwd')) {
      console.log('[MOCK TARGET] Simulating Information Leak (Framework Dump)...');
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.write('Error: java.lang.NullPointerException at com.internal.Parser.validatePath(Parser.java:127)\n');
      socket.write('Traceback (most recent call last):\n  File "server.py", line 42, in handle_request\n');
      socket.end();
      return;
    }

    // 4. Default Response
    socket.write('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nNasai Mock Target Alive.\n');
    socket.end();
  });

  socket.on('error', (err) => {
    // console.error(`[MOCK TARGET] Socket Error: ${err.message}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`[MOCK TARGET] Servidor Vulnerável rodando em :${PORT}`);
  console.log(`[MOCK TARGET] Pronto para ser atacado pelo Nasai Maestro 9.0`);
  console.log(`======================================================\n`);
});
