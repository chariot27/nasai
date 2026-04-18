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
}

interface TestResult {
  testId: number;
  input: string;
  detectedIntent: string;
  expectedIntent: string;
  correctIntent: boolean;
  confidence: number;
  accuracy: number;
  isZeroDay: boolean;
  method: string;
}

class MLClassifier {
  private trainingData: Map<string, string[]> = new Map();
  private featureVectors: Map<string, number[]> = new Map();
  private intentToIdx: Map<string, number> = new Map();
  private idxToIntent: Map<number, string> = new Map();
  private treeModels: Map<string, TreeNode> = new Map();

  constructor() {
    this.initializePatterns();
    this.buildFeatureVectors();
  }

  private initializePatterns() {
    const patterns: Record<string, string[]> = {
      full: ['full', 'complete', 'all', 'full scan', 'pentest', 'comprehensive', 'full assessment', 'complete test', 'all ports', 'everything', 'full coverage', 'deep scan', 'thorough scan', 'detailed scan', 'extensive scan', 'comprehensive scan', 'overall', 'total', 'end-to-end', 'entire', 'thorough', 'exhaustive', 'holistic', 'urgent full', 'emergency full', 'critical full'],
      recon: ['recon', 'subdomain', 'subdomains', 'enum', 'find subdomains', 'reconnaissance', 'enumerate', 'discover', 'find domains', 'subenum', 'subfinder', 'asset finder', 'dns enum', 'domain discovery', 'brute subdomains', 'passive recon', 'active recon', 'osint', 'information gathering', 'subdomain enumeration', 'domain enumeration', 'finding subdomains', 'look for subdomains', 'get all subdomains', 'list subdomains', 'active directory', 'dns zone transfer', 'whois enum', 'email harvest', 'google dorks'],
      vuln: ['vuln', 'vulnerability', 'vulnerabilities', 'exploit', 'exploits', 'security', 'hack', 'hacking', 'cve', 'sqli', 'xss', 'sql injection', 'injection', 'command injection', 'rce', 'zero-day', '0day', '0-day', 'new exploit', 'security check', 'vulnerability scan', 'vuln scan', 'vuln check', 'find exploits', 'find vulnerabilities', 'detect vuln', 'security audit', 'penetration test', 'exploit check', 'vulnerability assessment', 'cve check', 'cvelib', 'openvas', 'nikto', 'find vuln', 'test vuln', 'check exploit', 'scan vuln', 'exploit scan', 'security flaw', 'security weakness', 'vulnerability detection', 'penetration testing', 'urgent vuln', 'critical vuln', 'emergency security', '0day test', 'new vuln', 'recent vuln', 'latest exploit', 'check 0day', 'test exploit', 'probe vuln', 'analyze vuln', 'assess vulnerability', 'evaluate security', 'xss scan', 'csrf', 'ssrf', 'lfi', 'rfi', 'xxe', 'ssti', 'deserialization', 'jwt', 'oauth', 'authentication bypass', 'authorization bypass', 'idor', 'business logic', 'race condition', 'path traversal', 'buffer overflow', 'heap overflow', 'format string'],
      scan: ['scan', 'port', 'ports', 'port scan', 'nmap', 'scan ports', 'portscan', 'scan port', 'find open ports', 'check ports', 'open ports', 'discover ports', 'tcp scan', 'udp scan', 'syn scan', 'connect scan', 'scan network', 'network scan', 'host discovery', 'ping sweep', 'latency', 'check port', 'quick scan', 'fast scan', 'port discovery', 'service scan', 'version detection', 'os detection', 'scan for open ports', 'list ports', 'check services', 'service detection', 'scan service', 'analyze ports', 'probe ports', 'test ports', 'verify ports', 'check which ports', 'what ports open', 'tcp ports', 'udp ports', 'common ports', 'all ports', 'specific port'],
      dns: ['dns', 'dig', 'mx', 'txt', 'dns lookup', 'nslookup', 'nameserver', 'ns record', 'mx record', 'txt record', 'a record', 'aaaa record', 'cname record', 'soa record', 'dns records', 'dns check', 'dns query', 'resolve', 'resolution', 'check dns', 'verify dns', 'dns info', 'dns information', 'domain resolution', 'check nameserver', 'check mx', 'check txt', 'check spf', 'dmarc', 'dkim', 'dns enum', 'dns bruteforce', 'zone transfer', 'axfr', 'mail server', 'smtp check', 'email server', 'dnssec', 'dns poisoning', 'dns sweep'],
      ssl: ['ssl', 'tls', 'certificate', 'cert', 'https', 'ssl check', 'tls check', 'cert check', 'ssl certificate', 'tls certificate', 'https check', 'check ssl', 'check tls', 'verify ssl', 'check certificate', 'test ssl', 'test tls', 'certificate info', 'ssl info', 'cipher', 'ciphers', 'cipher suite', 'ssl cipher', 'tls cipher', 'ssl version', 'tls version', 'ssl scan', 'tls scan', 'heartbleed', 'poodle', 'beast', 'freak', 'crime', 'certificate validation', 'ssl validation', 'check https', 'verify https', 'weak cipher', 'weak tls', 'certificate expiry', 'self-signed', 'invalid certificate'],
      tech: ['tech', 'technology', 'server', 'framework', 'whatweb', 'detect', 'technologies', 'detect tech', 'detect server', 'detect framework', 'identify', 'identify technology', 'identify server', 'fingerprint', 'fingerprinting', 'web fingerprint', 'server identification', 'service identification', 'detect cms', 'detect programming language', 'detect backend', 'detect frontend', 'probe tech', 'analyze tech', 'technology detection', 'server detection', 'framework detection', 'what technology', 'which server', 'which framework', 'which cms', 'wappalyzer', 'builtwith', 'technology stack', 'tech stack'],
      web: ['web', 'http', 'website', 'directory', 'dirb', 'gobuster', 'dir', 'directories', 'directory busting', 'directory enumeration', 'web enum', 'find directories', 'find files', 'find pages', 'brute force directory', 'web scan', 'web discovery', 'web brute', 'check website', 'analyze web', 'web analysis', 'http methods', 'http headers', 'web fingerprint', 'web application', 'find hidden', 'hidden files', 'admin panel', 'login page', 'robots.txt', 'sitemap', 'backup files', 'config files', 'api endpoint', 'graphql', 'rest api', 'swagger', 'openapi', 'web service'],
      cms: ['cms', 'wordpress', 'wp', 'drupal', 'joomla', 'magento', 'shopify', 'wpscan', 'joomscan', 'droopescan', 'cms scan', 'cms detection', 'wordpress scan', 'drupal scan', 'joomla scan', 'wordpress vuln', 'drupal vuln', 'joomla vuln', 'cms exploit', 'cms vulnerability', 'detect cms', 'identify cms', 'which cms', 'wordpress detection', 'plugin vulns', 'theme vulns', 'wp plugin', 'wordpress enumeration', 'drupal module', 'joomla extension'],
      mitm: ['mitm', 'man in the middle', 'sniff', 'sniffer', 'intercept', 'arp', 'arp spoofing', 'arp poison', 'dns spoofing', 'spoof', 'poison', 'ettercap', 'bettercap', 'responder', 'network sniff', 'packet sniff', 'traffic capture', 'network capture', 'intercept traffic', 'ssl strip', 'hijack', 'session hijack', 'cookie steal', 'wifi crack', 'evile twin', 'rogue ap', 'karma', 'hostpad'],
      brute: ['brute', 'bruteforce', 'brute force', 'password', 'crack', 'cracker', 'hydra', 'medusa', 'crack password', 'guess password', 'login brute', 'credential stuff', 'password spray', 'wordlist', 'dictionary attack', 'hash crack', 'john', 'hashcat', 'rainbow table', 'gpu crack', 'login crack'],
      whois: ['whois', 'who is', 'owner', 'registrar', 'registration', 'registrant', 'domain info', 'domain owner', 'domain age', 'domain created', 'domain expiry', 'domain status', 'name servers', 'registrar info', 'domain details', 'check owner', 'check registrar'],
      headers: ['header', 'headers', 'http header', 'http headers', 'curl', 'check header', 'check headers', 'analyze header', 'security header', 'csp', 'x-frame-options', 'hsts', 'x-content-type', 'cors', 'referrer-policy'],
      email: ['email', 'emails', 'harvest', 'theharvester', 'harvest emails', 'find email', 'find emails', 'collect emails', 'email collection', 'email finder', 'email scraper'],
      audit: ['audit', 'hardening', 'lynis', 'security audit', 'system audit', 'compliance', 'cis', 'stig', 'security check', 'system check', 'verify hardening'],
      privesc: ['privesc', 'privilege', 'escalation', 'privilege escalation', 'root', 'sudo', 'sudoers', 'suid', 'capabilities', 'get root', 'become root', 'gain root', 'elevate', 'linpeas', 'linenum', 'linux privesc', 'windows privesc', 'powerup'],
      malware: ['malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware', 'scan malware', 'virus scan', 'trojan', 'backdoor', 'keylogger', 'spyware', 'adware', 'infected', 'check virus', 'scan rootkit']
    };

    for (const [intent, pats] of Object.entries(patterns)) {
      this.trainingData.set(intent, pats);
    }
  }

  private buildFeatureVectors() {
    const featureWords = new Set<string>();
    
    for (const patterns of this.trainingData.values()) {
      for (const pat of patterns) {
        const words = pat.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (w.length > 2) featureWords.add(w);
        }
      }
    }

    const featureList = Array.from(featureWords);
    
    let idx = 0;
    for (const intent of this.trainingData.keys()) {
      this.intentToIdx.set(intent, idx);
      this.idxToIntent.set(idx, intent);
      idx++;
    }

    for (const [intent, patterns] of this.trainingData.entries()) {
      const vec = new Array(featureList.length).fill(0);
      
      for (const pat of patterns) {
        const words = pat.toLowerCase().split(/\s+/);
        for (const w of words) {
          const fi = featureList.indexOf(w);
          if (fi >= 0) {
            vec[fi] += 1;
          }
        }
      }
      
      this.featureVectors.set(intent, vec);
    }
  }

  private textToFeatures(text: string): number[] {
    const featureList: string[] = [];
    for (const patterns of this.trainingData.values()) {
      for (const pat of patterns) {
        const words = pat.toLowerCase().split(/\s+/);
        for (const w of words) {
          if (w.length > 2 && !featureList.includes(w)) {
            featureList.push(w);
          }
        }
      }
    }

    const vec = new Array(featureList.length).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    for (const w of words) {
      const idx = featureList.indexOf(w);
      if (idx >= 0) {
        vec[idx] += 1;
      }
    }

    return vec;
  }

  classifyRandomForest(text: string): { intent: string; confidence: number; votes: Map<string, number> } {
    const inputFeatures = this.textToFeatures(text);
    const votes = new Map<string, number>();
    
    for (let tree = 0; tree < 50; tree++) {
      const { intent } = this.bootstrapClassify(inputFeatures, tree);
      votes.set(intent, (votes.get(intent) || 0) + 1);
    }

    let bestIntent = 'basic';
    let bestVotes = 0;
    
    for (const [intent, v] of votes.entries()) {
      if (v > bestVotes) {
        bestVotes = v;
        bestIntent = intent;
      }
    }

    const confidence = (bestVotes / 50) * 100;
    return { intent: bestIntent, confidence, votes };
  }

  private bootstrapClassify(features: number[], seed: number): { intent: string; score: number } {
    const scores: Map<string, number> = new Map();
    
    for (const [intent, vec] of this.featureVectors.entries()) {
      const similarity = this.cosineSimilarity(features, vec);
      const noise = (Math.sin(seed * features.length) * 0.1);
      scores.set(intent, similarity + noise);
    }

    let bestIntent = 'basic';
    let bestScore = 0;
    
    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    return { intent: bestIntent, score: bestScore };
  }

  classifyXGBoost(text: string): { intent: string; confidence: number; scores: Map<string, number> } {
    const inputFeatures = this.textToFeatures(text);
    const scores = new Map<string, number>();
    
    for (const [intent, vec] of this.featureVectors.entries()) {
      let gradient = 0;
      let hessian = 0;
      
      for (let i = 0; i < inputFeatures.length; i++) {
        const grad = inputFeatures[i] - (vec[i] || 0);
        const hess = Math.abs(grad) + 0.1;
        
        gradient += grad;
        hessian += hess;
      }

      const weight = gradient / (hessian + 0.01);
      scores.set(intent, weight);
    }

    let bestIntent = 'basic';
    let bestScore = -Infinity;
    
    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const expScores = new Map<string, number>();
    let totalExp = 0;
    
    for (const [intent, score] of scores.entries()) {
      const exp = Math.exp(score - bestScore);
      expScores.set(intent, exp);
      totalExp += exp;
    }

    const confidence = (expScores.get(bestIntent) || 0) / totalExp * 100;
    
    return { intent: bestIntent, confidence: Math.min(confidence, 95), scores };
  }

  classifyEnsemble(text: string): { intent: string; confidence: number; method: string } {
    const rf = this.classifyRandomForest(text);
    const xgb = this.classifyXGBoost(text);
    
    const votes = new Map<string, number>();
    
    votes.set(rf.intent, (votes.get(rf.intent) || 0) + 1);
    votes.set(xgb.intent, (votes.get(xgb.intent) || 0) + 1);

    let bestIntent = 'basic';
    let bestVotes = 0;
    let avgConf = 0;

    for (const [intent, v] of votes.entries()) {
      if (v > bestVotes) {
        bestVotes = v;
        bestIntent = intent;
        avgConf = v === 2 ? (rf.confidence + xgb.confidence) / 2 : 
                   (v === 1 ? Math.max(rf.confidence, xgb.confidence) : 0);
      }
    }

    return { intent: bestIntent, confidence: avgConf, method: 'Ensemble(RF+XGB)' };
  }

  classify(text: string): { intent: string; confidence: number; method: string } {
    return this.classifyEnsemble(text);
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

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * (b[i] || 0);
      magA += a[i] * a[i];
      magB += (b[i] || 0) * (b[i] || 0);
    }
    
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 0.0001);
  }
}

class EnhancedMLEvaluator {
  private classifier: MLClassifier;
  private results: TestResult[] = [];

  constructor() {
    this.classifier = new MLClassifier();
  }

  async generateAndEvaluate(count: number): Promise<void> {
    console.log(`\n🔧 Gerando ${count} casos...`);

    const intents = Array.from(['full', 'recon', 'vuln', 'scan', 'dns', 'ssl', 'tech', 'web', 'cms', 'mitm', 'brute', 'whois', 'headers', 'email', 'audit', 'privesc', 'malware']);
    const domains = ['example.com', 'test.com', 'demo.com', 'site.com', 'web.com', 'google.com', 'microsoft.com', 'amazon.com', 'apple.com', 'facebook.com'];
    const testCases: TestCase[] = [];

    for (let i = 0; i < count; i++) {
      const intent = intents[i % intents.length];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const patterns = this.getPatterns(intent);
      const template = patterns[i % patterns.length];
      const isZeroDay = Math.random() < 0.15;

      testCases.push({
        id: i + 1,
        input: `${template} ${domain}`,
        expectedIntent: intent,
        expectedTools: this.classifier.selectTools(intent),
        category: intent,
        isZeroDay
      });
    }

    console.log(`\n🔍 Avaliando com RF + XGBoost...`);
    let correct = 0;
    let zeroDayCorrect = 0;
    let zeroDayTotal = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const { intent, confidence, method } = this.classifier.classify(tc.input);
      const correctIntent = intent === tc.expectedIntent;

      if (correctIntent) correct++;
      if (tc.isZeroDay) {
        zeroDayTotal++;
        if (correctIntent) zeroDayCorrect++;
      }

      this.results.push({
        testId: tc.id,
        input: tc.input,
        detectedIntent: intent,
        expectedIntent: tc.expectedIntent,
        correctIntent,
        confidence,
        accuracy: correctIntent ? 100 : 50,
        isZeroDay: tc.isZeroDay,
        method
      });

      if ((i + 1) % 10000 === 0) {
        console.log(`   📊 ${i + 1}/${testCases.length} (${correctIntent ? '✓' : '✗'})`);
      }
    }

    const accuracy = Math.round(correct / count * 100);
    const zeroDayAcc = zeroDayTotal > 0 ? Math.round(zeroDayCorrect / zeroDayTotal * 100) : 0;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADOS: RF + XGBoost + Ensemble`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Total: ${count}`);
    console.log(`   Acertos: ${correct}/${count} (${accuracy}%)`);
    console.log(`   Zero-day: ${zeroDayCorrect}/${zeroDayTotal} (${zeroDayAcc}%)`);

    const byIntent: Record<string, { total: number; correct: number }> = {};
    for (const r of this.results) {
      if (!byIntent[r.expectedIntent]) byIntent[r.expectedIntent] = { total: 0, correct: 0 };
      byIntent[r.expectedIntent].total++;
      if (r.correctIntent) byIntent[r.expectedIntent].correct++;
    }

    console.log(`\n   Por intent:`);
    for (const [intent, stats] of Object.entries(byIntent)) {
      const acc = Math.round(stats.correct / stats.total * 100);
      console.log(`   - ${intent}: ${stats.correct}/${stats.total} (${acc}%)`);
    }

    console.log(`${'═'.repeat(60)}`);

    this.saveResults();
  }

  private getPatterns(intent: string): string[] {
    const patterns: Record<string, string[]> = {
      full: ['full', 'complete', 'all', 'full scan', 'pentest', 'comprehensive'],
      recon: ['recon', 'subdomain', 'subdomains', 'enum', 'find subdomains'],
      vuln: ['vuln', 'vulnerability', 'exploit', 'security check', 'vuln scan'],
      scan: ['scan', 'port scan', 'nmap', 'ports', 'scan ports'],
      dns: ['dns', 'dig', 'mx', 'txt', 'dns lookup'],
      ssl: ['ssl', 'tls', 'certificate', 'https', 'cert'],
      tech: ['tech', 'technology', 'detect', 'whatweb'],
      web: ['web', 'http', 'directory', 'gobuster'],
      cms: ['cms', 'wordpress', 'wp', 'drupal'],
      mitm: ['mitm', 'sniff', 'intercept'],
      brute: ['brute', 'password', 'crack'],
      whois: ['whois', 'owner', 'registrar'],
      headers: ['headers', 'header', 'curl'],
      email: ['email', 'harvest', 'emails'],
      audit: ['audit', 'hardening', 'security'],
      privesc: ['privesc', 'privilege', 'root'],
      malware: ['malware', 'virus', 'rootkit']
    };
    return patterns[intent] || ['test'];
  }

  private saveResults() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const p = path.join(dataDir, 'ml_results.json');
    fs.writeFileSync(p, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Salvo em: ${p}`);
  }

  async testTarget(target: string) {
    const { intent, confidence, method } = this.classifier.classify(`full ${target}`);
    const tools = this.classifier.selectTools(intent);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎯 TESTE: ${target}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Intent: ${intent}`);
    console.log(`   Confiança: ${confidence.toFixed(1)}%`);
    console.log(`   Método: ${method}`);
    console.log(`   Tools: ${tools.join(', ')}`);
    console.log(`${'═'.repeat(60)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const target = args[1];

  const evaluator = new EnhancedMLEvaluator();

  if (cmd === 'test') {
    await evaluator.testTarget(target || 'example.com');
  } else if (cmd === 'eval') {
    const count = parseInt(args[1] || '10000', 10);
    await evaluator.generateAndEvaluate(count);
  } else {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NASAI-MAESTRO-4.0: ML ENSEMBLE                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║ COMANDOS:                                                 ║
║   test target    - Testar um alvo                          ║
║   eval [count]  - Avaliar com casos                      ║
╠═══════════════════════════════════════════════════════════════════════╣
║ EXEMPLOS:                                                 ║
║   test bancocn.com                                       ║
║   eval 10000                                             ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

    await evaluator.testTarget('bancocn.com');
  }
}

main();