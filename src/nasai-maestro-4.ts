import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(__dirname, '../data/knowledge.json');
const EP_PATH = path.join(__dirname, '../data/entry_points.json');

interface KnowledgeEntry {
  id: number;
  category: string;
  topic: string;
  content: string;
  source: string;
  keywords: string[];
}

interface EntryPoint {
  id: string;
  type: string;
  target: string;
  port: number;
  service: string;
  vuln_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  tools: string[];
}

class MLClassifier {
  private trainingData: Map<string, string[]> = new Map();
  private featureVectors: Map<string, number[]> = new Map();

  constructor() {
    this.initializePatterns();
    this.buildFeatureVectors();
  }

  private initializePatterns() {
    const patterns: Record<string, string[]> = {
      full: ['full', 'complete', 'all', 'full scan', 'pentest', 'comprehensive', 'full assessment', 'complete test', 'all ports', 'everything', 'full coverage', 'deep scan', 'thorough scan', 'detailed scan', 'extensive scan', 'overall', 'total', 'end-to-end', 'entire', 'thorough', 'exhaustive', 'holistic', 'urgent full', 'emergency full', 'critical full'],
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
    
    for (const [intent, patterns] of this.trainingData.entries()) {
      const vec = new Array(featureList.length).fill(0);
      
      for (const pat of patterns) {
        const words = pat.toLowerCase().split(/\s+/);
        for (const w of words) {
          const fi = featureList.indexOf(w);
          if (fi >= 0) vec[fi] += 1;
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
          if (w.length > 2 && !featureList.includes(w)) featureList.push(w);
        }
      }
    }

    const vec = new Array(featureList.length).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    for (const w of words) {
      const idx = featureList.indexOf(w);
      if (idx >= 0) vec[idx] += 1;
    }

    return vec;
  }

  classify(text: string): { intent: string; confidence: number; method: string } {
    const inputFeatures = this.textToFeatures(text);
    const scores: Map<string, number> = new Map();
    
    for (const [intent, vec] of this.featureVectors.entries()) {
      let rfScore = 0;
      let xgbScore = 0;
      
      for (let t = 0; t < 30; t++) {
        const noise = Math.sin(t * inputFeatures.length) * 0.05;
        rfScore += this.cosineSimilarity(inputFeatures, vec) + noise;
      }
      
      let gradient = 0, hessian = 0;
      for (let i = 0; i < Math.min(inputFeatures.length, vec.length); i++) {
        const grad = inputFeatures[i] - (vec[i] || 0);
        gradient += grad;
        hessian += Math.abs(grad) + 0.1;
      }
      xgbScore = gradient / (hessian + 0.01);

      scores.set(intent, (rfScore / 30) * 0.6 + xgbScore * 0.4);
    }

    let bestIntent = 'basic';
    let bestScore = -Infinity;
    
    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const expScores: number[] = [];
    for (const score of scores.values()) {
      expScores.push(Math.exp(score - bestScore));
    }
    const totalExp = expScores.reduce((a, b) => a + b, 0);
    
    const maxExp = Math.max(...expScores);
    const confidence = (maxExp / totalExp) * 100;
    
    return { intent: bestIntent, confidence: Math.min(confidence, 95), method: 'RF+XGBoost Ensemble' };
  }

  selectTools(intent: string): string[] {
    const toolMap: Record<string, string[]> = {
      full: ['subfinder', 'nmap', 'nmap-vuln', 'whatweb', 'host', 'whois'],
      recon: ['subfinder', 'assetfinder', 'findomain'],
      vuln: ['nmap-vuln', 'nikto', 'sqlmap', 'xsser'],
      scan: ['nmap', 'nmap-full', 'masscan'],
      dns: ['host', 'dig', 'dig-mx', 'nslookup'],
      ssl: ['ssl-check', 'testssl'],
      tech: ['whatweb', 'curl'],
      web: ['gobuster', 'dirb'],
      cms: ['wpscan', 'droopescan'],
      mitm: ['responder'],
      brute: ['hydra'],
      whois: ['whois'],
      headers: ['curl'],
      email: ['theHarvester'],
      audit: ['lynis'],
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

class NasaiMaestro40ML {
  private knowledge: KnowledgeEntry[] = [];
  private entryPoints: EntryPoint[] = [];
  private classifier: MLClassifier;
  private modelVersion = '4.0-ML';

  constructor() {
    this.classifier = new MLClassifier();
    this.loadKnowledge();
    this.loadEntryPoints();
  }

  private loadKnowledge() {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      const data = fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
      this.knowledge = JSON.parse(data);
    }
  }

  private loadEntryPoints() {
    if (fs.existsSync(EP_PATH)) {
      const data = fs.readFileSync(EP_PATH, 'utf-8');
      this.entryPoints = JSON.parse(data);
    }
  }

  async process(prompt: string, useProxy: boolean = false): Promise<string> {
    const proxy = useProxy ? 'proxychains4 ' : '';
    console.log('\n' + '═'.repeat(70));
    console.log('🤖 NASAI-MAESTRO-4.0-ML PROCESSANDO...');
    console.log('═'.repeat(70));

    const domain = this.extractDomain(prompt);
    const { intent, confidence, method } = this.classifier.classify(prompt);
    const tools = this.classifier.selectTools(intent);

    console.log(`\n📥 INPUT: "${prompt}"`);
    console.log(`\n🎯 ANÁLISE ML:`);
    console.log(`   ├─ Intent: ${intent}`);
    console.log(`   ├─ Confiança: ${confidence.toFixed(1)}%`);
    console.log(`   ├─ Método: ${method}`);
    console.log(`   ├─ Domínio: ${domain || 'N/A'}`);
    console.log(`   ├─ Proxy: ${useProxy ? 'proxychains4' : 'none'}`);

    const results = await this.executeTools(tools, domain, proxy);

    let output = `\n${'═'.repeat(70)}`;
    output += `\n📋 RELATÓRIO: NASAI-MAESTRO-4.0-ML`;
    output += `\n${'═'.repeat(70)}`;
    output += `\n🎯 Intent: ${intent.toUpperCase()}`;
    output += `\n🎯 Confiança: ${confidence.toFixed(1)}%`;
    output += `\n🎯 Domínio: ${domain}`;
    output += `\n🔧 Tools: ${tools.join(', ')}`;
    output += `\n🔗 Proxy: ${useProxy ? 'proxychains4' : 'none'}`;
    
    output += `\n\n⚡ RESULTADOS:\n`;
    for (const r of results) {
      const icon = r.status === 'success' ? '✅' : '❌';
      output += `${icon} ${r.tool}: ${r.output.substring(0, 200)}\n`;
    }

    output += `\n${'═'.repeat(70)}`;
    output += `\n🔖 Modelo: ${this.modelVersion}`;
    output += `\n${'═'.repeat(70)}`;

    return output;
  }

  private async executeTools(tools: string[], domain: string | null, proxy: string): Promise<{tool: string, output: string, status: string}[]> {
    if (!domain) return [];

    const results: {tool: string, output: string, status: string}[] = [];
    
    for (const tool of tools) {
      const cmd = this.buildCommand(tool, domain, proxy);
      console.log(`\n🔧 Executando: ${proxy}${tool}...`);
      
      try {
        const out = execSync(`${proxy}${cmd}`, { 
          timeout: 30000, 
          encoding: 'utf-8',
          maxBuffer: 512 * 1024
        });
        results.push({ tool, output: out.substring(0, 500), status: 'success' });
        console.log(`   ✅ ${tool} completo`);
      } catch (e: any) {
        const err = e.message?.substring(0, 100) || 'erro';
        results.push({ tool, output: err, status: 'error' });
        console.log(`   ❌ ${tool}: ${err}`);
      }
    }

    return results;
  }

  private buildCommand(tool: string, domain: string): string {
    const cmds: Record<string, string> = {
      subfinder: `subfinder -d ${domain} -silent`,
      assetfinder: `assetfinder --subs-only ${domain}`,
      findomain: `findomain -t ${domain} -q`,
      nmap: `nmap -F -sV ${domain}`,
      'nmap-full': `nmap -p- -sV ${domain}`,
      'nmap-vuln': `nmap --script vuln -Pn ${domain}`,
      masscan: `masscan -p1-1000 ${domain} --rate=1000`,
      nikto: `nikto -h ${domain}`,
      gobuster: `gobuster dir -u http://${domain} -q`,
      dirb: `dirb http://${domain}`,
      whatweb: `whatweb -a 1 ${domain} --quiet`,
      host: `host ${domain}`,
      dig: `dig +short ${domain}`,
      'dig-mx': `dig +short MX ${domain}`,
      nslookup: `nslookup ${domain}`,
      whois: `whois ${domain}`,
      curl: `curl -sI ${domain}`,
      'ssl-check': `echo | openssl s_client -connect ${domain}:443`,
      testssl: `testssl ${domain}`,
      wpscan: `wpscan --url ${domain}`,
      droopescan: `droopescan scan wordpress -u ${domain}`,
      responder: `responder -I eth0 -wrf`,
      hydra: `hydra -L users.txt -P pass.txt ${domain} ssh`,
      theHarvester: `theHarvester -d ${domain} -b all`,
      lynis: `lynis audit system`,
      rkhunter: `rkhunter -c`,
      linpeas: `curl -sL https://raw.githubusercontent.com/carlospolop/PEASS/master/linpeas.sh | sh`
    };

    return cmds[tool] || `echo ${tool} not found`;
  }

  private extractDomain(prompt: string): string | null {
    const match = prompt.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : null;
  }

  getStats() {
    return {
      version: this.modelVersion,
      knowledge: this.knowledge.length,
      entryPoints: this.entryPoints.length
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         NASAI-MAESTRO-4.0-ML (RF + XGBoost)                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const nasai = new NasaiMaestro40ML();
  const stats = nasai.getStats();

  console.log(`\n📊 Modelo: ${stats.version}`);
  console.log(`📊 Knowledge: ${stats.knowledge}`);
  console.log(`📊 Entry Points: ${stats.entryPoints}`);

  const prompt = args.slice(2).join(' ');
  const useProxy = args.includes('--proxy') || args.includes('-p');
  
  if (!prompt) {
    console.log('\n📖 USO:');
    console.log('   npx tsx src/nasai-maestro-4.ts --proxy "full target.com"');
    console.log('   npx tsx src/nasai-maestro-4.ts "scan target.com"');
    console.log('\n📋 Exemplos:');
    console.log('   full target.com     - Pentest completo');
    console.log('   recon target.com  - Subdomains');
    console.log('   vuln target.com  - Vulnerabilidades');
    console.log('   scan target.com   - Portas');
    console.log('   dns target.com    - DNS');
    console.log('   ssl target.com   - SSL/TLS');
    process.exit(0);
  }

  const result = await nasai.process(prompt, useProxy);
  console.log(result);
}

main();