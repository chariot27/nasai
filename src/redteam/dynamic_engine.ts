import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import { ZeroDayHunterEngine, ZeroDayConfig } from './zero_day_engine';

const execAsync = promisify(exec);

export interface ReconContext {
  isAlive: boolean;
  latencyMs: number;
  hasWaf: boolean;
  stealthMode: boolean;
}

export class DynamicRedTeamEngine {
  
  private generateCustomFix(failedCmd: string, errorMsg: string): string {
    if (failedCmd.includes('nmap')) {
      return failedCmd.replace('-sV', '-sT').replace('-oN nmap.txt', '').replace('-O', '');
    }
    if (failedCmd.includes('subfinder')) {
      const domainMatch = failedCmd.match(/-d\s+([^\s]+)/);
      if (domainMatch) return `assetfinder --subs-only ${domainMatch[1]}`;
    }
    if (failedCmd.includes('httpx')) {
      return failedCmd.replace('-silent -sc -title', '-silent');
    }
    if (failedCmd.includes('nuclei')) {
      return failedCmd.replace('critical,cves,vulnerabilities', 'critical');
    }
    // Tenta apenas a base do comando
    return failedCmd.split('|')[0].trim();
  }

  // Helper method for concurrent workers
  private async workerExecution(originalCmd: string, target: string): Promise<void> {
    let cmd = originalCmd;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const cmdBase = cmd.split(' ')[0];
        // Extrai o arquivo de saída se houver redirecionamento '>'
        const parts = cmd.split(' > ');
        const actualCmd = parts[0];
        const outputFile = parts[1] || `${cmdBase}_${target}_fallback.txt`;

        console.log(`[WORKER INICIADO] ${cmdBase} -> ${actualCmd}`);
        
        await new Promise<void>((resolve, reject) => {
          const child = spawn('bash', ['-c', actualCmd]);
          const writeStream = fs.createWriteStream(outputFile);
          
          child.stdout.pipe(writeStream);
          child.stderr.pipe(writeStream);

          child.on('close', (code) => {
            writeStream.end();
            if (code === 0) {
              console.log(`[WORKER SUCESSO] Comando concluído: ${cmdBase}`);
              resolve();
            } else {
              reject(new Error(`Exit code ${code}`));
            }
          });

          child.on('error', (err) => {
            writeStream.end();
            reject(err);
          });

          // Cleanup on process exit
          process.on('SIGINT', () => {
            child.kill();
            writeStream.end();
          });
        });
        
        return; // Success, exit worker
      } catch (e: any) {
        attempts++;
        console.log(`[WORKER ERRO] Falha no comando: ${cmd}`);
        
        const fixCmd = this.generateCustomFix(cmd, e.message);
        
        if (fixCmd === cmd || attempts >= maxAttempts) {
          console.log(`[WORKER ABORTADO] Esgotadas as tentativas ou impossível corrigir: ${cmd.split(' ')[0]}`);
          return; // Skip command
        }
        
        console.log(`[AUTO-CORREÇÃO SILENCIOSA] Nova tentativa ${attempts}/${maxAttempts}: ${fixCmd}`);
        cmd = fixCmd;
      }
    }
  }

  private async fastInternalChecks(target: string): Promise<void> {
    console.log(`[INFO] Executando fast-checks internos (Node.js)...`);
    const filesToTest = ['/.env', '/.git/config'];
    
    for (const file of filesToTest) {
      try {
        const url = `https://${target}${file}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const start = Date.now();
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.status === 200) {
          const text = await res.text();
          // Heurística simples para confirmar se não é um 404 customizado retornando 200
          if (text.includes('CORE_') || text.includes('[core]') || text.includes('APP_') || text.includes('repository')) {
            console.log(`[ALERTA CRÍTICO] Arquivo sensível exposto encontrado em ${Date.now() - start}ms: ${url}`);
          }
        }
      } catch (e) {
        // Ignora erros de rede na checagem rápida
      }
    }
    console.log(`[INFO] Fast-checks internos concluídos.`);
  }

  private assembleCommands(target: string, context: ReconContext): string[] {
    const commands: string[] = [];
    
    // Simulação de raciocínio lógico (LLM) gerando os comandos iterativamente
    console.log(`[THINKING] Analisando contexto de recon...`);
    console.log(`   -> Target Alive: ${context.isAlive}`);
    console.log(`   -> WAF Presumido: ${context.hasWaf}`);
    console.log(`   -> Stealth Mode: ${context.stealthMode}`);

    // Nota: Nmap pesado removido para priorizar velocidade.

    // Montagem do Subfinder
    let subCmd = `subfinder -d ${target}`;
    if (context.stealthMode) subCmd += ` -silent`;
    if (context.isAlive) subCmd += ` -recursive`;
    subCmd += ` > subfinder_${target}.txt`;
    commands.push(subCmd);

    // Montagem do Nuclei
    if (context.isAlive) {
      let nucleiCmd = `nuclei -u ${target}`;
      if (context.hasWaf) {
        nucleiCmd += ` -t critical -rl 10`; // Rate limit baixo para contornar bloqueio
      } else {
        nucleiCmd += ` -t critical,cves,vulnerabilities`;
      }
      if (context.stealthMode) nucleiCmd += ` -silent`;
      nucleiCmd += ` -nc > nuclei_${target}.txt`;
      commands.push(nucleiCmd);
    }

    // Outras ferramentas auxiliares
    commands.push(`whatweb -a 1 ${target} > whatweb_${target}.txt`);
    
    if (!context.stealthMode) {
      commands.push(`wafw00f https://${target} -a > waf_${target}.txt`);
    }

    return commands;
  }

  async runDynamicTests(target: string, live: boolean = false): Promise<void> {
    if (!live || target.includes('mock') || target.includes('example')) {
      console.log(`[SIMULAÇÃO] Domínio de teste detectado. Execução dinâmica simulada.`);
      return;
    }

    console.log(`\n======================================================`);
    console.log(`INICIANDO TESTE 100% DINÂMICO E CONCORRENTE: ${target}`);
    console.log(`======================================================\n`);

    // Fase 1: Recon Inicial
    console.log(`[FASE 1] Realizando Recon inicial básico...`);
    
    const context: ReconContext = {
      isAlive: false,
      latencyMs: 50,
      hasWaf: false, // Simulado, poderia usar wafw00f antes
      stealthMode: false
    };

    try {
      const start = Date.now();
      await execAsync(`ping -c 1 -W 2 ${target}`);
      context.latencyMs = Date.now() - start;
      context.isAlive = true;
      console.log(`[FASE 1] Alvo ativo (Ping OK). Latência: ${context.latencyMs}ms`);
    } catch {
      console.log(`[FASE 1] Falha no Ping. Testando resolução DNS...`);
      try {
        await execAsync(`host ${target}`);
        context.isAlive = true;
      } catch {
        console.log(`[FASE 1] Alvo possivelmente offline.`);
      }
    }

    // WAF Detection Real (early)
    if (context.isAlive) {
      console.log(`[FASE 1] Detectando WAF para ajustar payloads...`);
      try {
        const { stdout } = await execAsync(`wafw00f https://${target} -a`);
        if (stdout.toLowerCase().includes('is behind') || stdout.toLowerCase().includes('detected')) {
          context.hasWaf = true;
          console.log(`[FASE 1] WAF Detectado! Ajustando estratégia...`);
        }
      } catch (e) {
        console.log(`[FASE 1] WAF detection indisponível ou falhou.`);
      }
    }

    // Fase Intermediária: Fast Checks
    await this.fastInternalChecks(target);

    // Fase 2: Geração Dinâmica de Ferramentas
    console.log(`\n[FASE 2] Escrevendo e montando comandos dinamicamente...`);
    const commandsToRun = this.assembleCommands(target, context);

    console.log(`[FASE 2] ${commandsToRun.length} comandos formados e prontos para injeção concorrente.`);

    // Fase 3: Execução Assíncrona, Paralela e Auto-corrigível
    console.log(`\n[FASE 3] Disparando todas as ferramentas concorrentemente...`);
    console.log(`------------------------------------------------------\n`);

    const promises = commandsToRun.map(cmd => this.workerExecution(cmd, target));

    // Aguarda todas as execuções paralelas terminarem
    await Promise.all(promises);

    // Fase 4: Opcional 0-Day Fuzzing Hunt
    if (!context.stealthMode && live) {
      console.log(`\n[FASE 4] Engajando modo agressivo: 0-DAY HUNTER (Nasai Maestro 9.0)`);
      const zeroDayConfig: ZeroDayConfig = {
        target: target,
        port: 80, // Default for now, we could parse from target
        isHttps: false,
        intensity: 'aggressive'
      };
      
      const zeroDayEngine = new ZeroDayHunterEngine(zeroDayConfig);
      const anomalies = await zeroDayEngine.run();
      
      if (anomalies.length > 0) {
        console.log(`\n[ALERTA CRÍTICO 0-DAY] Anomalias detectadas no alvo ${target}:`);
        console.log(JSON.stringify(anomalies, null, 2));
      } else {
        console.log(`\n[FASE 4] Nenhuma anomalia de protocolo detectada pelo fuzzer.`);
      }
    }

    console.log(`\n======================================================`);
    console.log(`TESTE DINÂMICO FINALIZADO PARA: ${target}`);
    console.log(`======================================================\n`);
  }
}
