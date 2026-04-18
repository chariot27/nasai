import { exec } from 'node:child_process';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

const FAST_TOOLS: Record<string, string> = {
  subfinder: 'subfinder -d DOM -silent',
  nmap: 'nmap -F -T4 DOM',
  nmap_vuln: 'nmap --script vuln -T4 DOM',
  host: 'host DOM',
  dig: 'dig +short DOM',
  dig_mx: 'dig +short MX DOM',
  curl: `curl -sIL DOM -m 15 -A "${USER_AGENT}"`,
  ssl: 'timeout 5 openssl s_client -connect DOM:443 </dev/null | openssl x509 -noout 2>/dev/null',
  whatweb: `whatweb DOM --quiet --user-agent "${USER_AGENT}"`,
};

const TASK_MAP: Record<string, string[]> = {
  subdomains: ['subfinder', 'host'],
  vuln: ['nmap_vuln'],
  scan: ['nmap', 'curl'],
  dns: ['host', 'dig'],
  ssl: ['ssl'],
  headers: ['curl'],
  tech: ['whatweb', 'curl'],
  basic: ['host', 'dig'],
};

export class ModelProvider {
  async generate(messages: ChatMessage[]): Promise<any> {
    const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    let domain = userMsg.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/)?.[1];
    if (domain) domain = domain.trim().toLowerCase();

    if (!domain) {
      return { content: '💡 Uso: nasai "scan domain.com"', tool_calls: [] };
    }

    const lowerMsg = userMsg.toLowerCase();
    
    // Detecção de Intenção Complexa (ex: salvar em arquivo)
    // Se o usuário pedir para salvar ou processar algo que o provider mock não faz nativamente,
    // retornamos uma tool_call para o AgentEngine executar via Shell.
    if (lowerMsg.includes('salve') || lowerMsg.includes('arquivo') || lowerMsg.includes('save') || lowerMsg.includes('file')) {
      let cmd = `subfinder -d ${domain} -silent`;
      if (lowerMsg.includes('httpx')) cmd += ` | ~/go/bin/httpx -silent`;
      
      const fileNameMatch = userMsg.match(/([a-zA-Z0-9_-]+\.(txt|md|json|log))/);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'results.txt';
      
      return {
        content: `Entendido. Vou processar o alvo ${domain} e salvar os resultados em ${fileName}.`,
        tool_calls: [{
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: 'run_shell',
            arguments: JSON.stringify({ command: `${cmd} > ${fileName}` })
          }
        }]
      };
    }

    const task = this.detectTask(lowerMsg);
    const toolsList = TASK_MAP[task] || TASK_MAP.basic;
    
    // Execução Paralela para máxima performance (v9.0 Speed Optimization)
    const toolPromises = toolsList.map(async (tool) => {
      const cmd = FAST_TOOLS[tool]?.replace('DOM', domain);
      if (!cmd) return null;
      
      return new Promise<string>((resolve) => {
        // Timeout de 30s para ferramentas rápidas em paralelo
        exec(cmd, { timeout: 30000, encoding: 'utf-8' }, (error: any, stdout: string) => {
          if (error) {
             resolve(`${tool}: ❌ (Timeout ou Bloqueio)`);
          } else {
             resolve(this.formatResult(tool, stdout || "Sem dados detalhados."));
          }
        });
      });
    });

    const results = (await Promise.all(toolPromises)).filter(r => r !== null) as string[];

    const finalContent = results.length > 0 
      ? results.join('\n') 
      : "⚠️ O Maestro não conseguiu extrair dados significativos rapidamente.";

    return { content: finalContent, tool_calls: [] };
  }

  private detectTask(prompt: string): string {
    if (prompt.includes('sub')) return 'subdomains';
    if (prompt.includes('vuln') || prompt.includes('xss') || prompt.includes('sql')) return 'vuln';
    if (prompt.includes('scan') || prompt.includes('mape')) return 'scan';
    if (prompt.includes('dns') || prompt.includes('dig')) return 'dns';
    if (prompt.includes('ssl')) return 'ssl';
    if (prompt.includes('tech') || prompt.includes('tecnologia') || prompt.includes('framework') || prompt.includes('versao')) return 'tech';
    return 'basic';
  }

  private formatResult(tool: string, out: string): string {
    const h: Record<string, string> = { subfinder: '▸ SUBFINDER', nmap: '▸ NMAP', host: '▸ DNS', dig: '▸ DNS', curl: '▸ HTTP', ssl: '▸ SSL', whatweb: '▸ TECHS' };
    let result = `${h[tool] || tool}\n${out.substring(0, 1200)}\n`;

    // Inteligência de Headers: Detectar tecnologias via assinaturas se for CURL
    if (tool === 'curl') {
      const techDetected: string[] = [];
      if (out.includes('visid_incap') || out.includes('incap_ses')) techDetected.push('WAF: Incapsula (Imperva)');
      if (out.includes('cf-ray') || out.includes('__cfduid')) techDetected.push('WAF/CDN: Cloudflare');
      if (out.includes('akamai')) techDetected.push('CDN: Akamai');
      if (out.includes('awselb')) techDetected.push('Load Balancer: AWS ELB');
      if (out.includes('Server: nginx')) techDetected.push('Web Server: Nginx');
      if (out.includes('Server: Apache')) techDetected.push('Web Server: Apache');
      if (out.includes('X-Powered-By: PHP')) techDetected.push('Language: PHP');
      
      if (techDetected.length > 0) {
        result += `\n[MAESTRO INTELLIGENCE - TECNOLOGIAS DETECTADAS]\n${techDetected.map(t => '  > ' + t).join('\n')}\n`;
      }
    }

    return result;
  }
}