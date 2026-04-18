import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(__dirname, '../data/knowledge.json');
const PDF_DIR = path.join(__dirname, '../pdfs');
const USERS_DIR = path.join(__dirname, '../data/user_targets.json');
const LEARNING_DIR = path.join(__dirname, '../data/learning.json');

interface KnowledgeEntry {
  id: number;
  category: string;
  topic: string;
  content: string;
  source: string;
  keywords: string[];
}

interface UserTarget {
  id: string;
  domain: string;
  intent: string;
  tools: string[];
  results: any;
  timestamp: string;
  feedback?: 'correct' | 'incorrect';
  learned: boolean;
}

interface LearningCase {
  input: string;
  intent: string;
  correctIntent: string;
  feedback: 'positive' | 'negative';
  timestamp: string;
}

class NasaiMaestroLearning {
  private knowledge: KnowledgeEntry[] = [];
  private trainingData: Map<string, string[]> = new Map();
  private intentWeights: Map<string, number> = new Map();
  private userTargets: UserTarget[] = [];
  private learningCases: LearningCase[] = [];
  private modelVersion = '4.0-Learning';
  private pdfKnowledge: Map<string, string[]> = new Map();

  constructor() {
    this.loadKnowledge();
    this.loadUserTargets();
    this.loadLearning();
    this.initializePatterns();
    this.extractPDFKnowledge();
  }

  private loadKnowledge() {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      const data = fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
      this.knowledge = JSON.parse(data);
    }
  }

  private loadUserTargets() {
    if (fs.existsSync(USERS_DIR)) {
      const data = fs.readFileSync(USERS_DIR, 'utf-8');
      this.userTargets = JSON.parse(data);
    }
  }

  private loadLearning() {
    if (fs.existsSync(LEARNING_DIR)) {
      const data = fs.readFileSync(LEARNING_DIR, 'utf-8');
      this.learningCases = JSON.parse(data);
    }
  }

  private extractPDFKnowledge() {
    if (!fs.existsSync(PDF_DIR)) return;

    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    
    for (const entry of this.knowledge) {
      for (const kw of entry.keywords) {
        if (!this.pdfKnowledge.has(kw)) {
          this.pdfKnowledge.set(kw, []);
        }
        this.pdfKnowledge.get(kw)!.push(entry.content.substring(0, 200));
      }
    }

    console.log(`📚 PDF Knowledge: ${this.pdfKnowledge.size} keywords extraídos`);
  }

  private initializePatterns() {
    this.trainingData.set('full', [
      'full', 'complete', 'all', 'full scan', 'pentest', 'comprehensive', 'full assessment', 'complete test', 'all ports', 'everything', 'full coverage', 'deep scan', 'thorough scan', 'detailed scan', 'extensive scan', 'overall', 'total', 'end-to-end', 'entire', 'thorough', 'exhaustive', 'holistic', 'urgent full', 'emergency full', 'critical full', 'assess', 'evaluate', 'test everything'
    ]);

    this.trainingData.set('recon', [
      'recon', 'subdomain', 'subdomains', 'enum', 'find subdomains', 'reconnaissance', 'enumerate', 'discover', 'find domains', 'subenum', 'subfinder', 'asset finder', 'dns enum', 'domain discovery', 'brute subdomains', 'passive recon', 'active recon', 'osint', 'information gathering', 'subdomain enumeration', 'domain enumeration', 'finding subdomains', 'look for subdomains', 'get all subdomains', 'list subdomains', 'active directory', 'dns zone transfer', 'whois enum', 'email harvest', 'google dorks', 'gather', 'find'
    ]);

    this.trainingData.set('vuln', [
      'vuln', 'vulnerability', 'vulnerabilities', 'exploit', 'exploits', 'security', 'hack', 'hacking', 'cve', 'sqli', 'xss', 'sql injection', 'injection', 'command injection', 'rce', 'zero-day', '0day', '0-day', 'new exploit', 'security check', 'vulnerability scan', 'vuln scan', 'vuln check', 'find exploits', 'find vulnerabilities', 'detect vuln', 'security audit', 'penetration test', 'exploit check', 'vulnerability assessment', 'nikto', 'find vuln', 'test vuln', 'check exploit', 'scan vuln', 'exploit scan', 'xss scan', 'csrf', 'ssrf', 'lfi', 'rfi', 'xxe', 'test', 'check', 'audit'
    ]);

    this.trainingData.set('scan', [
      'scan', 'port', 'ports', 'port scan', 'nmap', 'scan ports', 'portscan', 'scan port', 'find open ports', 'check ports', 'open ports', 'discover ports', 'tcp scan', 'udp scan', 'syn scan', 'connect scan', 'scan network', 'network scan', 'host discovery', 'ping sweep', 'latency', 'check port', 'quick scan', 'fast scan', 'port discovery', 'service scan', 'version detection', 'os detection', 'scan for open ports', 'list ports', 'check services', 'service detection', 'ports', 'enumerate ports'
    ]);

    this.trainingData.set('dns', [
      'dns', 'dig', 'mx', 'txt', 'dns lookup', 'nslookup', 'nameserver', 'ns record', 'mx record', 'txt record', 'a record', 'aaaa record', 'cname record', 'soa record', 'dns records', 'dns check', 'dns query', 'resolve', 'resolution', 'check dns', 'verify dns', 'dns info', 'dns information', 'domain resolution', 'check nameserver', 'check mx', 'check txt', 'check spf', 'dmarc', 'dkim', 'verify', 'resolve'
    ]);

    this.trainingData.set('ssl', [
      'ssl', 'tls', 'certificate', 'cert', 'https', 'ssl check', 'tls check', 'cert check', 'ssl certificate', 'tls certificate', 'https check', 'check ssl', 'check tls', 'verify ssl', 'check certificate', 'test ssl', 'test tls', 'certificate info', 'ssl info', 'cipher', 'ciphers', 'cipher suite', 'heartbleed', 'poodle', 'beast', 'freak', 'verify', 'test'
    ]);

    this.trainingData.set('tech', [
      'tech', 'technology', 'server', 'framework', 'whatweb', 'detect', 'technologies', 'detect tech', 'detect server', 'detect framework', 'identify', 'identify technology', 'identify server', 'fingerprint', 'fingerprinting', 'web fingerprint', 'server identification', 'service identification', 'detect cms', 'detect programming language', 'detect backend', 'detect frontend', 'probe tech', 'analyze tech', 'technology detection', 'server detection', 'framework detection', 'what technology', 'which server', 'which framework', 'which cms', 'identify', 'fingerprint'
    ]);

    this.trainingData.set('web', [
      'web', 'http', 'website', 'directory', 'dirb', 'gobuster', 'dir', 'directories', 'directory busting', 'directory enumeration', 'web enum', 'find directories', 'find files', 'find pages', 'brute force directory', 'web scan', 'web discovery', 'web brute', 'check website', 'analyze web', 'web analysis', 'http methods', 'http headers', 'web fingerprint', 'web application', 'find hidden', 'hidden files', 'admin panel', 'login page', 'robots.txt', 'sitemap', 'backup files', 'enumerate', 'bust'
    ]);

    this.trainingData.set('cms', [
      'cms', 'wordpress', 'wp', 'drupal', 'joomla', 'magento', 'shopify', 'wpscan', 'joomscan', 'droopescan', 'cms scan', 'cms detection', 'wordpress scan', 'drupal scan', 'joomla scan', 'wordpress vuln', 'drupal vuln', 'joomla vuln', 'cms exploit', 'cms vulnerability', 'detect cms', 'identify cms', 'which cms', 'wordpress detection', 'plugin vulns', 'theme vulns', 'wp plugin'
    ]);

    this.trainingData.set('mitm', [
      'mitm', 'man in the middle', 'sniff', 'sniffer', 'intercept', 'arp', 'arp spoofing', 'arp poison', 'dns spoofing', 'spoof', 'poison', 'ettercap', 'bettercap', 'responder', 'network sniff', 'packet sniff', 'traffic capture', 'network capture', 'intercept traffic', 'ssl strip', 'hijack', 'session hijack', 'cookie steal'
    ]);

    this.trainingData.set('brute', [
      'brute', 'bruteforce', 'brute force', 'password', 'crack', 'cracker', 'hydra', 'medusa', 'crack password', 'guess password', 'login brute', 'credential stuff', 'password spray', 'wordlist', 'dictionary attack'
    ]);

    this.trainingData.set('whois', [
      'whois', 'who is', 'owner', 'registrar', 'registration', 'registrant', 'domain info', 'domain owner', 'domain age', 'domain created', 'domain expiry', 'domain status', 'name servers', 'registrar info'
    ]);

    this.trainingData.set('headers', [
      'header', 'headers', 'http header', 'http headers', 'curl', 'check header', 'check headers', 'analyze header', 'security header', 'csp', 'x-frame-options', 'hsts'
    ]);

    this.trainingData.set('email', [
      'email', 'emails', 'harvest', 'theharvester', 'harvest emails', 'find email', 'find emails', 'collect emails', 'email collection'
    ]);

    this.trainingData.set('audit', [
      'audit', 'hardening', 'lynis', 'security audit', 'system audit', 'compliance', 'cis', 'stig'
    ]);

    this.trainingData.set('privesc', [
      'privesc', 'privilege', 'escalation', 'privilege escalation', 'root', 'sudo', 'sudoers', 'suid', 'capabilities', 'get root'
    ]);

    this.trainingData.set('malware', [
      'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware', 'scan malware', 'virus scan'
    ]);

    this.intentWeights.set('full', 1.2);
    this.intentWeights.set('recon', 1.3);
    this.intentWeights.set('vuln', 1.2);
    this.intentWeights.set('scan', 1.2);
    this.intentWeights.set('dns', 1.3);
    this.intentWeights.set('ssl', 1.3);
    this.intentWeights.set('tech', 1.2);
    this.intentWeights.set('web', 1.1);
    this.intentWeights.set('cms', 1.1);
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

    const learnedScores = this.applyLearnedPatterns(p);
    for (const [intent, score] of learnedScores.entries()) {
      const current = scores.get(intent) || 0;
      scores.set(intent, current + score * 3);
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
      intent: confidence > 20 ? bestIntent : 'basic',
      confidence: Math.min(confidence, 95)
    };
  }

  private applyLearnedPatterns(prompt: string): Map<string, number> {
    const scores = new Map<string, number>();
    const p = prompt.toLowerCase();

    for (const lc of this.learningCases) {
      if (lc.feedback === 'positive' && p.includes(lc.input.toLowerCase())) {
        const current = scores.get(lc.correctIntent) || 0;
        scores.set(lc.correctIntent, current + 5);
      }
    }

    return scores;
  }

  selectTools(intent: string): string[] {
    const toolMap: Record<string, string[]> = {
      full: ['subfinder', 'nmap', 'nmap-vuln', 'whatweb', 'host', 'whois'],
      recon: ['subfinder', 'assetfinder', 'findomain'],
      vuln: ['nmap-vuln', 'nikto'],
      scan: ['nmap', 'masscan'],
      dns: ['host', 'dig', 'dig-mx'],
      ssl: ['ssl-check'],
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

  async addTarget(domain: string, intent?: string): Promise<string> {
    const detectedIntent = intent || this.classifyIntent(`scan ${domain}`).intent;
    const tools = this.selectTools(detectedIntent);

    const target: UserTarget = {
      id: `t${Date.now()}`,
      domain,
      intent: detectedIntent,
      tools,
      results: null,
      timestamp: new Date().toISOString(),
      learned: false
    };

    this.userTargets.push(target);
    this.saveUserTargets();

    console.log(`\n✅ Novo alvo adicionado:`);
    console.log(`   Domínio: ${domain}`);
    console.log(`   Intent: ${detectedIntent}`);
    console.log(`   Tools: ${tools.join(', ')}`);

    return `Alvo ${domain} adicionado com intent: ${detectedIntent}`;
  }

  async executeTarget(targetId: string, useProxy: boolean = false): Promise<string> {
    const target = this.userTargets.find(t => t.id === targetId);
    if (!target) return `Alvo não encontrado: ${targetId}`;

    const proxy = useProxy ? 'proxychains4 ' : '';
    console.log(`\n🔍 Executando pentest em: ${target.domain}`);

    let output = `\n${'═'.repeat(60)}\n`;
    output += `📋 PENTEST: ${target.domain}\n`;
    output += `${'═'.repeat(60)}\n`;
    output += `🎯 Intent: ${target.intent}\n`;
    output += `🔗 Proxy: ${useProxy ? 'proxychains4' : 'none'}\n`;
    output += `🔧 Tools: ${target.tools.join(', ')}\n\n`;

    const results: any[] = [];

    for (const tool of target.tools) {
      const cmd = this.buildCommand(tool, target.domain);
      console.log(`\n🔧 Executando: ${proxy}${tool}...`);
      
      
      try {
        const out = execSync(`${proxy}${cmd}`, { 
          timeout: 30000, 
          encoding: 'utf-8',
          maxBuffer: 512 * 1024
        });
        results.push({ tool, output: out.substring(0, 500), status: 'success' });
        output += `✅ ${tool}: ${out.substring(0, 300)}\n`;
        console.log(`   ✅ ${tool} completo`);
      } catch (e: any) {
        const err = e.message?.substring(0, 100) || 'erro';
        results.push({ tool, output: err, status: 'error' });
        output += `❌ ${tool}: ${err}\n`;
        console.log(`   ❌ ${tool}: ${err}`);
      }
    }

    target.results = results;
    target.timestamp = new Date().toISOString();
    this.saveUserTargets();

    output += `\n${'═'.repeat(60)}`;
    return output;
  }

  async learn(input: string, correctIntent: string, feedback: 'positive' | 'negative'): Promise<string> {
    const case_: LearningCase = {
      input,
      intent: this.classifyIntent(input).intent,
      correctIntent,
      feedback,
      timestamp: new Date().toISOString()
    };

    this.learningCases.push(case_);

    this.saveLearning();

    if (feedback === 'positive') {
      const patterns = this.trainingData.get(correctIntent) || [];
      if (!patterns.includes(input.toLowerCase())) {
        patterns.push(input.toLowerCase());
        this.trainingData.set(correctIntent, patterns);
      }
    }

    console.log(`\n📚 Learning atualizado:`);
    console.log(`   Input: ${input}`);
    console.log(`   Correct Intent: ${correctIntent}`);
    console.log(`   Feedback: ${feedback}`);
    console.log(`   Total cases: ${this.learningCases.length}`);

    return `Aprendizado registrado: ${input} -> ${correctIntent}`;
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
      whois: `whois ${domain}`,
      curl: `curl -sI ${domain}`,
      'ssl-check': `echo | openssl s_client -connect ${domain}:443`,
      wpscan: `wpscan --url ${domain}`,
      droopescan: `droopescan scan wordpress -u ${domain}`,
      responder: `responder -I eth0 -wrf`,
      hydra: `hydra -L users.txt -P pass.txt ${domain} ssh`,
      theHarvester: `theHarvester -d ${domain} -b all`,
      lynis: `lynis audit system`,
      rkhunter: `rkhunter -c`,
      linpeas: `curl -sL https://raw.githubusercontent.com/carlospolop/PEASS/master/linpeas.sh | sh`
    };

    return cmds[tool] || `echo ${tool}`;
  }

  private saveUserTargets() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(USERS_DIR, JSON.stringify(this.userTargets, null, 2));
  }

  private saveLearning() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(LEARNING_DIR, JSON.stringify(this.learningCases, null, 2));
  }

  getStats() {
    return {
      version: this.modelVersion,
      knowledge: this.knowledge.length,
      pdfKeywords: this.pdfKnowledge.size,
      userTargets: this.userTargets.length,
      learningCases: this.learningCases.length,
      intents: this.trainingData.size
    };
  }

  listTargets(): string {
    if (this.userTargets.length === 0) {
      return 'Nenhum alvo definido. Use: add <domain>';
    }

    let output = '\n📋 ALVOS DEFINIDOS:\n';
    for (const t of this.userTargets) {
      output += `[${t.id}] ${t.domain} -> ${t.intent} (${t.tools.join(', ')})\n`;
    }
    return output;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         NASAI-MAESTRO-4.0 - LEARNING MODEL                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const nasai = new NasaiMaestroLearning();
  const stats = nasai.getStats();

  console.log(`\n📊 MODELO: ${stats.version}`);
  console.log(`📊 Knowledge: ${stats.knowledge} entries`);
  console.log(`📊 PDF Keywords: ${stats.pdfKeywords}`);
  console.log(`📊 Learning Cases: ${stats.learningCases}`);
  console.log(`📊 Alvos: ${stats.userTargets}`);

  if (command === 'add' && args[1]) {
    const domain = args[1];
    const intent = args[2];
    await nasai.addTarget(domain, intent);
  } 
  else if (command === 'run' && args[1]) {
    const targetId = args[1];
    const useProxy = args.includes('--proxy');
    const result = await nasai.executeTarget(targetId, useProxy);
    console.log(result);
  }
  else if (command === 'learn' && args[1] && args[2]) {
    const input = args[1];
    const correctIntent = args[2];
    const feedback: 'positive' | 'negative' = args[3] as any || 'positive';
    await nasai.learn(input, correctIntent, feedback);
  }
  else if (command === 'list') {
    console.log(nasai.listTargets());
  }
  else if (command === 'targets') {
    console.log(nasai.listTargets());
  }
  else {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    MANUAL DE USO                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║ COMANDOS:                                                      ║
║   add <domain> [intent]  - Adicionar novo alvo                    ║
║   run <target_id>        - Executar pentest no alvo               ║
║   learn <input> <intent>  - Ensinar ao modelo                    ║
║   list / targets         - Listar alvos definidos                ║
║   stats                  - Estatísticas do modelo              ║
╠═══════════════════════════════════════════════════════════════════╣
║ EXEMPLOS:                                                      ║
║   add bancocn.com full    - Adicionar bancocn.com para pentest    ║
║   add syfe.com           - Adicionar syfe.com (intent auto)         ║
║   run t1 --proxy         - Executar com proxychains4             ║
║   learn "scan bank.com" vuln positive                           ║
║   list                  - Ver alvos definidos                 ║
╚═══════════════════════════════════════════════════════════════════╝
`);
  }
}

main();