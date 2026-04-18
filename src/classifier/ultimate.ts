import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class UltimateClassifier {
  private patterns: Map<string, string[]> = new Map();
  private weights: Map<string, number> = new Map();
  private keywords: Map<string, string[]> = new Map();
  private userFeedback: Map<string, { intent: string; count: number }> = new Map();
  private CONFIDENCE_THRESHOLD = 50;
  private VERSION = "7.0-CLEAN";
  private RF_MULTIPLIER = 28;

  constructor() {
    this.initializeCleanPatterns();
    this.initializeWeights();
    this.loadKnowledge();
  }

  private initializeWeights() {
    for (const intent of this.patterns.keys()) {
      let baseWeight = 3.0;
      if (intent === 'vuln' || intent === 'web' || intent === 'ssl' || intent === 'recon') baseWeight = 4.0;
      if (intent === 'ad' || intent === 'cloud' || intent === 'api') baseWeight = 4.5;
      this.weights.set(intent, baseWeight);
    }
  }

  private deduplicatePatterns(patterns: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of patterns) {
      const normalized = p.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(p);
      }
    }
    return unique;
  }

  private initializeCleanPatterns() {
    const cleanData: Record<string, string[]> = {
      vuln: [
        'vulnerability', 'cve', 'sqli', 'xss', 'sql injection', 'rce', 'exploit', 'nikto', 'nuclei',
        'vuln scan', 'vuln check', 'penetration test', 'pen test', 'security test', 'cve scan',
        'check sqli', 'test xss', 'find sql injection', 'check command injection', 'detect rce', 'test remote execution',
        'broken access', 'broken auth', 'security issue', 'security bug', 'security vulnerability',
        'cve search', 'cve lookup', 'exploit check', 'vulnerability assessment', 'security flaw'
      ],
      web: [
        'web', 'website', 'directory', 'dirb', 'gobuster', 'ffuf', 'dirbuster', 'directory busting',
        'web scan', 'web enum', 'web attack', 'find directories', 'find hidden', 'admin panel', 'login page',
        'web directory', 'bruteforce directory', 'discover url', 'enumerate url', 'web brute', 'web discovery',
        'scan website', 'probe website', 'bust directory', 'scan web directory', 'enumerate web'
      ],
      recon: [
        'recon', 'reconnaissance', 'subdomain', 'subdomains', 'subfinder', 'findomain', 'amass', 'assetfinder',
        'subdomain enumeration', 'subdomain discovery', 'find subdomains', 'brute subdomains', 'passive recon', 'active recon',
        'domain discovery', 'domain enum', 'recon all', 'full recon', 'osint', 'information gathering',
        'google dorks', 'email harvest', 'reverse dns', 'dns enum', 'fierce', 'subenum',
        'enum subdomains', 'discover subdomains', 'probe subdomains', 'subdomain scan'
      ],
      scan: [
        'port scan', 'network scan', 'nmap', 'scan ports', 'service scan', 'tcp scan', 'udp scan',
        'scan all ports', 'quick scan', 'intense scan', 'syn scan', 'connect scan', 'ping scan',
        'host discovery', 'scan host', 'enumerate ports', 'check ports', 'service enum'
      ],
      mitm: [
        'mitm', 'man in the middle', 'ettercap', 'bettercap', 'responder', 'arp spoof', 'arp poison',
        'dns spoof', 'ssl strip', 'traffic intercept', 'network intercept', 'session hijack', 'cookie steal',
        'network sniff', 'packet sniff', 'traffic capture', 'intercept traffic', 'arp spoofing', 'dns poisoning',
        'evil twin', 'rogue ap', 'wifi mitm', 'wireless mitm', 'network interception'
      ],
      brute: [
        'brute', 'bruteforce', 'brute force', 'password crack', 'hydra', 'medusa', 'john', 'hashcat',
        'credential attack', 'credential stuff', 'password spray', 'wordlist', 'dictionary attack',
        'login brute', 'login crack', 'force login', 'guess login', 'crack login',
        'password attack', 'credential brute', 'login attack', 'brute credentials'
      ],
      whois: [
        'whois', 'domain whois', 'whois lookup', 'domain lookup', 'domain info', 'domain owner',
        'domain age', 'domain created', 'domain expiry', 'domain registration', 'registrar', 'nameserver',
        'check whois', 'lookup whois', 'domain details', 'owner info', 'check domain', 'query domain'
      ],
      dns: [
        'dns', 'dig', 'nslookup', 'mx record', 'txt record', 'ns record', 'a record',
        'dns lookup', 'dns query', 'dns check', 'dns records', 'dns enum', 'dnsenum',
        'dns zone transfer', 'axfr', 'dnssec', 'reverse dns', 'resolve', 'nameserver',
        'check mx', 'check spf', 'dmarc', 'dkim', 'full dns enumeration'
      ],
      email: [
        'email', 'emails', 'harvest', 'theharvester', 'harvest emails', 'find email',
        'collect emails', 'email collection', 'email finder', 'email scraper', 'gather emails',
        'probe email', 'scan email', 'find email addresses', 'harvest email addresses'
      ],
      tech: [
        'tech', 'technology', 'whatweb', 'wappalyzer', 'fingerprint', 'detect tech', 'detect technology',
        'detect server', 'detect framework', 'identify technology', 'server identification', 'service identification',
        'detect cms', 'detect programming language', 'probe tech', 'analyze tech', 'technology detection',
        'detect backend', 'detect frontend', 'tech scan', 'identify framework'
      ],
      headers: [
        'http header', 'http headers', 'check header', 'security header', 'csp', 'x-frame-options', 'hsts',
        'strict-transport-security', 'content-security-policy', 'analyze header', 'analyze headers', 'verify headers',
        'check csp', 'check hsts', 'check x-frame', 'check cors', 'header check'
      ],
      cms: [
        'cms', 'wordpress', 'drupal', 'joomla', 'magento', 'wpscan', 'droopescan',
        'cms scan', 'cms detection', 'wordpress scan', 'drupal scan', 'joomla scan', 'wordpress vuln',
        'detect cms', 'identify cms', 'which cms', 'wordpress detection', 'cms vulnerability'
      ],
      ssl: [
        'ssl', 'tls', 'certificate', 'cert', 'ssl check', 'tls check', 'cert check',
        'ssl certificate', 'tls certificate', 'https check', 'check ssl', 'check tls', 'verify ssl',
        'cipher', 'cipher suite', 'heartbleed', 'poodle', 'beast', 'testssl', 'check https'
      ],
      audit: [
        'audit', 'security audit', 'system audit', 'compliance', 'lynis', 'hardening', 'cis', 'stig',
        'security check', 'system check', 'verify hardening', 'security assessment', 'risk assessment',
        'security hardening', 'system hardening', 'verify security', 'security posture', 'security evaluation',
        'security baseline', 'baseline check', 'compliance check', 'security benchmark'
      ],
      malware: [
        'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware', 'scan malware',
        'trojan', 'backdoor', 'keylogger', 'spyware', 'adware', 'infected', 'check virus',
        'scan rootkit', 'detect virus', 'probe malware', 'analyze malware', 'ransomware', 'detect ransomware',
        'yara', 'virustotal', 'malware analysis', 'malware detection', 'detect malicious'
      ],
      full: [
        'full scan', 'complete scan', 'full assessment', 'comprehensive', 'full test', 'complete test', 'full audit',
        'full penetration', 'pentest', 'penetration test', 'everything', 'all', 'complete', 'full coverage',
        'full vulnerability', 'full recon', 'full enumeration', 'all-in-one', 'all tests', 'comprehensive test'
      ],
      cloud: [
        'cloud', 'aws', 'azure', 'gcp', 's3', 'bucket', 'cloud enum', 'aws enum', 'azure enum',
        's3 bucket', 'bucket enum', 'cloud scan', 'cloud vuln', 'cloud security', 'cloud assessment',
        'public bucket', 'bucket takeover', 'cloud misconfig', 'aws scan', 'azure scan', 'gcp scan',
        'cloud discovery', 'cloud footprint', 'enumerate cloud', 'iam enum', 'lambda', 'serverless'
      ],
      api: [
        'api', 'rest', 'graphql', 'endpoint', 'api scan', 'api fuzz', 'api enum', 'api vuln',
        'swagger', 'openapi', 'wsdl', 'api security', 'api test', 'api endpoint',
        'graphql introspection', 'rest fuzz', 'api pen test', 'jwt', 'oauth', 'api auth',
        'api rate limit', 'api dos', 'parameter fuzzing', 'api mass assignment', 'detect api'
      ],
      ad: [
        'active directory', 'ldap', 'kerberos', 'bloodhound', 'ad scan', 'ad enum', 'domain admin',
        'domain controller', 'crackmapexec', 'impacket', 'enum4linux', 'kerberoast', 'golden ticket',
        'silver ticket', 'pass the hash', 'pth', 'dcsync', 'mimikatz', 'lsass', 'sam dump',
        'ntlm relay', 'smb relay', 'acl abuse', 'domain privesc', 'lateral movement', 'psexec', 'wmiexec'
      ],
      iot: [
        'iot', 'firmware', 'embedded', 'device', 'scada', 'plc', 'ics', 'industrial',
        'firmware analysis', 'firmware extract', 'binwalk', 'firmalyze', 'smart device',
        'mqtt', 'zigbee', 'bluetooth', 'modbus', 'coap', 'device scan', 'device fingerprint',
        'iot scan', 'iot vuln', 'iot security', 'firmware security', 'device vulnerability'
      ],
      postexploit: [
        'postexploit', 'post exploit', 'persistence', 'backdoor', 'rootkit', 'maintain access',
        'keylogger', 'screen capture', 'screenshot', 'webcam', 'microphone',
        'credential harvest', 'password dump', 'lsass dump', 'secretsdump', 'privilege escalate',
        'privesc', 'sudo privesc', 'suid exploit', 'meterpreter', 'reverse shell', 'bind shell',
        'webshell', 'lateral movement', 'pivot', 'port forward', 'socks proxy',
        'exfil', 'exfiltration', 'data theft', 'credential theft'
      ]
    };

    for (const [intent, patterns] of Object.entries(cleanData)) {
      this.patterns.set(intent, this.deduplicatePatterns(patterns));
    }
  }

  private loadKnowledge() {
    const knowledgePath = path.join(__dirname, '../data/knowledge.json');
    if (fs.existsSync(knowledgePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
        for (const entry of data) {
          const keywords = entry.keywords || [];
          for (const kw of keywords) {
            if (!this.keywords.has(kw.toLowerCase())) {
              this.keywords.set(kw.toLowerCase(), []);
            }
            this.keywords.get(kw.toLowerCase())!.push((entry.content || '').substring(0, 100));
          }
        }
      } catch (e) {}
    }
  }

  private classifySimple(text: string): { intent: string; confidence: number; method: string } {
    const input = text.toLowerCase().trim();
    const scores: Map<string, number> = new Map();

    const domainMatch = input.match(/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}(.[a-z]{2,})?$/);
    const intentWithDomain = input.match(/^(vuln|web|recon|scan|full|mitm|brute|cloud|api|ad|iot|postexploit|audit|malware|ssl)\s+[a-z0-9][a-z0-9-]*\.[a-z]{2,}(.[a-z]{2,})?$/);
    
    if (intentWithDomain) {
      const intentPart = intentWithDomain[1];
      return { intent: intentPart, confidence: 85, method: 'Intent+Domain' };
    }
    
    if (domainMatch) {
      return { intent: 'full', confidence: 85, method: 'Domain' };
    }

    for (const [intent, pats] of this.patterns.entries()) {
      let score = 0;
      const weight = this.weights.get(intent) || 1.0;

      for (const pat of pats) {
        if (input === pat) {
          score += 30 * weight;
        } else if (input.startsWith(pat + ' ') || input.startsWith(pat)) {
          score += 25 * weight;
        } else if (pat.length >= 4 && input.includes(pat)) {
          score += 15 * weight;
        }
      }

      scores.set(intent, score);
    }

    let bestIntent = 'full';
    let bestScore = 0;
    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const confidence = bestScore > 0 ? Math.min(95, bestScore / 10 + 60) : 0;
    return { intent: bestIntent, confidence, method: confidence > 70 ? 'Pattern-Match' : 'Fallback' };
  }

  classify(text: string): { intent: string; confidence: number; method: string } {
    const input = text.toLowerCase().trim();

    const feedback = this.userFeedback.get(input);
    if (feedback) {
      return { intent: feedback.intent, confidence: 95, method: 'User-Feedback' };
    }

    const resolved = this.resolveContext(input);
    if (resolved) return resolved;

    return this.classifySimple(input);
  }

  private resolveContext(input: string): { intent: string; confidence: number; method: string } | null {
    const adCtx = ['active directory', 'kerberos', 'bloodhound', 'ldap', 'kerberoast', 'golden ticket', 'pass the hash', 'dcsync', 'mimikatz'];
    const mitmCtx = ['man in the middle', 'ettercap', 'bettercap', 'responder', 'arp poison', 'ssl strip', 'dns spoof'];
    const iotCtx = ['iot', 'firmware', 'scada', 'plc', 'modbus', 'zigbee', 'mqtt'];
    const postCtx = ['mimikatz', 'persistence', 'backdoor', 'rootkit', 'keylog', 'exfil', 'lateral', 'pivot'];
    const vulnCtx = ['vulnerability', 'cve', 'sqli', 'xss', 'rce', 'nikto', 'nuclei', 'exploit'];

    const adScore = adCtx.filter(k => input.includes(k)).length;
    const mitmScore = mitmCtx.filter(k => input.includes(k)).length;
    const iotScore = iotCtx.filter(k => input.includes(k)).length;
    const postScore = postCtx.filter(k => input.includes(k)).length;
    const vulnScore = vulnCtx.filter(k => input.includes(k)).length;

    const ranked = [
      { intent: 'ad', score: adScore },
      { intent: 'mitm', score: mitmScore },
      { intent: 'iot', score: iotScore },
      { intent: 'postexploit', score: postScore },
      { intent: 'vuln', score: vulnScore }
    ].sort((a, b) => b.score - a.score);

    if (ranked[0].score >= 2) {
      return { intent: ranked[0].intent, confidence: 92, method: 'Context-Match' };
    }

    return null;
  }

  evaluate(): void {
    console.log('\n🔍 Avaliação Ultimate v7.0-CLEAN...\n');

    let correct = 0;
    let total = 0;
    const byIntent: Record<string, { correct: number; total: number }> = {};

    for (const [intent, pats] of this.patterns.entries()) {
      for (const pat of pats) {
        const test = `${pat} example.com`;
        const { intent: detected } = this.classify(test);
        const isCorrect = detected === intent;

        if (isCorrect) correct++;
        total++;

        if (!byIntent[intent]) byIntent[intent] = { correct: 0, total: 0 };
        byIntent[intent].total++;
        if (isCorrect) byIntent[intent].correct++;
      }
    }

    const accuracy = Math.round(correct / total * 100);

    console.log(`${'═'.repeat(50)}`);
    console.log(`📊 ULTIMATE CLASSIFIER v7.0-CLEAN`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`\n   TOTAL: ${total}`);
    console.log(`   ACERTOS: ${correct} (${accuracy}%)`);

    console.log(`\n   POR INTENT:`);
    for (const [intent, stats] of Object.entries(byIntent)) {
      const acc = Math.round(stats.correct / stats.total * 100);
      const icon = acc >= 90 ? '✅' : acc >= 70 ? '⚠️' : '❌';
      console.log(`   ${icon} ${intent}: ${stats.correct}/${stats.total} (${acc}%)`);
    }
    console.log(`${'═'.repeat(50)}`);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║      NASAI-MAESTRO-7.0-CLEAN          ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const classifier = new UltimateClassifier();
  const args = process.argv.slice(2);

  if (args[0] === 'eval') {
    classifier.evaluate();
  } else if (args.length > 0) {
    const test = args.join(' ');
    const result = classifier.classify(test);
    console.log(`\n📥 Input: "${test}"`);
    console.log(`\n🎯 Resultado:`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Confiança: ${result.confidence.toFixed(1)}%`);
    console.log(`   Método: ${result.method}`);
  }
}

main();