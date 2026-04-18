import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface RedTeamData {
  category: string;
  difficulty: string;
  prompt: string;
  expected_tools: string[];
  vulnerability: string;
  solution_approach: string;
}

const RED_TEAM_SOURCES = [
  { url: 'https://raw.githubusercontent.com/ctf-wiki/ctf-wiki/master/index.md', category: 'ctf' },
  { url: 'https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/README.md', category: 'payloads' },
  { url: 'https://raw.githubusercontent.com/OWASP/Web-Security-Testing-Guide/master/README.md', category: 'owasp' },
];

const PENTEST_PROMPTS = {
  easy: [
    "Scan {domain} with nmap",
    "Check DNS records for {domain}",
    "Find SSL/TLS info on {domain}",
    "Check HTTP headers on {domain}",
    "List directory with gobuster on {domain}",
    "Test SQL injection with sqlmap on {domain}/login",
    "Check subdomain with subfinder for {domain}",
    "Find technologies on {domain}",
    "Test XSS on {domain}/search",
    "Check SSL certificate on {domain}",
  ],
  medium: [
    "Exploit SQL injection on {domain}/admin to get shell",
    "Find and exploit stored XSS on {domain}/comment",
    "Brute force login on {domain}/admin",
    "Exploit file upload on {domain}/upload",
    "Perform wordlist attack on {domain}/wp-login",
    "Exploit IDOR vulnerability on {domain}/profile",
    "Find SSRF on {domain}/api",
    "Exploit broken auth on {domain}/login",
    "Test CSRF on {domain}/transfer",
    "Exploit XXE on {domain}/upload",
  ],
  hard: [
    "Exploit prototype pollution on {domain}/api/admin",
    "Bypass WAF and exploit SQL injection on {domain}/search",
    "Chain multiple vulnerabilities for RCE on {domain}",
    "Exploit deserialization on {domain}/api/rpc",
    "Find and exploit blind SQL injection on {domain}/auth",
    "Bypass authentication with OAuth on {domain}",
    "Exploit race condition on {domain}/transfer",
    "Chain SSRF to internal network on {domain}",
    "Exploit JWT none algorithm on {domain}/api",
    "Find 0-day on {domain}/legacy",
  ]
};

const VULNERABILITIES = {
  easy: ['Information Disclosure', 'Missing SPF', 'Open Ports', 'Weak SSL', 'Directory Listing'],
  medium: ['SQL Injection', 'XSS Stored', 'Broken Auth', 'IDOR', 'File Upload', 'CSRF'],
  hard: ['RCE', 'Deserialization', 'SSRF', 'JWT Bypass', 'Prototype Pollution', 'Race Condition', '0-day']
};

async function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'target.com';
  }
}

function generateTestCases(): RedTeamData[] {
  const cases: RedTeamData[] = [];
  const domains = ['bancocn.com', 'example.com', 'testphp.vulnweb.com', 'test.owasp.org'];
  
  let id = 1;
  
  for (const diff of ['easy', 'medium', 'hard']) {
    const prompts = PENTEST_PROMPTS[diff as keyof typeof PENTEST_PROMPTS];
    const vulns = VULNERABILITIES[diff as keyof typeof VULNERABILITIES];
    const count = diff === 'easy' ? 400 : diff === 'medium' ? 400 : 200;
    
    for (let i = 0; i < count; i++) {
      const domain = domains[i % domains.length];
      const prompt = prompts[i % prompts.length].replace('{domain}', domain);
      
      cases.push({
        category: diff === 'easy' ? 'recon' : diff === 'medium' ? 'vulnerability' : 'exploitation',
        difficulty: diff,
        prompt,
        expected_tools: getToolsForPrompt(prompt),
        vulnerability: vulns[i % vulns.length],
        solution_approach: getSolution(prompt)
      });
    }
  }
  
  return cases;
}

function getToolsForPrompt(prompt: string): string[] {
  const tools: string[] = ['run_shell'];
  if (prompt.includes('nmap')) tools.push('nmap');
  if (prompt.includes('dns') || prompt.includes('dig')) tools.push('dig');
  if (prompt.includes('subdomain')) tools.push('subfinder');
  if (prompt.includes('sql')) tools.push('sqlmap');
  if (prompt.includes('brute') || prompt.includes('wordlist')) tools.push('hydra');
  if (prompt.includes('directory') || prompt.includes('list')) tools.push('gobuster');
  return tools;
}

function getSolution(prompt: string): string {
  if (prompt.includes('scan') || prompt.includes('nmap')) return 'Use nmap -sV -sC to enumerate';
  if (prompt.includes('dns')) return 'Use dig or host for DNS enumeration';
  if (prompt.includes('sql')) return 'Use sqlmap with --risk --level flags';
  if (prompt.includes('xss')) return 'Use XSS payload list and automate';
  if (prompt.includes('subdomain')) return 'Use subfinder -d for subdomain enum';
  return 'Use appropriate tool for the vulnerability type';
}

async function collectRedTeamData(): Promise<RedTeamData[]> {
  console.log('🌐 Collecting Red Team data from sources...');
  
  const data: RedTeamData[] = [];
  
  for (const source of RED_TEAM_SOURCES) {
    try {
      console.log(`  Fetching: ${source.url}`);
      const content = await fetch(source.url);
      console.log(`    Got ${content.length} bytes`);
    } catch (e) {
      console.log(`    Error: ${e}`);
    }
  }
  
  const generatedCases = generateTestCases();
  console.log(`\n✅ Generated ${generatedCases.length} test cases`);
  
  return generatedCases;
}

async function main() {
  const outputPath = path.join(__dirname, 'redteam_cases.json');
  
  const cases = await collectRedTeamData();
  
  fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
  
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  for (const c of cases) byDiff[c.difficulty as keyof typeof byDiff]++;
  console.log(`\n📊 Distribution:`);
  console.log(`   Easy:   ${byDiff.easy}`);
  console.log(`   Medium: ${byDiff.medium}`);
  console.log(`   Hard:   ${byDiff.hard}`);
}

main().catch(console.error);