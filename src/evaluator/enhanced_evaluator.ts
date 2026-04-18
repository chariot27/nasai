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
  confidence: number;
  toolsSelected: string[];
  expectedTools: string[];
  correctTools: boolean[];
  accuracy: number;
  isZeroDay: boolean;
}

class EnhancedEvaluator {
  private trainingData: Map<string, string[]> = new Map();
  private intentWeights: Map<string, number> = new Map();
  private testCases: TestCase[] = [];
  private results: TestResult[] = [];

  constructor() {
    this.initializeEnhancedPatterns();
  }

  private initializeEnhancedPatterns() {
    this.trainingData.set('full', [
      'full', 'complete', 'all', 'full scan', 'pentest', 'comprehensive',
      'full assessment', 'complete test', 'all ports', 'everything', 'full coverage',
      'complete scan', '全面扫描', 'completo', 'complete audit', 'full analysis',
      'end-to-end', 'entire', 'overall', 'total', 'thorough', 'exhaustive', 'holistic',
      'critical urgent full', 'emergency full', 'urgent complete', 'deep scan',
      'thorough scan', 'detailed scan', 'extensive scan', 'comprehensive scan'
    ]);

    this.trainingData.set('recon', [
      'recon', 'subdomain', 'subdomains', 'enum', 'find subdomains', 'reconnaissance',
      'enumerate', 'discover', 'find domains', 'subenum', 'subfinder', 'asset finder',
      'dns enum', 'domain discovery', 'brute subdomains', 'passive recon', 'active recon',
      'osint', 'information gathering', 'subdomain enumeration', 'domain enumeration',
      'finding subdomains', 'look for subdomains', 'get all subdomains', 'list subdomains',
      'varrer subdomains', 'enumeração', 'descobrir subdomínios', 'active directory',
      'dns zone transfer', 'whois enum', 'email harvest', 'google dorks'
    ]);

    this.trainingData.set('vuln', [
      'vuln', 'vulnerability', 'vulnerabilities', 'exploit', 'exploits', 'security',
      'hack', 'hacking', 'cve', 'sqli', 'xss', 'sql injection', 'injection',
      'command injection', 'rce', 'zero-day', '0day', '0-day', 'new exploit',
      'security check', 'vulnerability scan', 'vuln scan', 'vuln check',
      'find exploits', 'find vulnerabilities', 'detect vuln', 'security audit',
      'penetration test', 'exploit check', 'vulnerability assessment',
      'cve check', 'cvelib', 'openvas', 'nikto', 'find vuln', 'test vuln',
      'check exploit', 'scan vuln', 'exploit scan', 'security flaw',
      'security weakness', 'vulnerability detection', 'penetration testing',
      'urgent vuln', 'critical vuln', 'emergency security', '0day test', 'new vuln',
      'recent vuln', 'latest exploit', 'check 0day', 'test exploit', 'probe vuln',
      'analyze vuln', 'assess vulnerability', 'evaluate security', 'xss scan',
      'csrf', 'ssrf', 'lfi', 'rfi', 'xxe', 'ssti', 'deserialization',
      'json-web-token', 'jwt', 'oauth', 'authentication bypass', 'authorization bypass',
      'idor', 'business logic', 'race condition', 'path traversal'
    ]);

    this.trainingData.set('scan', [
      'scan', 'port', 'ports', 'port scan', 'nmap', 'scan ports', 'portscan',
      'scan port', 'find open ports', 'check ports', 'open ports', 'discover ports',
      'tcp scan', 'udp scan', 'syn scan', 'connect scan', 'scan network',
      'network scan', 'host discovery', 'ping sweep', 'latency', 'check port',
      'quick scan', 'fast scan', 'port discovery', 'service scan',
      'version detection', 'os detection', 'scan for open ports', 'list ports',
      'check services', 'service detection', 'scan service', 'analyze ports', 'probe ports',
      'test ports', 'verify ports', 'check which ports', 'what ports open', 'tcp ports',
      'udp ports', 'common ports', 'all ports', 'specific port'
    ]);

    this.trainingData.set('dns', [
      'dns', 'dig', 'mx', 'txt', 'dns lookup', 'nslookup', 'nameserver', 'ns record',
      'mx record', 'txt record', 'a record', 'aaaa record', 'cname record', 'soa record',
      'dns records', 'dns check', 'dns query', 'resolve', 'resolution', 'check dns',
      'verify dns', 'dns info', 'dns information', 'domain resolution',
      'check nameserver', 'check mx', 'check txt', 'check spf', 'dmarc', 'dkim',
      'dns enum', 'dns bruteforce', 'zone transfer', 'axfr', 'mail server',
      'smtp check', 'email server', 'dnssec', 'dns poisoning', 'dns sweep'
    ]);

    this.trainingData.set('ssl', [
      'ssl', 'tls', 'certificate', 'cert', 'https', 'ssl check', 'tls check',
      'cert check', 'ssl certificate', 'tls certificate', 'https check', 'check ssl',
      'check tls', 'verify ssl', 'check certificate', 'test ssl', 'test tls',
      'certificate info', 'ssl info', 'cipher', 'ciphers', 'cipher suite',
      'ssl cipher', 'tls cipher', 'ssl version', 'tls version', 'ssl scan', 'tls scan',
      'heartbleed', 'poodle', 'beast', 'freak', 'crime', 'certificate validation',
      'ssl validation', 'check https', 'verify https', 'weak cipher', 'weak tls',
      'certificate expiry', 'self-signed', 'invalid certificate'
    ]);

    this.trainingData.set('tech', [
      'tech', 'technology', 'server', 'framework', 'whatweb', 'detect',
      'technologies', 'detect tech', 'detect server', 'detect framework', 'identify',
      'identify technology', 'identify server', 'fingerprint', 'fingerprinting',
      'web fingerprint', 'server identification', 'service identification',
      'detect cms', 'detect programming language', 'detect backend', 'detect frontend',
      'probe tech', 'analyze tech', 'technology detection', 'server detection',
      'framework detection', 'what technology', 'which server', 'which framework',
      'which cms', 'wappalyzer', 'builtwith', 'technology stack', 'tech stack'
    ]);

    this.trainingData.set('web', [
      'web', 'http', 'website', 'directory', 'dirb', 'gobuster', 'dir',
      'directories', 'directory busting', 'directory enumeration', 'web enum',
      'find directories', 'find files', 'find pages', 'brute force directory', 'web scan',
      'web discovery', 'web brute', 'check website', 'analyze web', 'web analysis',
      'http methods', 'http headers', 'web fingerprint', 'web application'
    ]);

    this.trainingData.set('cms', [
      'cms', 'wordpress', 'wp', 'drupal', 'joomla', 'magento', 'shopify',
      'wpscan', 'joomscan', 'droopescan', 'cms scan', 'cms detection',
      'wordpress scan', 'drupal scan', 'joomla scan', 'wordpress vuln', 'drupal vuln',
      'joomla vuln', 'cms exploit', 'cms vulnerability', 'detect cms', 'identify cms',
      'which cms', 'wordpress detection', 'plugin vulns', 'theme vulns', 'wp plugin',
      'wordpress enumeration', 'drupal module', 'joomla extension'
    ]);

    this.trainingData.set('mitm', [
      'mitm', 'man in the middle', 'sniff', 'sniffer', 'intercept', 'arp',
      'arp spoofing', 'arp poison', 'dns spoofing', 'spoof', 'poison', 'ettercap',
      'bettercap', 'responder', 'network sniff', 'packet sniff', 'traffic capture'
    ]);

    this.trainingData.set('brute', [
      'brute', 'bruteforce', 'brute force', 'password', 'crack', 'cracker',
      'hydra', 'medusa', 'crack password', 'guess password', 'login brute',
      'credential stuff', 'password spray', 'wordlist', 'dictionary attack'
    ]);

    this.trainingData.set('whois', [
      'whois', 'who is', 'owner', 'registrar', 'registration', 'registrant',
      'domain info', 'domain owner', 'domain age', 'domain created', 'domain expiry',
      'domain status', 'name servers', 'registrar info', 'domain details'
    ]);

    this.trainingData.set('headers', [
      'header', 'headers', 'http header', 'http headers', 'curl', 'check header',
      'check headers', 'analyze header', 'security header', 'csp', 'x-frame-options',
      'hsts', 'x-content-type', 'cors', 'referrer-policy'
    ]);

    this.trainingData.set('email', [
      'email', 'emails', 'harvest', 'theharvester', 'harvest emails',
      'find email', 'find emails', 'collect emails', 'email collection'
    ]);

    this.trainingData.set('audit', [
      'audit', 'hardening', 'lynis', 'security audit', 'system audit',
      'compliance', 'cis', 'stig', 'security check', 'system check'
    ]);

    this.trainingData.set('privesc', [
      'privesc', 'privilege', 'escalation', 'privilege escalation', 'root',
      'sudo', 'sudoers', 'suid', 'capabilities', 'get root', 'become root',
      'gain root', 'elevate', 'linpeas', 'linenum', 'linux privesc'
    ]);

    this.trainingData.set('malware', [
      'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware',
      'find malware', 'scan malware', 'virus scan', 'trojan', 'backdoor'
    ]);

    this.intentWeights.set('full', 1.2);
    this.intentWeights.set('recon', 1.3);
    this.intentWeights.set('vuln', 1.1);
    this.intentWeights.set('scan', 1.2);
    this.intentWeights.set('dns', 1.3);
    this.intentWeights.set('ssl', 1.3);
    this.intentWeights.set('tech', 1.2);
    this.intentWeights.set('web', 1.1);
    this.intentWeights.set('cms', 1.1);
    this.intentWeights.set('mitm', 1.0);
    this.intentWeights.set('brute', 1.0);
    this.intentWeights.set('whois', 1.2);
    this.intentWeights.set('headers', 1.2);
    this.intentWeights.set('email', 1.2);
    this.intentWeights.set('audit', 1.2);
    this.intentWeights.set('privesc', 1.0);
    this.intentWeights.set('malware', 1.0);
  }

  classifyIntent(prompt: string): { intent: string; confidence: number } {
    const p = prompt.toLowerCase().trim();
    const scores: Map<string, number> = new Map();

    for (const [intent, patterns] of this.trainingData.entries()) {
      let score = 0;
      const weight = this.intentWeights.get(intent) || 1.0;

      for (const pattern of patterns) {
        if (p === pattern) {
          score += 10 * weight;
        } else if (p.includes(pattern)) {
          score += 5 * weight;
        } else {
          const words = p.split(/\s+/);
          for (const word of words) {
            if (word.includes(pattern) || pattern.includes(word)) {
              score += 2 * weight;
            }
          }
        }
      }

      scores.set(intent, score);
    }

    let bestIntent = 'basic';
    let bestScore = 0;

    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? (bestScore / totalScore) * 100 : 0;

    return {
      intent: confidence > 30 ? bestIntent : 'basic',
      confidence: Math.min(confidence, 95)
    };
  }

  selectTools(intent: string): string[] {
    const toolMap: Record<string, string[]> = {
      full: ['subfinder', 'nmap-fast', 'nmap-vuln', 'whatweb', 'host', 'whois'],
      recon: ['subfinder', 'assetfinder', 'findomain', 'amass'],
      vuln: ['nmap-vuln', 'nikto', 'sqlmap', 'xsser', 'commix'],
      scan: ['nmap-fast', 'nmap-full', 'masscan', 'rustscan'],
      dns: ['host', 'dig', 'dig-mx', 'dig-txt', 'nslookup'],
      ssl: ['ssl-cert', 'ssl-check'],
      tech: ['whatweb', 'curl-headers'],
      web: ['gobuster', 'dirb', 'nikto'],
      cms: ['wpscan', 'droopescan'],
      mitm: ['responder', 'ettercap'],
      brute: ['hydra'],
      whois: ['whois'],
      headers: ['curl-headers'],
      email: ['theHarvester'],
      audit: ['lynis', 'rkhunter'],
      privesc: ['linpeas'],
      malware: ['rkhunter'],
      basic: ['host', 'curl']
    };

    return toolMap[intent] || toolMap.basic;
  }

  async generateTestCases(count: number): Promise<void> {
    console.log(`\n🔧 Gerando ${count} casos de teste...`);

    const intents = Array.from(this.trainingData.keys());
    const domains = ['example.com', 'test.com', 'demo.com', 'site.com', 'web.com', 'google.com', 'microsoft.com', 'amazon.com', 'apple.com', 'facebook.com'];

    for (let i = 0; i < count; i++) {
      const intent = intents[i % intents.length];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const patterns = this.trainingData.get(intent) || [];
      const template = patterns[i % patterns.length];
      const isZeroDay = Math.random() < 0.15;

      this.testCases.push({
        id: i + 1,
        input: `${template} ${domain}`,
        expectedIntent: intent,
        expectedTools: this.selectTools(intent),
        category: intent,
        isZeroDay,
        severity: isZeroDay ? 'CRITICAL' : 'MEDIUM'
      });
    }

    console.log(`✅ Gerados ${this.testCases.length} casos`);
  }

  async evaluateModel(): Promise<void> {
    console.log(`\n🔍 Avaliando modelo com ${this.testCases.length} casos...`);

    for (const testCase of this.testCases) {
      const { intent, confidence } = this.classifyIntent(testCase.input);
      const toolsSelected = this.selectTools(intent);
      const correctIntent = intent === testCase.expectedIntent;
      const correctTools = toolsSelected.map(t => testCase.expectedTools.includes(t));
      const accuracy = correctIntent ? 100 : (correctTools.filter(Boolean).length / toolsSelected.length) * 100;

      this.results.push({
        testId: testCase.id,
        input: testCase.input,
        detectedIntent: intent,
        expectedIntent: testCase.expectedIntent,
        correctIntent,
        confidence,
        toolsSelected,
        expectedTools: testCase.expectedTools,
        correctTools,
        accuracy,
        isZeroDay: testCase.isZeroDay
      });

      if (this.results.length % 10000 === 0) {
        console.log(`   📊 Progresso: ${this.results.length}/${this.testCases.length}`);
      }
    }

    this.saveResults();
    this.printStats();
  }

  private saveResults(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const resultsPath = path.join(DATA_DIR, 'enhanced_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Resultados salvos em: ${resultsPath}`);
  }

  private printStats(): void {
    const total = this.results.length;
    const correctIntents = this.results.filter(r => r.correctIntent).length;
    const correctTools = this.results.filter(r => r.correctTools.filter(Boolean).length > 0).length;
    const avgConfidence = this.results.reduce((a, b) => a + b.confidence, 0) / total;
    const avgAccuracy = this.results.reduce((a, b) => a + b.accuracy, 0) / total;
    const zeroDayResults = this.results.filter(r => r.isZeroDay);
    const zeroDayCorrect = zeroDayResults.filter(r => r.correctIntent).length;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 ESTATÍSTICAS - MODELO ENHANCED`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Total de testes: ${total}`);
    console.log(`   Intenções corretas: ${correctIntents}/${total} (${Math.round(correctIntents/total*100)}%)`);
    console.log(`   Tools corretas: ${correctTools}/${total} (${Math.round(correctTools/total*100)}%)`);
    console.log(`   Confiança média: ${avgConfidence.toFixed(1)}%`);
    console.log(`   Accuracy média: ${avgAccuracy.toFixed(1)}%`);
    console.log(`\n   Zero-day:`);
    console.log(`   - Testes: ${zeroDayResults.length}`);
    console.log(`   - Acertos: ${zeroDayCorrect}/${zeroDayResults.length} (${Math.round(zeroDayCorrect/zeroDayResults.length*100)}%)`);

    const byIntent: Record<string, { total: number; correct: number; conf: number }> = {};
    for (const r of this.results) {
      if (!byIntent[r.expectedIntent]) byIntent[r.expectedIntent] = { total: 0, correct: 0, conf: 0 };
      byIntent[r.expectedIntent].total++;
      if (r.correctIntent) byIntent[r.expectedIntent].correct++;
      byIntent[r.expectedIntent].conf += r.confidence;
    }

    console.log(`\n   Por intent:`);
    for (const [intent, stats] of Object.entries(byIntent)) {
      const acc = Math.round(stats.correct/stats.total*100);
      const conf = Math.round(stats.conf/stats.total);
      console.log(`   - ${intent}: ${stats.correct}/${stats.total} (${acc}%) | conf:${conf}%`);
    }

    console.log(`${'═'.repeat(60)}`);
  }

  async runFullTest(target: string): Promise<string> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎯 TESTE COMPLETO: ${target}`);
    console.log(`${'═'.repeat(60)}`);

    const { intent, confidence } = this.classifyIntent(`full ${target}`);
    const toolsSelected = this.selectTools(intent);

    console.log(`\n📥 Input: full ${target}`);
    console.log(`🎯 Intent: ${intent}`);
    console.log(`🎯 Confiança: ${confidence.toFixed(1)}%`);
    console.log(`🔧 Tools: ${toolsSelected.join(', ')}`);

    return `
${'═'.repeat(60)}
📋 RELATÓRIO: TESTE COMPLETO - ${target}
${'═'.repeat(60)}
✅ Input: full ${target}
✅ Intent detectada: ${intent}
✅ Confiança: ${confidence.toFixed(1)}%
✅ Tools: ${toolsSelected.join(', ')}
${'═'.repeat(60)}
`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  const evaluator = new EnhancedEvaluator();

  if (command === 'generate') {
    const count = parseInt(args[1] || '10000', 10);
    await evaluator.generateTestCases(count);
    await evaluator.evaluateModel();
  } else if (command === 'zeroday') {
    await evaluator.generateTestCases(10000);
    await evaluator.evaluateModel();
  } else if (command === 'full') {
    if (!target) {
      console.log('Uso: full target');
      process.exit(1);
    }
    const result = await evaluator.runFullTest(target);
    console.log(result);
  } else if (command === 'all') {
    console.log('🧪 Avaliação completa com modelo enhancer...');
    
    await evaluator.generateTestCases(60000);
    await evaluator.evaluateModel();

    if (target) {
      const result = await evaluator.runFullTest(target);
      console.log(result);
    }
  } else {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              NASAI-MAESTRO-4.0 EVALUATOR                      ║
╠═══════════════════════════════════════════════════════════════════╣
║ COMANDOS:                                                    ║
║   generate [count]  - Gera e avalia casos                      ║
║   full target       - Teste completo ao target                  ║
║   all target       - 60k + target test                         ║
╠═══════════════════════════════════════════════════════════════════╣
║ EXEMPLOS:                                                    ║
║   generate 50000                                            ║
║   full bancocn.com                                           ║
║   all bancocn.com                                            ║
╚═══════════════════════════════════════════════════════════════════╝
`);
  }
}

main();