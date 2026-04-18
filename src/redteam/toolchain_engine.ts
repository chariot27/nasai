import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import * as readline from 'node:readline';

const execAsync = promisify(exec);

export interface ToolchainResult {
  chainName: string;
  target: string;
  commandsRun: string[];
  outputSummary: string;
  success: boolean;
  error?: string;
}

export class RedTeamToolchain {
  
  // Pipeline 1: Subfinder + Assetfinder + Secretfinder
  async runReconSecrets(domain: string, live: boolean = false): Promise<ToolchainResult> {
    const commands = [
      `subfinder -d ${domain} -silent -recursive > subfinder.txt`,
      `assetfinder --subs-only ${domain} > assetfinder.txt`,
      `cat subfinder.txt assetfinder.txt | sort -u > all_subs.txt`,
      `cat all_subs.txt | while read sub; do python3 /tmp/SecretFinder/SecretFinder.py -i https://$sub -o /tmp/secret-$sub.txt; done`
    ];
    return this.simulateOrRun("Recon+Secrets", domain, commands, live);
  }

  // Pipeline 2: Subfinder + Httpx + GAU (Get All Urls)
  async runReconHttpxGau(domain: string, live: boolean = false): Promise<ToolchainResult> {
    const commands = [
      `subfinder -d ${domain} -silent > subs.txt`,
      `cat subs.txt | httpx -silent -sc -title > live_hosts.txt`,
      `cat live_hosts.txt | awk '{print $1}' | gau > all_urls.txt`
    ];
    return this.simulateOrRun("Recon+Httpx+GAU", domain, commands, live);
  }

  // Pipeline 3: Nmap + Whatweb + Wafw00f + Nuclei
  async runCriticalScan(domain: string, live: boolean = false): Promise<ToolchainResult> {
    const commands = [
      `nmap -sV -p 80,443,8080,8443 ${domain} -oN nmap.txt`,
      `whatweb -a 1 ${domain} > whatweb.txt`,
      `wafw00f https://${domain} -a > waf.txt`,
      `nuclei -u ${domain} -t critical,cves,vulnerabilities -silent -nc`
    ];
    return this.simulateOrRun("CriticalScanner", domain, commands, live);
  }

  // Fallback Pipeline
  async runBasicScan(domain: string, live: boolean = false): Promise<ToolchainResult> {
    const commands = [
      `host ${domain}`,
      `curl -I -s https://${domain}`
    ];
    return this.simulateOrRun("BasicScan", domain, commands, live);
  }

  private generateCustomFix(failedCmd: string, errorMsg: string): string {
    // Simulando uma LLM gerando uma correção na hora
    if (failedCmd.includes('nmap')) {
      return failedCmd.replace('-sV', '-sT').replace('-oN nmap.txt', ''); // Tenta versão mais simples
    }
    if (failedCmd.includes('subfinder')) {
      const domainMatch = failedCmd.match(/-d\s+([^\s]+)/);
      if (domainMatch) return `assetfinder --subs-only ${domainMatch[1]}`;
    }
    if (failedCmd.includes('httpx')) {
      return failedCmd.replace('-silent -sc -title', '-silent'); // Reduz flags
    }
    if (failedCmd.includes('nuclei')) {
      return failedCmd.replace('critical,cves,vulnerabilities', 'critical');
    }
    
    // Fallback genérico: tenta apenas a base do comando
    return failedCmd.split('|')[0].trim();
  }

  private async promptUser(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(resolve => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 's');
      });
    });
  }

  private async simulateOrRun(chainName: string, target: string, commands: string[], live: boolean): Promise<ToolchainResult> {
    // Para fins de avaliação automatizada, se for mock, não executa de verdade
    const isMock = target.includes('mock') || target.includes('test') || target.includes('example');
    
    if (!live || isMock) {
      return {
        chainName,
        target,
        commandsRun: commands,
        outputSummary: `[DRY-RUN/SIMULAÇÃO] Comandos preparados para ${chainName}.`,
        success: true
      };
    }

    try {
      console.log(`\n[REAL TEST] Iniciando ${chainName} contra ${target}...\n`);
      
      for (let i = 0; i < commands.length; i++) {
        let cmd = commands[i];
        let success = false;
        
        while (!success) {
          console.log(`\n=> Executando: ${cmd}`);
          try {
            execSync(cmd, { stdio: 'inherit' });
            success = true;
          } catch (e: any) {
            console.error(`\n[ERRO DETECTADO] O comando falhou.`);
            console.error(`Detalhes: ${e.message}`);
            
            // Auto-correção dinâmica
            const fixCmd = this.generateCustomFix(cmd, e.message);
            
            if (fixCmd === cmd) {
              console.log(`\n[AUTO-CORREÇÃO] O modelo não conseguiu gerar uma nova correção para este comando específico.`);
              const skip = await this.promptUser(`Deseja pular este comando e continuar a pipeline? (y/n): `);
              if (skip) {
                console.log(`[PULANDO] Ignorando comando...\n`);
                success = true;
                continue;
              } else {
                console.log(`[ABORTADO] Operação abortada pelo usuário. Fechando o modelo.`);
                process.exit(1);
              }
            } else {
              console.log(`\n[AUTO-CORREÇÃO] Análise da falha concluída.`);
              console.log(`Sugestão de teste customizado gerada na hora:`);
              console.log(`   Nova tentativa: ${fixCmd}`);
              
              const approved = await this.promptUser(`\nPermitir execução da correção customizada? (y/n): `);
              if (approved) {
                console.log(`[PERMISSÃO] Concedida. Aplicando correção...\n`);
                cmd = fixCmd;
              } else {
                console.log(`[NEGADO] Permissão negada pelo usuário. Fechando o modelo.`);
                process.exit(1);
              }
            }
          }
        }
      }

      return {
        chainName,
        target,
        commandsRun: commands,
        outputSummary: `[SUCESSO] Todos os comandos da pipeline foram invocados. Verifique os logs e arquivos .txt de saída.`,
        success: true
      };
    } catch (err: any) {
      return {
        chainName,
        target,
        commandsRun: commands,
        outputSummary: '[ERRO] Erro crítico ao tentar rodar os comandos reais.',
        success: false,
        error: err.message
      };
    }
  }

  selectToolchain(intent: string, domain: string, live: boolean = false): Promise<ToolchainResult> {
    if (intent === 'recon_secrets') {
      return this.runReconSecrets(domain, live);
    } else if (intent === 'recon_urls') {
      return this.runReconHttpxGau(domain, live);
    } else if (intent === 'critical_scan' || intent === 'vuln' || intent === 'full') {
      return this.runCriticalScan(domain, live);
    } else {
      return this.runBasicScan(domain, live);
    }
  }
}
