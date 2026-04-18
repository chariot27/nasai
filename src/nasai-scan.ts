import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const toolCommands: Record<string, string[]> = {
  full: [
    'nmap -sV -sC -Pn -T4 TARGET',
    'whois TARGET',
    'host TARGET',
    'curl -I https://TARGET',
  ],
  vuln: [
    'nmap -sV --script=vuln -Pn TARGET',
    'nikto -h https://TARGET',
    'curl -s https://TARGET | head -50',
  ],
  recon: [
    'nmap -sV -Pn TARGET',
    'subfinder -d TARGET -silent 2>/dev/null || echo "subfinder not found"',
    'curl -s https://TARGET -I',
  ],
  web: [
    'nmap -p 80,443 TARGET',
    'gobuster dir -u https://TARGET -w /usr/share/wordlists/dirb/common.txt -t 10 2>/dev/null || echo "gobuster not found"',
    'curl -s https://TARGET',
  ],
  scan: [
    'nmap -sV -T4 -Pn -p- TARGET',
    'nmap -sU TARGET',
  ],
  mitm: [
    'nmap --script=broadcast-arp-poisonerus -Pn TARGET',
    'arp -a TARGET 2>/dev/null || echo "arp not available"',
  ],
  brute: [
    'hydra -L /usr/share/wordlists/usernames.txt -P /usr/share/wordlists/passwords.txt TARGET ssh 2>/dev/null || echo "hydra not found"',
  ],
  cloud: [
    'curl -s https://TARGET',
    'nslookup _aws.amazonaws.com.TARGET 2>/dev/null || echo "aws check not available"',
  ],
  api: [
    'curl -s https://TARGET/api/v1',
    'curl -s https://TARGET/graphql',
  ],
  ad: [
    'nmap -p 53,88,135,139,389,445,464,636 TARGET',
  ],
  iot: [
    'nmap -sV -p 22,23,80,443,8080 TARGET',
  ],
  audit: [
    'lynis audit system 2>/dev/null || echo "lynis not found"',
  ],
  malware: [
    'rkhunter --check 2>/dev/null || echo "rkhunter not found"',
  ],
  ssl: [
    'testssl TARGET 2>/dev/null || echo "testssl not found"',
    'openssl s_client -connect TARGET:443',
  ],
};

const actionCommands: Record<string, string[]> = {
  full: [
    'curl -I -m 10 https://TARGET',
    'whois TARGET',
    'host TARGET',
  ],
  vuln: [
    'curl -s -m 10 https://TARGET',
    'host TARGET',
  ],
  recon: [
    'host TARGET',
    'whois TARGET',
    'dig +short TARGET',
  ],
  web: [
    'curl -s -m 10 https://TARGET',
    'curl -I -m 10 https://TARGET',
  ],
};

async function runCommand(cmd: string, target: string, useProxy: boolean = false): Promise<string> {
  const domain = target.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const fullCmd = cmd.replace(/TARGET/g, domain).replace(/URL/g, target) + ' 2>&1';
  const timeout = fullCmd.includes('nmap') ? 60000 : 30000;
  
  try {
    const { stdout, stderr } = await execAsync(fullCmd, { timeout });
    return stdout || stderr || '';
  } catch (err: any) {
    return '[ERROR] ' + (err.message || 'failed').substring(0, 100);
  }
}

async function scanTarget(intent: string, target: string) {
  const targetClean = target.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const cmds = actionCommands[intent] || actionCommands.full;
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 SCAN: ${intent.toUpperCase()} → ${targetClean}`);
  console.log(`${'═'.repeat(60)}\n`);
  
  const results: string[] = [];
  const vulns: string[] = [];
  
  for (const cmd of cmds) {
    const tool = cmd.split(' ')[0];
    process.stdout.write(`▶ ${tool}... `);
    const output = await runCommand(cmd, target, false);
    const lines = output.split('\n').filter(l => l.trim()).slice(0, 20);
    
    if (output.includes('[ERROR]')) {
      console.log('❌');
    } else if (output.includes('vuln') || output.includes('Vulnerability') || output.includes('CVE')) {
      console.log('⚠️ Vulnerable');
      vulns.push(...lines);
    } else {
      console.log('✅');
    }
    
    results.push(...lines);
  }
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 RELATÓRIO: ${targetClean}`);
  console.log(`${'─'.repeat(60)}`);
  
  if (vulns.length > 0) {
    console.log(`\n⚠️ VULNERABILIDADES ENCONTRADAS:`);
    for (const v of vulns.slice(0, 10)) {
      console.log(`  • ${v.substring(0, 80)}`);
    }
  } else {
    console.log(`\n✅ Nenhuma vulnerabilidade obvious encontrada`);
  }
  
  console.log(`\n📊 DETALHES:`);
  for (const r of results.slice(0, 15)) {
    console.log(`  ${r.substring(0, 80)}`);
  }
  
  console.log(`\n${'═'.repeat(60)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const intent = args[0] || 'full';
  const target = args[1] || 'example.com';
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       NASAI-MAESTRO-7.0: SMART PENTEST              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  await scanTarget(intent, target);
}

main();