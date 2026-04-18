import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

interface TestCase {
  id: number;
  input: string;
  expectedIntent: string;
  expectedTools: string[];
  category: string;
  isZeroDay: boolean;
  severity: string;
}

interface TestResult {
  testId: number;
  input: string;
  detectedIntent: string;
  expectedIntent: string;
  correctIntent: boolean;
  toolsSelected: string[];
  expectedTools: string[];
  correctTools: boolean[];
  accuracy: number;
  isZeroDay: boolean;
}

class MassiveEvaluator {
  private testCases: TestCase[] = [];
  private results: TestResult[] = [];
  private modelVersion = '4.0';

  constructor() {
    this.ensureDataDir();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async generateTestCases(count: number): Promise<void> {
    console.log(`\n🔧 Gerando ${count} casos de teste...`);

    const intents = [
      'full', 'recon', 'vuln', 'scan', 'dns', 'ssl', 'tech', 
      'web', 'cms', 'mitm', 'brute', 'whois', 'headers', 
      'email', 'audit', 'privesc', 'malware'
    ];

    const domains = [
      'example.com', 'test.com', 'demo.com', 'site.com', 'web.com',
      'example.org', 'test.org', 'demo.net', 'site.net', 'web.net',
      'google.com', 'microsoft.com', 'amazon.com', 'apple.com',
      'facebook.com', 'twitter.com', 'linkedin.com', 'github.com',
      'example.io', 'test.io', 'demo.io', 'site.io'
    ];

    const templates: Record<string, string[]> = {
      full: ['full {d}', 'complete {d}', 'all {d}', 'full scan {d}', 'pentest {d}'],
      recon: ['recon {d}', 'subdomain {d}', 'subdomains {d}', 'enum {d}', 'find subdomains {d}', 'reconnaissance {d}'],
      vuln: ['vuln {d}', 'vulnerability {d}', 'exploit {d}', 'check vuln {d}', 'security {d}'],
      scan: ['scan {d}', 'port {d}', 'ports {d}', 'scan port {d}', 'nmap {d}'],
      dns: ['dns {d}', 'dig {d}', 'mx {d}', 'txt {d}', 'dns lookup {d}', 'nslookup {d}'],
      ssl: ['ssl {d}', 'tls {d}', 'cert {d}', 'certificate {d}', 'https {d}', 'ssl check {d}'],
      tech: ['tech {d}', 'technology {d}', 'server {d}', 'framework {d}', 'whatweb {d}'],
      web: ['web {d}', 'http {d}', 'directory {d}', 'dirb {d}', 'gobuster {d}'],
      cms: ['cms {d}', 'wordpress {d}', 'drupal {d}', 'joomla {d}', 'wpscan {d}', 'cmsscan {d}'],
      mitm: ['mitm {d}', 'sniff {d}', 'intercept {d}', 'arp {d}', 'spoof {d}'],
      brute: ['brute {d}', 'password {d}', 'crack {d}', 'hydra {d}', 'login {d}'],
      whois: ['whois {d}', 'who is {d}', 'owner {d}', 'registrar {d}'],
      headers: ['headers {d}', 'header {d}', 'curl {d}', 'http headers {d}'],
      email: ['email {d}', 'harvest {d}', 'theHarvester {d}', 'emails {d}'],
      audit: ['audit {d}', 'hardening {d}', 'lynis {d}', 'security audit {d}'],
      privesc: ['privesc {d}', 'privilege {d}', 'escalation {d}', 'root {d}'],
      malware: ['malware {d}', 'virus {d}', 'rootkit {d}', 'rkhunter {d}', 'clamav {d}']
    };

    const toolMap: Record<string, string[]> = {
      full: ['subfinder', 'nmap-fast', 'nmap-vuln', 'whatweb', 'host', 'whois'],
      recon: ['subfinder', 'assetfinder', 'findomain'],
      vuln: ['nmap-vuln', 'nikto', 'sqlmap'],
      scan: ['nmap-fast', 'nmap-full', 'masscan'],
      dns: ['host', 'dig', 'dig-mx'],
      ssl: ['ssl-cert', 'ssl-check'],
      tech: ['whatweb', 'curl-headers'],
      web: ['gobuster', 'dirb', 'nikto'],
      cms: ['wpscan', 'droopescan'],
      mitm: ['responder', 'ettercap'],
      brute: ['hydra', 'john'],
      whois: ['whois'],
      headers: ['curl-headers'],
      email: ['theHarvester'],
      audit: ['lynis', 'rkhunter'],
      privesc: ['linpeas', 'powerup'],
      malware: ['rkhunter', 'chkrootkit']
    };

    for (let i = 0; i < count; i++) {
      const intent = intents[i % intents.length];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const template = templates[intent][Math.floor(Math.random() * templates[intent].length)];
      const isZeroDay = Math.random() < 0.15;
      const severity = isZeroDay ? 'CRITICAL' : (Math.random() < 0.3 ? 'HIGH' : 'MEDIUM');

      this.testCases.push({
        id: i + 1,
        input: template.replace('{d}', domain),
        expectedIntent: intent,
        expectedTools: toolMap[intent],
        category: intent,
        isZeroDay,
        severity
      });
    }

    console.log(`✅ Gerados ${this.testCases.length} casos`);
    console.log(`   - Normal: ${this.testCases.filter(t => !t.isZeroDay).length}`);
    console.log(`   - Zero-day: ${this.testCases.filter(t => t.isZeroDay).length}`);
  }

  async generateZeroDayCases(count: number): Promise<void> {
    console.log(`\n🔧 Gerando ${count} casos 0-day...`);

    const zeroDayPatterns = [
      { input: 'scan 0day-test-1.com', intent: 'scan', tools: ['nmap-fast'] },
      { input: 'check zero-day.test', intent: 'vuln', tools: ['nmap-vuln'] },
      { input: 'find exploits in target.net', intent: 'vuln', tools: ['searchsploit'] },
      { input: 'enum subdomains of new-domain.io', intent: 'recon', tools: ['subfinder'] },
      { input: 'test sql injection target.org', intent: 'vuln', tools: ['sqlmap'] },
      { input: 'xss test example-site.com', intent: 'vuln', tools: ['xsser'] },
      { input: 'command injection test demo.net', intent: 'vuln', tools: ['commix'] },
      { input: 'find cves for service.com', intent: 'vuln', tools: ['cvelib'] },
      { input: 'check 0day vuln 2024 domain.com', intent: 'vuln', tools: ['nikto'] },
      { input: 'recent vulnerability scan new-site.org', intent: 'vuln', tools: ['nmap-vuln'] },
      { input: 'exploit check fresh-domain.io', intent: 'vuln', tools: ['metasploit'] },
      { input: 'detect new vulnerabilities target.net', intent: 'vuln', tools: ['openvas'] },
      { input: 'critical vuln scan important.com', intent: 'vuln', tools: ['nmap-vuln', 'nikto'] },
      { input: 'emergency security check urgent.org', intent: 'full', tools: ['nmap-fast', 'nikto'] },
      { input: 'urgent pentest critical.com', intent: 'full', tools: ['nmap-vuln', 'sqlmap'] },
      { input: 'quick vuln check new-site.net', intent: 'vuln', tools: ['nikto'] },
      { input: 'analyze new target fresh.io', intent: 'tech', tools: ['whatweb'] },
      { input: 'probe new service demo.org', intent: 'scan', tools: ['nmap-fast'] },
      { input: 'test fresh endpoint target.com', intent: 'vuln', tools: ['nikto'] },
      { input: 'audit new system test.net', intent: 'audit', tools: ['lynis'] },
    ];

    for (let i = 0; i < count; i++) {
      const pattern = zeroDayPatterns[i % zeroDayPatterns.length];
      const variations = [
        pattern.input,
        pattern.input.replace('target', `target-${i}`).replace('test', `test-${i}`).replace('demo', `demo-${i}`),
        `urgent ${pattern.input}`,
        `critical ${pattern.input}`,
        `0day ${pattern.input}`,
        `new ${pattern.input}`,
        pattern.input.replace('.com', `-${i}.com`).replace('.net', `-${i}.net`).replace('.io', `-${i}.io`)
      ];

      this.testCases.push({
        id: this.testCases.length + 1,
        input: variations[i % variations.length],
        expectedIntent: pattern.intent,
        expectedTools: pattern.tools,
        category: 'ZERO_DAY',
        isZeroDay: true,
        severity: 'CRITICAL'
      });
    }

    console.log(`✅ Gerados ${count} casos 0-day`);
  }

  async evaluateModel(): Promise<void> {
    console.log(`\n🔍 Avaliando modelo com ${this.testCases.length} casos...`);

    const intentClassifier = this.createIntentClassifier();

    for (const testCase of this.testCases) {
      const detectedIntent = intentClassifier(testCase.input);
      const toolsSelected = this.selectTools(detectedIntent);
      const correctIntent = detectedIntent === testCase.expectedIntent;
      const correctTools = toolsSelected.map((t, i) => t === testCase.expectedTools[i]);

      const accuracy = correctIntent ? 100 : (correctTools.filter(Boolean).length / toolsSelected.length) * 100;

      this.results.push({
        testId: testCase.id,
        input: testCase.input,
        detectedIntent,
        expectedIntent: testCase.expectedIntent,
        correctIntent,
        toolsSelected,
        expectedTools: testCase.expectedTools,
        correctTools,
        accuracy,
        isZeroDay: testCase.isZeroDay
      });

      if (this.results.length % 5000 === 0) {
        console.log(`   📊 Progresso: ${this.results.length}/${this.testCases.length}`);
      }
    }

    this.saveResults();
    this.printStats();
  }

  private createIntentClassifier(): (input: string) => string {
    return (input: string): string => {
      const p = input.toLowerCase();
      
      if (p.includes('full') || p.includes('complete') || p.includes('all') || p.includes('urgent') || p.includes('critical')) return 'full';
      if (p.includes('subdomain') || p.includes('recon') || p.includes('enum') || p.includes('find')) return 'recon';
      if (p.includes('vuln') || p.includes('vulnerability') || p.includes('exploit') || p.includes('cve') || p.includes('sql') || p.includes('xss') || p.includes('0day') || p.includes('command injection') || p.includes('security check')) return 'vuln';
      if (p.includes('scan') || p.includes('port')) return 'scan';
      if (p.includes('dns') || p.includes('dig') || p.includes('mx')) return 'dns';
      if (p.includes('ssl') || p.includes('tls') || p.includes('cert')) return 'ssl';
      if (p.includes('tech') || p.includes('server') || p.includes('framework') || p.includes('analyze') || p.includes('probe')) return 'tech';
      if (p.includes('web') || p.includes('http') || p.includes('directory')) return 'web';
      if (p.includes('cms') || p.includes('wordpress')) return 'cms';
      if (p.includes('mitm') || p.includes('sniff')) return 'mitm';
      if (p.includes('brute') || p.includes('password') || p.includes('crack')) return 'brute';
      if (p.includes('whois')) return 'whois';
      if (p.includes('header')) return 'headers';
      if (p.includes('email') || p.includes('harvest')) return 'email';
      if (p.includes('audit') || p.includes('hardening')) return 'audit';
      if (p.includes('privesc') || p.includes('privilege')) return 'privesc';
      if (p.includes('malware') || p.includes('rootkit')) return 'malware';
      
      return 'basic';
    };
  }

  private selectTools(intent: string): string[] {
    const toolMap: Record<string, string[]> = {
      full: ['subfinder', 'nmap-fast', 'nmap-vuln', 'whatweb', 'host', 'whois'],
      recon: ['subfinder', 'assetfinder', 'findomain'],
      vuln: ['nmap-vuln', 'nikto', 'sqlmap'],
      scan: ['nmap-fast', 'nmap-full', 'masscan'],
      dns: ['host', 'dig', 'dig-mx'],
      ssl: ['ssl-cert', 'ssl-check'],
      tech: ['whatweb', 'curl-headers'],
      web: ['gobuster', 'dirb', 'nikto'],
      cms: ['wpscan', 'droopescan'],
      mitm: ['responder', 'ettercap'],
      brute: ['hydra', 'john'],
      whois: ['whois'],
      headers: ['curl-headers'],
      email: ['theHarvester'],
      audit: ['lynis', 'rkhunter'],
      privesc: ['linpeas', 'powerup'],
      malware: ['rkhunter', 'chkrootkit'],
      basic: ['host', 'curl']
    };

    return toolMap[intent] || toolMap.basic;
  }

  private saveResults(): void {
    const resultsPath = path.join(DATA_DIR, 'evaluation_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Resultados salvos em: ${resultsPath}`);
  }

  private printStats(): void {
    const total = this.results.length;
    const correctIntents = this.results.filter(r => r.correctIntent).length;
    const correctTools = this.results.filter(r => r.correctTools.filter(Boolean).length > 0).length;
    const zeroDayResults = this.results.filter(r => r.isZeroDay);
    const zeroDayCorrect = zeroDayResults.filter(r => r.correctIntent).length;
    const avgAccuracy = this.results.reduce((a, b) => a + b.accuracy, 0) / total;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 ESTATÍSTICAS DA AVALIAÇÃO`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Total de testes: ${total}`);
    console.log(`   Intenções corretas: ${correctIntents}/${total} (${Math.round(correctIntents/total*100)}%)`);
    console.log(`   Tools corretas: ${correctTools}/${total} (${Math.round(correctTools/total*100)}%)`);
    console.log(`   Accuracy média: ${avgAccuracy.toFixed(2)}%`);
    console.log(`\n   Zero-day:`);
    console.log(`   - Testes: ${zeroDayResults.length}`);
    console.log(`   - Acertos: ${zeroDayCorrect}/${zeroDayResults.length} (${Math.round(zeroDayCorrect/zeroDayResults.length*100)}%)`);

    const byIntent: Record<string, { total: number; correct: number }> = {};
    for (const r of this.results) {
      if (!byIntent[r.expectedIntent]) byIntent[r.expectedIntent] = { total: 0, correct: 0 };
      byIntent[r.expectedIntent].total++;
      if (r.correctIntent) byIntent[r.expectedIntent].correct++;
    }

    console.log(`\n   Por intent:`);
    for (const [intent, stats] of Object.entries(byIntent)) {
      console.log(`   - ${intent}: ${stats.correct}/${stats.total} (${Math.round(stats.correct/stats.total*100)}%)`);
    }

    console.log(`${'═'.repeat(60)}`);
  }

  async runFullTest(target: string): Promise<string> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎯 TESTE COMPLETO: ${target}`);
    console.log(`${'═'.repeat(60)}`);

    const testCase: TestCase = {
      id: 1,
      input: `full ${target}`,
      expectedIntent: 'full',
      expectedTools: ['subfinder', 'nmap-fast', 'nmap-vuln', 'whatweb', 'host', 'whois'],
      category: 'FULL',
      isZeroDay: false,
      severity: 'HIGH'
    };

    const intentClassifier = this.createIntentClassifier();
    const detectedIntent = intentClassifier(testCase.input);
    const toolsSelected = this.selectTools(detectedIntent);

    console.log(`\n📥 Input: ${testCase.input}`);
    console.log(`🎯 Intent detectada: ${detectedIntent}`);
    console.log(`🎯 Intent esperada: ${testCase.expectedIntent}`);
    console.log(`🔧 Tools selecionadas: ${toolsSelected.join(', ')}`);

    const correctIntent = detectedIntent === testCase.expectedIntent;
    const correctTools = toolsSelected.filter(t => testCase.expectedTools.includes(t)).length;

    return `
${'═'.repeat(60)}
📋 RELATÓRIO: TESTE COMPLETO - ${target}
${'═'.repeat(60)}
✅ Input: ${testCase.input}
✅ Intent detectada: ${detectedIntent}
✅ Intent esperada: ${testCase.expectedIntent}
✅ Intent Correta: ${correctIntent ? 'SIM' : 'NÃO'}
✅ Tools corretas: ${correctTools}/${testCase.expectedTools.length}
🔧 Tools: ${toolsSelected.join(', ')}
🔧 Esperadas: ${testCase.expectedTools.join(', ')}
${'═'.repeat(60)}
`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  const evaluator = new MassiveEvaluator();

  if (command === 'generate') {
    const count = parseInt(args[1] || '10000', 10);
    await evaluator.generateTestCases(count);
    await evaluator.evaluateModel();
  } else if (command === 'zeroday') {
    const count = parseInt(args[1] || '10000', 10);
    await evaluator.generateZeroDayCases(count);
    await evaluator.evaluateModel();
  } else if (command === 'full') {
    if (!target) {
      console.log('Uso: zeroday full target');
      console.log('Exemplo: zeroday full bancn.com');
      process.exit(1);
    }
    const result = await evaluator.runFullTest(target);
    console.log(result);
  } else if (command === 'all') {
    console.log('🧪 Executando avaliação completa...');
    
    await evaluator.generateTestCases(60000);
    await evaluator.generateZeroDayCases(10000);
    await evaluator.evaluateModel();

    if (target) {
      const result = await evaluator.runFullTest(target);
      console.log(result);
    }
  } else {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║               NASAI-MAESTRO-4.0 EVALUATOR                       ║
╠═══════════════════════════════════════════════════════════════════╣
║ COMANDOS:                                                    ║
║   generate [count]  - Gera casos de teste (padrão 10000)          ║
║   zeroday [count]  - Gera casos 0-day (padrão 10000)            ║
║   full target     - Teste completo ao target                    ║
║   all target    - 60k + 10k + full test                      ║
╠═══════════════════════════════════════════════════════════════════╣
║ EXEMPLOS:                                                    ║
║   generate 50000                                            ║
║   zeroday 10000                                            ║
║   full bancn.com                                             ║
║   all bancn.com                                              ║
╚═══════════════��═��═════════════════════════════════════════════════╝
`);
  }
}

main();