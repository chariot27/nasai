import * as readline from 'node:readline';
import * as fs from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

const intentCommands: Record<string, string[]> = {
  scan: ['nmap -sV -Pn TARGET', 'host TARGET'],
  vuln: ['nuclei -u TARGET -t ssl,vulnerabilities,tech -silent -nc -rl 50 -c 10', 'curl -s -m 10 https://TARGET'],
  recon: ['subfinder -d TARGET -silent -recursive', 'nmap -sV -Pn TARGET', 'host TARGET', 'whois TARGET'],
  web: ['httpx https://TARGET', 'wafw00f https://TARGET -a', 'curl -s -m 10 https://TARGET', 'nmap -sV -p 80,443 TARGET'],
  mitm: ['arp -a TARGET'],
  brute: ['hydra -L /dev/null -P /dev/null TARGET ssh 2>&1'],
  cloud: ['subfinder -d TARGET -silent'],
  api: ['curl -s https://TARGET/api', 'curl -s https://TARGET/graphql'],
  ad: ['host -t SRV _ldap._tcp.TARGET'],
  iot: ['nmap -sV -p 22,23,80,443,8080 TARGET'],
  audit: ['nuclei -u TARGET -t security-headers -silent -nc -rl 50 -c 10'],
  malware: ['nuclei -u TARGET -t malware -silent -nc -rl 50 -c 10'],
  ssl: ['openssl s_client -connect TARGET:443 2>&1 | head -10', 'nuclei -u TARGET -t ssl -silent -nc -rl 50 -c 10'],
full: [
    'subfinder -d TARGET -silent -recursive',
    'nmap -sV -Pn TARGET',
    'nuclei -u TARGET -t ssl,vulnerabilities,tech -silent -nc -rl 50 -c 10',
    'wafw00f https://TARGET -a',
    'host TARGET',
    'whois TARGET',
    'curl -s -m 10 https://TARGET',
    'curl -I -m 10 https://TARGET',
    'dig +short TARGET',
    'python3 /tmp/SecretFinder/SecretFinder.py -i https://TARGET -o /tmp/secretfinder_TARGET.txt',
  ],
};

async function runCmd(cmd: string, target: string): Promise<{tool: string, result: string}> {
  const domain = target.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const tool = cmd.split(' ')[0];
  let timeout = 20000;
  if (cmd.includes('nmap') || cmd.includes('nuclei')) timeout = 60000;
  if (cmd.includes('subfinder')) timeout = 60000;
  if (cmd.includes('wafw00f')) timeout = 30000;
  
  const fullCmd = cmd.replace(/TARGET/g, domain);
  const customPath = '/home/noname/go/bin:/home/noname/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:' + process.env.PATH;
  
  try {
    const { stdout, stderr } = await execAsync(fullCmd, { timeout, env: { ...process.env, PATH: customPath } });
    let result = (stdout || stderr || '').trim();
    
    if (result.length < 3) return { tool, result: '[SKIP] empty' };
    
    const lines = result.split('\n').filter(l => l.trim());
    if (lines.length > 15) result = lines.slice(0, 15).join('\n') + `\n... (${lines.length - 15} more)`;
    
    return { tool, result };
  } catch (err: any) {
    const errMsg = err.message || err.stderr || String(err);
    console.error(`[DEBUG] ${tool} failed:`, errMsg);
    return { tool, result: '[ERROR] ' + errMsg.substring(0, 100) };
  }
}

function generateNucleiTemplate(server: string): string {
  const templates: Record<string, string> = {
    'cloudflare': `- type: http
  name: cloudflare-waf-detection
  severity: low
  http:
    method: GET
    path:
      - /
    headers:
        X-Host: test.example.com
  matchers:
    - type: word
      words:
        - "Attention Required"
        - Cloudflare`,
    'nginx': `- type: http
  name: nginx-version
  severity: medium
  http:
    method: GET
    path:
      - /nginx-status
  matchers:
    - type: regex
      regex:
        - "nginx"`,
  };
  for (const [key, tmpl] of Object.entries(templates)) {
    if (server.toLowerCase().includes(key)) return tmpl;
  }
  return '';
}

async function runAllParallel(intent: string, target: string) {
  const cmds = intentCommands[intent] || intentCommands.full;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 FULL SCAN → ${target} (${cmds.length} tools)`);
  console.log(`${'═'.repeat(60)}\n`);
  
  const results = await Promise.all(cmds.map(cmd => runCmd(cmd, target)));
  
  // Find subdomains and run httpx/secretfinder on them
  const subfinderResult = results.find(r => r.tool === 'subfinder');
  let subdomainResults: {tool: string, result: string}[] = [];
  
  if (subfinderResult && !subfinderResult.result.includes('[ERROR]') && !subfinderResult.result.includes('[SKIP]')) {
    const subdomains = subfinderResult.result.split('\n').filter(s => s.includes('.')).slice(0, 5);
    if (subdomains.length > 0) {
      console.log(`\n📂 SUBDOMAINS → httpx + secretfinder (${subdomains.length} alvos)`);
      console.log(`${'─'.repeat(60)}\n`);
      
      const subCmds = [
        ...subdomains.map(s => `httpx ${s}`),
        ...subdomains.map(s => `python3 /tmp/SecretFinder/SecretFinder.py -i https://${s} -o /tmp/secret-${s.replace(/\./g,'-')}.txt 2>&1 && cat /tmp/secret-${s.replace(/\./g,'-')}.txt`)
      ];
      
      subdomainResults = await Promise.all(subCmds.map(cmd => runCmd(cmd, target)));
    }
  }
  
  console.log(`${'═'.repeat(60)}`);
  console.log(`📋 RELATÓRIO: ${target}`);
  console.log(`${'═'.repeat(60)}\n`);
  
  console.log(`┌${'─'.repeat(58)}┐`);
  console.log(`│ ${'TOOL'.padEnd(15)} │ ${'STATUS'.padEnd(10)} │ ${'RESULTADO'.padEnd(30)}│`);
  console.log(`├${'─'.repeat(58)}┤`);
  
  const findings: string[] = [];
  
  for (const r of results) {
    const status = r.result.includes('[ERROR]') ? '❌' : r.result.includes('[SKIP]') ? '⏭' : '✅';
    const info = r.result.substring(0, 28).replace(/\n/g, ' ');
    console.log(`│ ${r.tool.padEnd(15)} │ ${status.padEnd(10)} │ ${info.padEnd(30)}│`);
    
    if (!r.result.includes('[ERROR]') && !r.result.includes('[SKIP]')) {
      findings.push(...r.result.split('\n').filter(l => 
        /port|version|server|title|cloudflare|apache|nginx|aws|ssl|tls|certificate|cve/i.test(l)
      ));
    }
  }
  
  // Show subdomain results
  if (subdomainResults.length > 0) {
    console.log(`├${'─'.repeat(58)}┤`);
    for (const r of subdomainResults) {
      const status = r.result.includes('[ERROR]') ? '❌' : r.result.includes('[SKIP]') ? '⏭' : '✅';
      const info = r.result.substring(0, 28).replace(/\n/g, ' ');
      console.log(`│ ${r.tool.padEnd(15)} │ ${status.padEnd(10)} │ ${info.padEnd(30)}│`);
    }
  }
  
  console.log(`└${'─'.repeat(58)}┘`);
  
  console.log(`\n⚠️ ACHADOS/INFO:`);
  if (findings.length > 0) {
    for (const f of [...new Set(findings)].slice(0, 15)) {
      console.log(`  • ${f.substring(0, 70)}`);
    }
  } else {
    console.log(`  Nenhum achado específico`);
  }
  
  // Generate nuclei template from server info
  const serverInfo = findings.find(f => /server:/i.test(f)) || '';
  const server = serverInfo.match(/server:\s*([^\\n]+)/i)?.[1] || '';
  if (server) {
    const tmpl = generateNucleiTemplate(server);
    if (tmpl) {
      const tmplPath = `/tmp/nasai-${target}.yaml`;
      fs.writeFileSync(tmplPath, tmpl);
      console.log(`\n📝 Template Nuclei: ${tmplPath}`);
      console.log(`   nuclei -t ${tmplPath} -u https://${target}\n`);
    }
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Scan completo!`);
  console.log(`${'═'.repeat(60)}\n`);

  await selfAnalyzeAndCorrect(results, subdomainResults, target);
}

async function selfAnalyzeAndCorrect(results: any[], subdomainResults: any[], target: string): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       AUTO-ANÁLISE DO SISTEMA                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const successTools = results.filter(r => !r.result.includes('[ERROR]') && !r.result.includes('[SKIP]')).map(r => r.tool);
  const failedTools = results.filter(r => r.result.includes('[ERROR]')).map(r => r.tool);
  const skippedTools = results.filter(r => r.result.includes('[SKIP]')).map(r => r.tool);

  console.log('📊 RELATÓRIO DE EXECUÇÃO:');
  console.log(`  ✅ Sucesso: ${successTools.length} - [${successTools.join(', ')}]`);
  console.log(`  ❌ Falhou: ${failedTools.length} - [${failedTools.join(', ')}]`);
  console.log(`  ⏭️  Pulado: ${skippedTools.length} - [${skippedTools.join(', ')}]`);

  const accuracy = Math.round((successTools.length / results.length) * 100);
  console.log(`\n🎯 Accuracy: ${accuracy}%`);

  console.log('\n📋 ANÁLISE DOS RESULTADOS:');

  if (failedTools.length > 0) {
    console.log('\n  [FALHAS DETECTADAS]');
    for (const tool of failedTools) {
      const result = results.find(r => r.tool === tool);
      console.log(`    • ${tool}: ${result.result.substring(0, 50)}`);
    }
  }

  if (skippedTools.length > 0) {
    console.log('\n  [TOOLS PULADOS]');
    for (const tool of skippedTools) {
      console.log(`    • ${tool}: resultado vazio ou domínio nãorespondeu`);
    }
  }

  console.log('\n💡 SUGESTÕES DE MELHORIA:');
  const suggestions: string[] = [];

  if (failedTools.includes('nuclei')) {
    suggestions.push('  • Nuclei falhou - tentar com templates específicos ou aumentar timeout');
  }
  if (failedTools.includes('python3') || skippedTools.includes('subfinder')) {
    suggestions.push('  • SecretFinder/Subfinder pode estar com problemas de rede ou timeout');
  }
  if (successTools.length < 5) {
    suggestions.push('  • Poucos tools funcionaram - verificar conectividade de rede');
  }
  if (accuracy < 70) {
    suggestions.push('  • Accuracybaixo - revisar comandos e dependências dos tools');
  }

  if (suggestions.length === 0) {
    console.log('  • Sistema funcionou bem! Nenhuma correção necessária.');
  } else {
    for (const s of suggestions) console.log(s);
  }

  console.log('\n' + '='.repeat(60));
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔄 Deseja que o sistema se auto-corrija e rode novamente? (s/n): ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'sim') {
        console.log('\n🔄 Executando correção e re-scan...\n');
        runAllParallel('full', target);
      } else {
        console.log('\n👋 Scan encerrado pelo usuário.\n');
        process.exit(0);
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const intent = args[0] || 'full';
  const target = args[1] || 'example.com';
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       NASAI-MAESTRO-7.0: PARALLEL PENTEST              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const results = await runAllParallel(intent, target);
}

main();