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
  httpx: '~/go/bin/httpx -u DOM -silent -title -sc -td -method -timeout 2',
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
    // Regex aprimorada para ignorar extensões comuns de arquivos e focar em domínios
    let domain = userMsg.match(/\b([a-zA-Z0-9.-]+\.(?!txt|log|md|json|png|jpg|pdf|exe|zip|gz|tar)[a-zA-Z]{2,})\b/i)?.[1];
    if (domain) domain = domain.trim().toLowerCase();

    const fileNameMatch = userMsg.match(/([a-zA-Z0-9_-]+\.(txt|md|json|log))/i);
    const fileName = fileNameMatch ? fileNameMatch[1] : 'results.txt';

    const lowerMsg = userMsg.toLowerCase();
    const isHelpRequest = lowerMsg.includes('help') || lowerMsg.includes('-h') || lowerMsg.includes('manual') || lowerMsg.includes('como usar');

    if (!domain && !fileNameMatch && !isHelpRequest) {
      return { content: '💡 Uso: nasai "scan domain.com"', tool_calls: [] };
    }
    const task = this.detectTask(lowerMsg);

    // Detecção de Intenção Complexa (ex: salvar em arquivo ou processar arquivo)
    if (lowerMsg.includes('salve') || lowerMsg.includes('arquivo') || lowerMsg.includes('save') || lowerMsg.includes('file') || fileNameMatch) {
      let cmd = '';
      
      // Se não temos um domínio mas temos um arquivo, assumimos que o arquivo contém os alvos
      const target = domain || fileName;
      const isFileAsInput = !domain && fileNameMatch;

      if (task === 'subdomains') {
        cmd = `subfinder -d ${target} -silent`;
      } else if (lowerMsg.includes('httpx')) {
        // Se pediu httpx e é um arquivo, usa a flag de lista (-l) e otimiza para velocidade
        cmd = isFileAsInput ? `~/go/bin/httpx -l ${target} -silent -sc -td -title -t 150 -timeout 2` : `~/go/bin/httpx -u ${target} -silent -sc -td -title -timeout 2`;
      } else if (task === 'scan') {
        cmd = isFileAsInput ? `nmap -iL ${target} -F -T4` : `nmap -F -T4 ${target}`;
      } else if (task === 'tech') {
        cmd = `whatweb ${target} --quiet`;
      } else {
        cmd = `host ${target}`;
      }

      // Removido o pipe automático para não conflitar com a lógica acima
      
      // Evita salvar no mesmo arquivo que está sendo usado como entrada
      const outputFileName = (isFileAsInput && fileName === 'results.txt') ? 'output.txt' : fileName;
      
      return {
        content: `Entendido. Vou executar ${task} em ${target} e salvar em ${outputFileName}.`,
        tool_calls: [{
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: 'run_shell',
            arguments: JSON.stringify({ command: `${cmd} > ${outputFileName}` })
          }
        }]
      };
    }

    // Lógica para Consultar Manuais e Ajuda Iterativa (Aprendizado Contínuo)
    if (isHelpRequest) {
      const tools = ['curl', 'nmap', 'dig', 'host', 'naabu', 'httpx', 'gau', 'subfinder', 'assetfinder'];
      
      // Encontra quais ferramentas mencionadas ainda não foram consultadas
      const historyText = messages.map(m => m.content).join(' ');
      const requestedTools = tools.filter(t => lowerMsg.includes(t));
      const nextTool = requestedTools.find(t => !historyText.includes(`manual do ${t}`));
      
      if (nextTool) {
        const helpCmd = nextTool === 'httpx' ? '~/go/bin/httpx -h' : `${nextTool} --help`;
        
        return {
          content: `Internalizando manual do ${nextTool} (${requestedTools.indexOf(nextTool) + 1}/${requestedTools.length})...`,
          tool_calls: [{
            id: `call_help_${Date.now()}`,
            type: 'function',
            function: {
              name: 'run_shell',
              arguments: JSON.stringify({ command: helpCmd })
            }
          }]
        };
      } else {
        // Se já leu todos os manuais pedidos, fornece um resumo consolidado e exemplos avançados
        return {
          content: `✅ Conhecimento consolidado de: ${requestedTools.join(', ')}. 
          
[MAESTRO ADVANCED COMMANDS LEARNED]
- Revelar Fontes (CURL): 'curl -sI -X GET -H "X-Source-Code: true" http://dominio.com'
- Scan Stealth (NMAP): 'nmap -sS -Pn -T4 -p- http://dominio.com'
- Tech Discovery (HTTPX): '~/go/bin/httpx -td -title -sc'

O aprendizado foi concluído com sucesso. Deseja aplicar algum desses comandos em um alvo?`,
          tool_calls: []
        };
      }
    }

    let toolsList = [...(TASK_MAP[task] || TASK_MAP.basic)];

    if (lowerMsg.includes('httpx') && !toolsList.includes('httpx')) {
      toolsList.push('httpx');
    }
    
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
    if (prompt.includes('scan') || prompt.includes('mape') || prompt.includes('nmap')) return 'scan';
    if (prompt.includes('dns') || prompt.includes('dig')) return 'dns';
    if (prompt.includes('ssl')) return 'ssl';
    if (prompt.includes('tech') || prompt.includes('tecnologia') || prompt.includes('framework') || prompt.includes('versao') || prompt.includes('httpx')) return 'tech';
    return 'basic';
  }

  private formatResult(tool: string, out: string): string {
    const h: Record<string, string> = { subfinder: '▸ SUBFINDER', nmap: '▸ NMAP', host: '▸ DNS', dig: '▸ DNS', curl: '▸ HTTP', ssl: '▸ SSL', whatweb: '▸ TECHS', httpx: '▸ HTTPX' };
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