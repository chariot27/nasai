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
  private phraseScores: Map<string, Map<string, number>> = new Map();
  private excludePatterns: Map<string, string[]> = new Map();
  private intentCategories: Map<string, string> = new Map();
  private userFeedback: Map<string, { intent: string; count: number }> = new Map();
  private CONFIDENCE_THRESHOLD = 50;
  private LOW_CONFIDENCE_FALLBACK = 'basic';

  constructor() {
    this.initializeUltraPatterns();
    this.initializeExcludePatterns();
    this.initializeCategories();
    this.augmentPatterns();
    this.loadKnowledge();
  }

  addUserFeedback(input: string, correctIntent: string): void {
    const key = input.toLowerCase().trim();
    const existing = this.userFeedback.get(key);
    if (existing) {
      existing.count++;
    } else {
      this.userFeedback.set(key, { intent: correctIntent, count: 1 });
    }
    this.persistUserFeedback();
  }

  private persistUserFeedback(): void {
    try {
      const feedbackPath = path.join(__dirname, '../data/feedback.json');
      const data = Object.fromEntries(this.userFeedback);
      fs.writeFileSync(feedbackPath, JSON.stringify(data, null, 2));
    } catch (e) {}
  }

  private initializeCategories(): void {
    this.intentCategories.set('network', 'scan,dns,recon');
    this.intentCategories.set('web', 'web,cms,tech,headers');
    this.intentCategories.set('vulnerability', 'vuln,exploit,malware');
    this.intentCategories.set('information', 'whois,email,recon');
    this.intentCategories.set('security', 'audit,privesc,mitm,brute');
  }

  private initializeExcludePatterns(): void {
    this.excludePatterns.set('web', ['nmap', 'scan port', 'port scan', 'whois', 'dns', 'mx', 'subdomain', 'nmap -', 'port -']);
    this.excludePatterns.set('vuln', ['malware', 'virus', 'rootkit', 'trojan', 'backdoor', 'rkhunter', 'clamav']);
    this.excludePatterns.set('scan', ['directory', 'dirb', 'gobuster', 'web', 'website', 'ffuf', 'dir', 'hidden', 'subdomain']);
    this.excludePatterns.set('recon', ['port', 'scan -', 'nmap', '-p', 'tcp', '-s', 'directory', 'dir']);
    this.excludePatterns.set('dns', ['subdomain', 'recon', 'findomain']);
    this.excludePatterns.set('audit', ['scan', 'directory', 'subdomain', 'nmap']);
    this.excludePatterns.set('mitm', ['port', 'scan', 'vuln', 'nmap']);
    this.excludePatterns.set('full', ['directory', 'dirb', 'gobuster', 'web', 'scan -', 'whois', 'subdomain']);
    this.excludePatterns.set('tech', ['directory', 'scan', 'port']);
    this.excludePatterns.set('headers', ['directory', 'brute', 'subdomain']);
    this.excludePatterns.set('brute', ['port', 'scan', 'subdomain', 'dns']);
  }

  private getCategory(intent: string): string {
    for (const [category, intents] of this.intentCategories.entries()) {
      if (intents.includes(intent)) return category;
    }
    return 'general';
  }

  private simpleClassify(text: string): { intent: string; confidence: number; method: string } {
    const input = text.toLowerCase().trim();
    const scores: Map<string, number> = new Map();
    const minLength = 4;

    for (const [intent, pats] of this.patterns.entries()) {
      let score = 0;
      const weight = this.weights.get(intent) || 1.0;
      const excludePats = this.excludePatterns.get(intent) || [];

      for (const pat of pats) {
        const patLower = pat.toLowerCase();
        const inputWords = input.split(/\s+/);

        if (input === patLower) {
          score += 30 * weight;
        } else if (input.startsWith(patLower + ' ') || input.startsWith(patLower)) {
          score += 25 * weight;
        } else if (input.endsWith(' ' + patLower) || input.endsWith(patLower)) {
          score += 25 * weight;
        } else if (patLower.length >= minLength && input.includes(patLower)) {
          score += 15 * weight;
        } else {
          const found = inputWords.some(w => 
            (w.includes(patLower) && patLower.length > 3) ||
            (patLower.includes(w) && w.length > 2)
          );
          if (found) score += 8 * weight;
        }
      }

      if (excludePats.length > 0) {
        const excludeCount = excludePats.filter(ep => input.includes(ep)).length;
        if (excludeCount > 0) {
          score = Math.max(0, score - excludeCount * 10);
        }
      }

      scores.set(intent, score);
    }

    let bestIntent = 'basic';
    let bestScore = 0;

    if (input.includes('audit') || input.includes('hardening') || input.includes('compliance') || input.includes('cis') || input.includes('stig') || input.includes('lynis')) {
      return { intent: 'audit', confidence: 95, method: 'Audit-Priority' };
    }

    if (input.includes('web') || input.includes('directory') || input.includes('dirb') || input.includes('gobuster')) {
      return { intent: 'web', confidence: 95, method: 'Web-Priority' };
    }

    if ((input.includes('recon') || input.includes('subdomain') || input.includes('osint')) && !input.includes('directory') && !input.includes('web')) {
      return { intent: 'recon', confidence: 95, method: 'Recon-Priority' };
    }

    const prioritizedIntents = ['audit', 'recon', 'full', 'vuln', 'scan', 'web', 'dns', 'mitm', 'brute', 'malware', 'privesc', 'headers', 'whois', 'email', 'cms', 'ssl', 'tech'];

    for (const intent of prioritizedIntents) {
      const s = scores.get(intent) || 0;
      if (s > bestScore) {
        bestScore = s;
        bestIntent = intent;
      }
    }

    if (bestScore === 0) {
      for (const [intent, score] of scores.entries()) {
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }
    }

    const confidence = bestScore > 0 ? Math.min(95, bestScore / 10 + 50) : 0;

    return {
      intent: bestIntent,
      confidence,
      method: confidence > 50 ? 'Ultimate-High' : 'Ultimate-Low'
    };
  }

  private loadKnowledge() {
    const knowledgePath = path.join(__dirname, '../data/knowledge.json');
    if (fs.existsSync(knowledgePath)) {
      const data = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
      
      for (const entry of data) {
        const content = (entry.content || '').toLowerCase();
        const keywords = entry.keywords || [];
        
        for (const kw of keywords) {
          if (!this.keywords.has(kw.toLowerCase())) {
            this.keywords.set(kw.toLowerCase(), []);
          }
          this.keywords.get(kw.toLowerCase())!.push(content.substring(0, 100));
        }
      }
    }
    console.log(`📚 Knowledge loaded: ${this.keywords.size} keywords`);
  }

  private initializeUltraPatterns() {
this.patterns.set('full', [
      'full', 'complete', 'all', 'full scan', 'pentest', 'comprehensive', 'full assessment', 'complete test', 'all ports', 'everything', 'full coverage', 'deep scan', 'thorough scan', 'detailed scan', 'extensive scan', 'overall', 'total', 'end-to-end', 'entire', 'thorough', 'exhaustive', 'holistic', 'urgent full', 'emergency full', 'critical full', 'assess', 'evaluate', 'test everything', 'complete audit', 'security audit', 'full test', 'full pentest', 'complete security', 'prehensive test', 'overall assessment', 'entire scan', 'assess all', 'evaluate everything', 'test complete', 'security check all', 'comprehensive audit', 'check everything', 'full check', 'total scan', 'end to end', 'holistic test', 'full penetration', 'complete assessment', 'everything check', 'full security', 'test all', 'comprehensive scan', 'all in one', 'full check', 'complete test', 'overall test', 'full eval', 'total test', 'entire check', 'full test all', 'full security test', 'complete security test', 'comprehensive vulnerability assessment', 'overall security assessment', 'full network scan', 'complete network assessment', 'ent', 'comprehensive test', 'full enumeration', 'complete scan', 'full vulnerability scan', 'full penetration test', 'full exploit test', 'complete vulnerability assessment', 'overall penetration test', 'end to end security test',
      'run all tests', 'execute all', 'run comprehensive', 'all-encompassing', 'run full suite', 'test all aspects', 'full coverage test', 'total assessment', 'comprehensive analysis', 'full analysis', 'complete evaluation', 'overall evaluation', 'full evaluation', 'comprehensive review', 'full review', 'end-to-end test', 'all-in-one test', 'test suite', 'full test suite', 'comprehensive test', 'full coverage check', 'all checks', 'test everything', 'full assessment', 'complete suite', 'all-in-one scan', 'full scan test', 'complete scan', 'overall security test', 'full security scan', 'all tests', 'run all checks', 'execute full test', 'perform full test', 'full security audit', 'complete security audit'
    ]);

    this.patterns.set('recon', [
      'recon', 'subdomain', 'subdomains', 'enum', 'find subdomains', 'reconnaissance', 'enumerate', 'discover', 'find domains', 'subenum', 'subfinder', 'asset finder', 'dns enum', 'domain discovery', 'brute subdomains', 'passive recon', 'active recon', 'osint', 'information gathering', 'subdomain enumeration', 'domain enumeration', 'finding subdomains', 'look for subdomains', 'get all subdomains', 'list subdomains', 'active directory', 'dns zone transfer', 'whois enum', 'email harvest', 'google dorks', 'gather', 'find', 'enumerate subdomains', 'bruteforce subdomains', 'findomain', 'amass', 'recon all', 'full recon', 'reconnaissance', 'list all domains', 'discover subdomains', 'enum subdomains', 'find all subdomains', 'probe subdomains', 'scan subdomains', 'gather intel', 'osint gather', 'intel gathering', 'information gathering', 'domain enum', 'subdomain scan', 'discover domains', 'list domains', 'find domains', 'probe domains', 'enum domains', 'subdomains enumeration', 'domain discovery', 'find all domains', 'discover all subdomains', 'list all subdomains', 'probe all subdomains', 'scan all subdomains', 'enum all subdomains', 'recon all subdomains', 'subdomain enumeration', 'active reconnaissance', 'passive reconnaissance', 'information gathering', 'osint reconnaissance', 'social engineering gather', 'email enumeration', 'google hacking', 'ghdb', 'dorking', 'domain brute', 'subdomain brute', 'dns brute', 'reverse dns', 'reverse lookup'
    ]);

    this.patterns.set('dns', [
      'dns', 'dig', 'mx', 'txt', 'dns lookup', 'nslookup', 'nameserver', 'ns record', 'mx record', 'txt record', 'a record', 'aaaa record', 'cname record', 'soa record', 'dns records', 'dns check', 'dns query', 'resolve', 'resolution', 'check dns', 'verify dns', 'dns info', 'dns information', 'domain resolution', 'check nameserver', 'check mx', 'check txt', 'check spf', 'dmarc', 'dkim', 'verify', 'resolve', 'dnsenum', 'fierce', 'check dns records', 'probe dns', 'test dns', 'lookup domain', 'resolve domain', 'check domain resolution', 'verify dns', 'query dns', 'dns query', 'nameserver lookup', 'dns lookup', 'mx lookup', 'txt lookup', 'probe nameserver', 'check nameservers', 'verify nameserver', 'dns resolution', 'domain resolve', 'reverse dns', 'forward dns', 'dns transfer', 'axfr', 'zone transfer', 'dns sec', 'dnssec', 'check dnssec', 'verify dnssec', 'dns poisoning', 'dns spoofing', 'check dmarc', 'check spf record', 'dkim record', 'verify domain', 'dns check all', 'full dns enumeration', 'dns records enumeration'
    ]);

    this.patterns.set('vuln', [
      'vuln', 'vulnerability', 'vulnerabilities', 'exploit', 'exploits', 'security', 'hack', 'hacking', 'cve', 'sqli', 'xss', 'sql injection', 'injection', 'command injection', 'rce', 'zero-day', '0day', '0-day', 'new exploit', 'security check', 'vulnerability scan', 'vuln scan', 'vuln check', 'find exploits', 'find vulnerabilities', 'detect vuln', 'security audit', 'penetration test', 'exploit check', 'vulnerability assessment', 'cve check', 'cvelib', 'openvas', 'nikto', 'find vuln', 'test vuln', 'check exploit', 'scan vuln', 'exploit scan', 'xss scan', 'csrf', 'ssrf', 'lfi', 'rfi', 'xxe', 'ssti', 'deserialization', 'jwt', 'oauth', 'authentication bypass', 'authorization bypass', 'idor', 'business logic', 'race condition', 'path traversal', 'buffer overflow', 'heap overflow', 'format string', 'penetration', 'security test', 'vuln test', 'test vulnerability', 'detect vulnerability', 'find vulnerability', 'scan vulnerability', 'check vulnerability', 'assess vulnerability', 'analyze vulnerability', 'probe vulnerability', 'evaluate vulnerability', 'security audit', 'penetration testing', 'exploit testing', 'vulnerability testing', 'hack test', 'test hack', 'check exploit', 'find exploit', 'detect exploit', 'probe exploit', 'assess exploit',
      'check sql injection', 'test xss', 'find sql injection', 'check command injection', 'detect rce', 'find remote code', 'check remote code', 'test remote execution', 'find ssti', 'check ssti', 'test template injection', 'find template injection', 'check csrf', 'check ssrf', 'find ssrf', 'test ssrf', 'check broken access', 'detect broken access', 'test broken auth', 'detect broken auth', 'check insecure deserialization', 'test insecure deserialization', 'vulnerability check', 'security vulnerability', 'security flaw', 'security bug', 'security issue', 'security problem', 'check security', 'test security', 'security vulnerability check', 'penetration testing', 'pen test', 'security test', 'vulnerabilities check', 'exploits check', 'cve check', 'cve scan', 'cve search', 'cve lookup'
    ]);

    this.patterns.set('mitm', [
      'mitm', 'man in the middle', 'sniff', 'sniffer', 'intercept', 'arp', 'arp spoofing', 'arp poison', 'dns spoofing', 'spoof', 'poison', 'ettercap', 'bettercap', 'responder', 'network sniff', 'packet sniff', 'traffic capture', 'network capture', 'intercept traffic', 'ssl strip', 'hijack', 'session hijack', 'cookie steal', 'arp poisoning', 'mitm', 'sniffing', 'arp poison', 'ettercap', 'bettercap', 'probe mitm', 'test mitm', 'sniff network', 'intercept traffic', 'arp scan', 'test arp', 'check arp', 'probe network', 'test network', 'probe sniff', 'check sniff', 'arpspoof', 'mitm attack', 'arpmitm', 'sslstrip', 'sslstripping', 'man-in-the-browser', 'man-in-the-mobile', 'session hijacking', 'cookie hijacking', 'network interception', 'traffic interception', 'arp poisoning attack', 'dns spoofing attack', 'ssl hijacking', 'check mitm', 'test mitm attack', 'detect mitm', 'probe mitm attack'
    ]);

    this.patterns.set('audit', [
      'audit', 'hardening', 'lynis', 'security audit', 'system audit', 'compliance', 'cis', 'stig', 'security check', 'system check', 'verify hardening', 'security assessment', 'risk assessment', 'security hardening', 'system hardening', 'verify security', 'probe hardening', 'assess security', 'test hardening', 'evaluate hardening', 'check hardening', 'verify security', 'test security', 'check security', 'analyze security', 'assess security', 'probe audit', 'test audit', 'compliance check', 'cis benchmark', 'stig compliance', 'security benchmark', 'vulnerability assessment', 'security posture', 'security posture assessment', 'risk analysis', 'security analysis', 'penetration audit', 'security evaluation', 'system security test', 'security compliance check', 'security hardening check', 'vulnerability audit', 'security control test', 'security policy check', 'system hardening audit', 'configuration audit', 'baseline audit', 'security baseline', 'verify baseline', 'check baseline', 'cis benchmark check', 'stig check', 'security configuration', 'verify configuration', 'check configuration', 'security configuration check', 'system configuration audit', 'configuration baseline', 'security verify', 'system verify', 'verify security settings', 'check security settings', 'security settings', 'security benchmark check', 'compliance verification', 'verify compliance', 'check compliance', 'check cis', 'check stig', 'verify cis', 'verify stig', 'compliance verification', 'security compliance verification', 'vulnerability compliance', 'penetration testing audit', 'system hardening audit', 'security configuration audit', 'security baseline check', 'security baseline audit', 'verify system hardening', 'check system hardening', 'verify system security', 'check system security', 'system security audit', 'network security audit', 'application security audit', 'database security audit', 'firewall audit', 'ids ips audit', 'vpn audit', 'encryption audit', 'access control audit', 'authentication audit', 'authorization audit', 'logging audit', 'monitoring audit', 'physical security audit', 'data security audit', 'cloud security audit', 'container security audit', 'kubernetes security audit', 'devsecops security audit', 'application security audit', 'api security audit', 'web security audit', 'mobile security audit', 'iot security audit', 'network penetration audit', 'social engineering audit', 'phishing audit',
      'run audit', 'perform audit', 'execute audit', 'conduct audit', 'security review', 'system review', 'compliance review', 'run hardening', 'perform hardening', 'execute hardening', 'security baseline check', 'system baseline check', 'security posture check', 'security controls', 'verify controls', 'check controls', 'security controls check', 'access control check', 'authentication check', 'authorization check', 'verify authentication', 'verify authorization', 'run vulnerability assessment', 'perform vulnerability assessment', 'execute vulnerability assessment'
    ]);

    this.patterns.set('malware', [
      'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware', 'scan malware', 'virus scan', 'trojan', 'backdoor', 'keylogger', 'spyware', 'adware', 'infected', 'check virus', 'scan rootkit', 'check malware', 'detect virus', 'probe malware', 'analyze malware', 'scan for malware', 'test malware', 'check malware', 'probe virus', 'check trojan', 'check backdoor', 'detect trojan', 'detect backdoor', 'antivirus', 'virus check', 'malware scan', 'trojan check', 'backdoor check', 'keylogger check', 'spyware check', 'check infected', 'check malicious', 'check virus', 'check trojan', 'check backdoor', 'detect malicious', 'check ransomware', 'ransomware', 'detect ransomware', 'check spyware', 'detect keylogger', 'check malware', 'virus detection', 'trojan detection', 'backdoor detection', 'rootkit detection', 'check keylogger', 'check spyware', 'check adaware', 'detect virus', 'malicious software', 'virus scanner', 'malware analysis', 'virus removal', 'malware removal', 'antivirus scan', 'check computer virus', 'scan for virus', 'test virus', 'check trojan horse', 'detect worm', 'detect ransomware', 'check phishing', 'phishing', 'check malicious', 'infected computer', 'virus infected', 'malware found', 'check infection', 'scan for virus', 'antivirus check', 'detect malicious software', 'malicious code', 'malicious script', 'check virus attack', 'computer virus', 'malware threat', 'virus threat', 'check virus infection', 'infected file', 'malware detection', 'virus detection', 'virus', 'worms', 'bots', 'botnet', 'spyware', 'adware', 'ransomware', 'keyloggers', 'trojans', 'backdoors', 'rootkits', 'downloaders', 'droppers', 'web shells', 'infected', 'compromised', 'malicious', 'backdoored', 'rootkitted', 'bot infected', 'check virus', 'check malware', 'check trojan', 'check backdoor', 'check rootkit', 'check worm', 'check botnet', 'check spyware', 'check ransomware', 'check infected file', 'check malicious code', 'check virus file', 'check malware file', 'check trojan file', 'detect malicious virus', 'detect computer virus', 'detect malicious software', 'detect infected file', 'detect backdoor', 'detect rootkit', 'detect keylogger', 'detect spyware', 'detect ransomware', 'detect botnet', 'detect僵尸网络', 'detect木马', 'detect病毒', 'detect蠕虫', 'detect后门', 'detect rootkit', 'scan for virus', 'scan for malware', 'scan for trojan', 'scan for backdoor', 'check for virus', 'check for malware', 'check for trojan', 'check for backdoor', 'check for rootkit', 'check for worm', 'check for botnet', 'test for malware', 'test for virus', 'analyze virus', 'analyze malware', 'analyze trojan', 'analyze backdoor', 'analyze rootkit', 'identify virus', 'identify malware', 'identify trojan', 'identify backdoor', 'identify rootkit', 'check virus signature', 'check malware signature', 'check virus hash', 'check malware hash', 'virustotal', 'malware analysis', 'reverse malware', 'analyze malware sample', 'checkSuspicious', 'checkSuspiciousFile', 'checkSuspiciousProcess', 'detect Suspicious', 'suspicious file', 'suspicious process', 'suspicious activity', 'check suspicious activity', 'check suspicious file', 'check suspicious process', 'check suspicious behavior', 'malicious activity', 'malicious process', 'malicious file'
    ]);

    this.patterns.set('audit', [
      'audit', 'hardening', 'lynis', 'security audit', 'system audit', 'compliance', 'cis', 'stig', 'security check', 'system check', 'verify hardening', 'security assessment', 'risk assessment', 'security hardening', 'system hardening', 'verify security', 'probe hardening', 'assess security', 'test hardening', 'evaluate hardening', 'check hardening', 'verify security', 'test security', 'check security', 'analyze security', 'assess security', 'probe audit', 'test audit', 'compliance check', 'cis benchmark', 'stig compliance', 'security benchmark', 'vulnerability assessment', 'security posture', 'security posture assessment', 'risk analysis', 'security analysis', 'penetration audit', 'security evaluation', 'system security test', 'security compliance check', 'security hardening check', 'vulnerability audit', 'security control test', 'security policy check', 'check security policy', 'verify security policy', 'check compliance', 'verify compliance', 'check cis', 'check stig', 'verify cis', 'verify stig', 'compliance verification', 'security compliance verification', 'vulnerability compliance', 'penetration testing audit', 'system hardening audit', 'security configuration audit', 'security baseline check', 'security baseline audit', 'verify system hardening', 'check system hardening', 'verify system security', 'check system security', 'system security audit', 'network security audit', 'application security audit', 'database security audit', 'firewall audit', 'ids ips audit', 'vpn audit', 'encryption audit', 'access control audit', 'authentication audit', 'authorization audit', 'logging audit', 'monitoring audit', 'physical security audit', 'data security audit', 'cloud security audit', 'container security audit', 'kubernetes security audit', 'devsecops security audit', 'application security audit', 'api security audit', 'web security audit', 'mobile security audit', 'iot security audit', 'network penetration audit', 'social engineering audit', 'phishing audit', 'vulnerability scan audit', 'risk assessment audit', 'threat assessment audit', 'security certification audit', 'iso 27001', 'iso 27002', 'pci dss', 'hipaa', 'gdpr', 'soc2', 'nist', 'check iso', 'verify iso', 'check pci', 'verify pci', 'check hipaa', 'verify hipaa'
    ]);

    this.patterns.set('tech', [
      'tech', 'technology', 'server', 'framework', 'whatweb', 'detect', 'technologies', 'detect tech', 'detect server', 'detect framework', 'identify', 'identify technology', 'identify server', 'fingerprint', 'fingerprinting', 'web fingerprint', 'server identification', 'service identification', 'detect cms', 'detect programming language', 'detect backend', 'detect frontend', 'probe tech', 'analyze tech', 'technology detection', 'server detection', 'framework detection', 'what technology', 'which server', 'which framework', 'which cms', 'identify', 'fingerprint', 'wappalyzer', 'builtwith', 'identify server', 'detect technology', 'probe server', 'fingerprint server', 'tech scan', 'identify framework', 'detect cms', 'identify wordpress', 'what cms', 'check cms', 'identify joomla', 'scan cms', 'check cms version', 'detect wordpress', 'detect drupal', 'detect joomla', 'identify cms version', 'probe wordpress', 'probe drupal', 'detect web technology', 'identify web technology', 'what web technology', 'check server type', 'identify technology stack', 'probe technology stack', 'detect programming language', 'identify backend framework', 'detect frontend framework', 'check technology', 'check framework', 'detect language', 'check cms technology', 'identify technology', 'probe technology', 'analyze technology', 'detect php', 'detect python', 'detect ruby', 'detect java', 'detect nodejs', 'detect apache', 'detect nginx', 'detect iis'
    ]);

    this.patterns.set('headers', [
      'header', 'headers', 'http header', 'http headers', 'curl', 'check header', 'check headers', 'analyze header', 'security header', 'csp', 'x-frame-options', 'hsts', 'analyze headers', 'check headers', 'check security headers', 'verify headers', 'probe headers', 'http headers check', 'test headers', 'scan headers', 'get headers', 'fetch headers', 'check http headers', 'verify http headers', 'check security header', 'check csp', 'check hsts', 'check x-frame', 'check referrer', 'check cors', 'check content security policy', 'check strict transport security', 'check x content type options', 'check x powered by', 'check server header', 'check x aspnet', 'check x aspnet mvc', 'check cookies', 'check session cookies', 'check http only', 'check secure cookie', 'check same site', 'verify headers', 'probe headers', 'check security headers', 'verify security headers'
    ]);

this.patterns.set('dns', [
      'dns', 'dig', 'mx', 'txt', 'dns lookup', 'nslookup', 'nameserver', 'ns record', 'mx record', 'txt record', 'a record', 'aaaa record', 'cname record', 'soa record', 'dns records', 'dns check', 'dns query', 'resolve', 'resolution', 'check dns', 'verify dns', 'dns info', 'dns information', 'domain resolution', 'check nameserver', 'check mx', 'check txt', 'check spf', 'dmarc', 'dkim', 'verify', 'resolve', 'dnsenum', 'fierce', 'check dns records', 'probe dns', 'test dns', 'lookup domain', 'resolve domain', 'check domain resolution', 'verify dns', 'query dns', 'dns query', 'nameserver lookup', 'dns lookup', 'mx lookup', 'txt lookup', 'probe nameserver', 'check nameservers', 'verify nameserver'
    ]);

    this.patterns.set('ssl', [
      'ssl', 'tls', 'certificate', 'cert', 'https', 'ssl check', 'tls check', 'cert check', 'ssl certificate', 'tls certificate', 'https check', 'check ssl', 'check tls', 'verify ssl', 'check certificate', 'test ssl', 'test tls', 'certificate info', 'ssl info', 'cipher', 'ciphers', 'cipher suite', 'heartbleed', 'poodle', 'beast', 'freak', 'verify', 'test', 'openssl', 'testssl', 'check https', 'verify https', 'test certificate', 'probe ssl', 'test tls', 'verify certificate', 'check certificate expiry', 'ssl scan', 'tls scan', 'cipher scan', 'check cipher', 'verify cipher', 'test cipher suite', 'check tls version', 'check ssl version', 'certificate validation', 'verify certificate', 'test https', 'check ssl cert'
    ]);

    this.patterns.set('tech', [
      'tech', 'technology', 'server', 'framework', 'whatweb', 'detect', 'technologies', 'detect tech', 'detect server', 'detect framework', 'identify', 'identify technology', 'identify server', 'fingerprint', 'fingerprinting', 'web fingerprint', 'server identification', 'service identification', 'detect cms', 'detect programming language', 'detect backend', 'detect frontend', 'probe tech', 'analyze tech', 'technology detection', 'server detection', 'framework detection', 'what technology', 'which server', 'which framework', 'which cms', 'identify', 'fingerprint', 'wappalyzer', 'builtwith', 'identify server', 'detect technology', 'probe server', 'fingerprint server', 'tech scan', 'identify framework', 'detect cms', 'identify cms', 'what cms', 'which technology', 'detect web technology', 'probe technology', 'analyze technology', 'check server type', 'identify technology stack', 'probe tech stack'
    ]);

    this.patterns.set('web', [
      'web', 'http', 'website', 'directory', 'dirb', 'gobuster', 'dir', 'directories', 'directory busting', 'directory enumeration', 'web enum', 'find directories', 'find files', 'find pages', 'brute force directory', 'web scan', 'web discovery', 'web brute', 'check website', 'analyze web', 'web analysis', 'http methods', 'http headers', 'web fingerprint', 'web application', 'find hidden', 'hidden files', 'admin panel', 'login page', 'robots.txt', 'sitemap', 'backup files', 'enumerate', 'bust', 'dirb', 'gobuster', 'ffuf', 'scan directory', 'enumerate web', 'probe directory', 'find web pages', 'scan website', 'check website', 'probe website', 'discover website', 'enumerate website', 'find website directories', 'list directories', 'scan web directory', 'check web directory', 'probe web', 'analyze website', 'test website', 'check page', 'find page', 'probe page',
      'directory brute', 'bruteforce directory', 'web directory', 'web path', 'find web path', 'discover url', 'enumerate url', 'find url', 'web url', 'list web', 'web content', 'web file', 'list web files', 'web assets', 'check website structure', 'discover web content', 'web enumeration', 'list website', 'site directories', 'site files', 'scan website paths', 'enumerate website', 'find admin', 'find login', 'discover backup', 'check backup', 'find config', 'find configs', 'find sensitive', 'discover sensitive files', 'web sensitive', 'check sensitive files', 'dirbuster', 'directorysearch', 'check hidden files', 'web hidden', 'discover web hidden', 'enumerate website directories', 'discover website files', 'probe website', 'website brute', 'website enumeration'
    ]);

    this.patterns.set('cms', [
      'cms', 'wordpress', 'wp', 'drupal', 'joomla', 'magento', 'shopify', 'wpscan', 'joomscan', 'droopescan', 'cms scan', 'cms detection', 'wordpress scan', 'drupal scan', 'joomla scan', 'wordpress vuln', 'drupal vuln', 'joomla vuln', 'cms exploit', 'cms vulnerability', 'detect cms', 'identify cms', 'which cms', 'wordpress detection', 'plugin vulns', 'theme vulns', 'wp plugin', 'joomla vulnerability', 'drupal vulnerability', 'scan wordpress', 'scan drupal', 'check wordpress', 'check drupal', 'probe cms', 'detect cms', 'identify wordpress', 'what cms', 'check cms', 'identify joomla', 'scan cms', 'check cms version', 'detect wordpress', 'detect drupal', 'detect joomla', 'identify cms version', 'probe wordpress', 'probe drupal', 'wordfence', 'sucuri', 'wp security', 'drupal module', 'joomla module', 'magento extension', 'shopify app', 'cms security', 'check wordpress plugins', 'check drupal modules', 'check joomla extensions', 'enumerate wordpress', 'enumerate drupal', 'enumerate joomla', 'scan cms plugins', 'cms vulnerabilities', 'wordpress vulnerabilities', 'drupal vulnerabilities', 'joomla vulnerabilities'
    ]);

    this.patterns.set('mitm', [
      'mitm', 'man in the middle', 'sniff', 'sniffer', 'intercept', 'arp', 'arp spoofing', 'arp poison', 'dns spoofing', 'spoof', 'poison', 'ettercap', 'bettercap', 'responder', 'network sniff', 'packet sniff', 'traffic capture', 'network capture', 'intercept traffic', 'ssl strip', 'hijack', 'session hijack', 'cookie steal', 'arp poisoning', 'mitm', 'sniffing', 'arp poison', 'ettercap', 'bettercap', 'probe mitm', 'test mitm', 'sniff network', 'intercept traffic', 'arp scan', 'test arp', 'check arp', 'probe network', 'test network', 'probe sniff', 'check sniff', 'arpspoof',
      'intercept http traffic', 'capture http', 'traffic sniffing', 'network interception', 'arp scan network', 'check arp poisoning', 'detect arp spoof', 'test arp spoof', 'network hijack', 'session steal', 'cookie hijack', 'http hijack', 'ssl stripping', 'check ssl strip', 'check session hijacking', 'test session hijacking', 'detect mitm attack', 'test network interception', 'network traffic capture', 'man in the browser', 'man in the mobile', 'mobile mitm', 'browser MitM', 'wireless mitm', 'wifi mitm', 'evil twin', 'fake ap', 'rogue ap', 'rogue access point', 'check rogue', 'test responder', 'check responder', 'analyze network traffic', 'intercept network', 'traffic interception'
    ]);

    this.patterns.set('brute', [
      'brute', 'bruteforce', 'brute force', 'password', 'crack', 'cracker', 'hydra', 'medusa', 'crack password', 'guess password', 'login brute', 'credential stuff', 'password spray', 'wordlist', 'dictionary attack', 'hash crack', 'john', 'hashcat', 'rainbow table', 'gpu crack', 'login crack', 'credential brute', 'crack login', 'probe password', 'guess login', 'brute login', 'force password', 'crack hash', 'login crack', 'test password', 'check password', 'guess credentials', 'brute credentials', 'force login', 'test credentials', 'check credentials', 'probe credentials'
    ]);

this.patterns.set('whois', [
      'whois', 'who is', 'owner', 'registrar', 'registration', 'registrant', 'domain info', 'domain owner', 'domain age', 'domain created', 'domain expiry', 'domain status', 'name servers', 'registrar info', 'domain details', 'owner info', 'registrar details', 'check whois', 'lookup whois', 'domain lookup', 'check domain', 'domain info', 'domain owner', 'check registrar', 'check domain age', 'check domain expiry', 'check domain owner', 'verify domain', 'probe whois', 'test whois', 'lookup domain', 'check domain details', 'query domain', 'search domain', 'domain owner check', 'registrar check', 'domain age check', 'when created', 'when expires', 'who owns', 'domain registration', 'domain details check', 'check nameservers', 'check registrant', 'registrant info', 'who owns domain', 'domain registration info', 'domain expiration date', 'domain creation date', 'check domain registration', 'check domain owner', 'domain registrant', 'domain registrar info', 'nameserver info', 'check dns servers', 'check domain status', 'domain available', 'register domain', 'domain transfer', '域信息', 'whoise', 'whois lookup', 'domain age verification', 'domain expiration check'
    ]);

    this.patterns.set('malware', [
      'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware', 'scan malware', 'virus scan', 'trojan', 'backdoor', 'keylogger', 'spyware', 'adware', 'infected', 'check virus', 'scan rootkit', 'check malware', 'detect virus', 'probe malware', 'analyze malware', 'scan for malware', 'test malware', 'check malware', 'probe virus', 'check trojan', 'check backdoor', 'detect trojan', 'detect backdoor', 'antivirus', 'virus check', 'malware scan', 'trojan check', 'backdoor check', 'keylogger check', 'spyware check', 'check infected', 'check malicious', 'check virus', 'check trojan', 'check backdoor', 'detect malicious', 'check ransomware', 'ransomware', 'detect ransomware', 'check spyware', 'detect keylogger', 'check malware', 'virus detection', 'trojan detection', 'backdoor detection', 'rootkit detection', 'check keylogger', 'check spyware', 'check adaware', 'detect virus', 'malicious software', 'virus scanner', 'malware analysis', 'virus removal', 'malware removal', 'antivirus scan', 'check computer virus', 'scan for virus', 'test virus', 'check trojan horse', 'detect worm', 'detect ransomware', 'check phishing', 'phishing', 'check malicious', 'infected computer', 'virus infected', 'malware found', 'check infection', 'scan for virus', 'antivirus check', 'detect malicious software', 'malicious code', 'malicious script', 'check virus attack', 'computer virus', 'malware threat', 'virus threat', 'check virus infection', 'infected file', 'malware detection', 'virus detection'
    ]);

    this.patterns.set('headers', [
      'header', 'headers', 'http header', 'http headers', 'curl', 'check header', 'check headers', 'analyze header', 'security header', 'csp', 'x-frame-options', 'hsts', 'analyze headers', 'check headers', 'check security headers', 'verify headers', 'probe headers', 'http headers check', 'test headers', 'scan headers', 'get headers', 'fetch headers', 'check http headers', 'verify http headers', 'check security header', 'check csp', 'check hsts', 'check x-frame', 'check referrer', 'check cors'
    ]);

    this.patterns.set('email', [
      'email', 'emails', 'harvest', 'theharvester', 'harvest emails', 'find email', 'find emails', 'collect emails', 'email collection', 'email finder', 'email scraper', 'gather emails', 'probe email', 'scan email', 'collect email', 'find email addresses', 'harvest email addresses', 'probe emails', 'check email', 'find email addresses', 'gather email', 'collect email', 'test email', 'check emails', 'probe email addresses', 'check email addresses'
    ]);

    this.patterns.set('audit', [
      'audit', 'hardening', 'lynis', 'security audit', 'system audit', 'compliance', 'cis', 'stig', 'security check', 'system check', 'verify hardening', 'security assessment', 'risk assessment', 'security hardening', 'system hardening', 'verify security', 'probe hardening', 'assess security', 'test hardening', 'evaluate hardening', 'check hardening', 'verify security', 'test security', 'check security', 'analyze security', 'assess security', 'probe audit', 'test audit'
    ]);

    this.patterns.set('privesc', [
      'privesc', 'privilege', 'escalation', 'privilege escalation', 'root', 'sudo', 'sudoers', 'suid', 'capabilities', 'get root', 'become root', 'gain root', 'elevate', 'linpeas', 'linenum', 'linux privesc', 'windows privesc', 'powerup', 'privilege escalation', 'getuid', 'sudo escalation', 'root escalation', 'gain privileges', 'elevate privileges', 'get privileges', 'privilege gain', 'test privesc', 'check privesc', 'probe privilege', 'check root', 'check sudo', 'check capabilities'
    ]);

    this.patterns.set('malware', [
      'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware', 'scan malware', 'virus scan', 'trojan', 'backdoor', 'keylogger', 'spyware', 'adware', 'infected', 'check virus', 'scan rootkit', 'check malware', 'detect virus', 'probe malware', 'analyze malware', 'scan for malware', 'test malware', 'check malware', 'probe virus', 'check trojan', 'check backdoor', 'detect trojan', 'detect backdoor'
    ]);

    for (const intent of this.patterns.keys()) {
      this.weights.set(intent, 2.0);
    }
    
    this.weights.set('malware', 4.0);
    this.weights.set('audit', 3.0);
    this.weights.set('headers', 3.0);
    this.weights.set('dns', 3.0);
    this.weights.set('ssl', 3.0);
    this.weights.set('mitm', 3.0);
    this.weights.set('whois', 3.0);
    this.weights.set('recon', 3.0);
    this.weights.set('vuln', 3.0);
  }

  classify(text: string): { intent: string; confidence: number; method: string } {
    const input = text.toLowerCase().trim();

    const feedback = this.userFeedback.get(input);
    if (feedback) {
      return { intent: feedback.intent, confidence: 95, method: 'User-Feedback' };
    }

    return this.simpleClassify(input);
  }

  private getConfidence(): number {
    return this.CONFIDENCE_THRESHOLD;
  }

  setConfidenceThreshold(threshold: number): void {
    this.CONFIDENCE_THRESHOLD = Math.max(10, Math.min(90, threshold));
  }

  private augmentPatterns(): void {
    const augmentations: Record<string, string[]> = {
      vuln: ['check for security issues', 'test for exploits', 'find security flaws', 'security problem', 'security bug', 'security flaw', 'exposure', 'security exposure', 'cve search', 'cve lookup', 'vulnerability search'],
      web: ['list website folders', 'find website files', 'enumerate web pages', 'discover web paths', 'probe web server', 'test web directory', 'discover hidden pages', 'check site structure', 'site mapping', 'web crawl'],
      mitm: ['intercept http', 'capture traffic', 'network man', 'arp scan', 'network poison', 'traffic intercept', 'session steal', 'cookie capture', 'network hijack', 'traffic spy'],
      full: ['all-in-one', 'everything check', 'all tests', 'comprehensive testing', 'full check', 'complete check', 'overall security', 'full evaluation', 'test all', 'all assessments'],
    };

    for (const [intent, augs] of Object.entries(augmentations)) {
      const existing = this.patterns.get(intent) || [];
      for (const aug of augs) {
        if (!existing.includes(aug)) {
          existing.push(aug);
        }
      }
      this.patterns.set(intent, existing);
    }
  }

  selectTools(intent: string): string[] {
    const tools: Record<string, string[]> = {
      full: ['nmap', 'host', 'whois', 'curl'],
      recon: ['nmap', 'host', 'whois'],
      vuln: ['nmap', 'curl'],
      scan: ['nmap'],
      dns: ['host', 'dig'],
      ssl: ['curl'],
      tech: ['curl', 'nmap'],
      web: ['curl', 'nmap'],
      cms: ['curl'],
      mitm: ['nmap'],
      brute: ['nmap'],
      whois: ['whois'],
      headers: ['curl'],
      email: ['curl'],
      audit: ['nmap'],
      privesc: ['nmap'],
      malware: ['rkhunter'],
      basic: ['host', 'curl']
    };
    return tools[intent] || tools.basic;
  }

  evaluate(): void {
    console.log('\n🔍 Avaliação Ultimate...\n');

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

    console.log(`${'═'.repeat(60)}`);
    console.log(`📊 ULTIMATE CLASSIFIER`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`\n   TOTAL: ${total}`);
    console.log(`   ACERTOS: ${correct} (${accuracy}%)`);
    
    console.log(`\n   POR INTENT:`);
    for (const [intent, stats] of Object.entries(byIntent)) {
      const acc = Math.round(stats.correct / stats.total * 100);
      const icon = acc >= 90 ? '✅' : acc >= 70 ? '⚠️' : '❌';
      console.log(`   ${icon} ${intent}: ${stats.correct}/${stats.total} (${acc}%)`);
    }
    console.log(`${'═'.repeat(60)}`);

    return;
  }
}

function analyzeVulns(output: string, tool: string): { vulns: string[]; severity: string } {
  const lines = output.split('\n');
  const vulns: string[] = [];
  let severity = 'BAIXO';
  
  const vulnPatterns = [
    { pattern: /cve-\d{4}-\d{4,}/i, level: '0-DAY', desc: 'CVE conhecida' },
    { pattern: /cve-\d+-\d+/i, level: 'ALTO', desc: 'CVE' },
    { pattern: /nanocve|no.?cve/i, level: '0-DAY', desc: 'Possível 0-day' },
    { pattern: /unauthenticated|unauth/i, level: 'CRÍTICO', desc: 'Sem autenticação' },
    { pattern: /remote.*code.*exec|rce/i, level: 'CRÍTICO', desc: 'RCE' },
    { pattern: /privilege.*escalation|privesc/i, level: 'CRÍTICO', desc: 'Privilege Escalation' },
    { pattern: /path.*traversal|lfi|rfi/i, level: 'ALTO', desc: 'Path Traversal' },
    { pattern: /xxe|xml.*external/i, level: 'ALTO', desc: 'XXE' },
    { pattern: /sql.*injection|sqli|blind.*sqli/i, level: 'ALTO', desc: 'SQL Injection' },
    { pattern: /xss|cross.?site|reflected|stored/i, level: 'ALTO', desc: 'XSS' },
    { pattern: /csrf|cross.?site.*request/i, level: 'MÉDIO', desc: 'CSRF' },
    { pattern: /ssrf|server.*side.*request/i, level: 'ALTO', desc: 'SSRF' },
    { pattern: /ssti|server.*side.*template/i, level: 'ALTO', desc: 'SSTI' },
    { pattern: /deserialization|unserialize/i, level: 'ALTO', desc: 'Insecure Deserialization' },
    { pattern: /idor|broken.*access/i, level: 'MÉDIO', desc: 'IDOR' },
    { pattern: /business.*logic|logic.*flaw/i, level: 'MÉDIO', desc: 'Business Logic' },
    { pattern: /race.*condition/i, level: 'MÉDIO', desc: 'Race Condition' },
    { pattern: /jwt.*weak|jwt.*none/i, level: 'ALTO', desc: 'JWT弱' },
    { pattern: /oauth.*bypass|auth.*bypass/i, level: 'ALTO', desc: 'Auth Bypass' },
    { pattern: /session.*fixation|session.*hijack/i, level: 'ALTO', desc: 'Session Fixation' },
    { pattern: /file.*upload|mime.*bypass/i, level: 'ALTO', desc: 'File Upload' },
    { pattern: /command.*injection|ioc|exec/i, level: 'ALTO', desc: 'Command Injection' },
    { pattern: /buffer.*overflow|heap.*overflow/i, level: 'CRÍTICO', desc: 'Buffer Overflow' },
    { pattern: /format.*string|%n|printf.*bug/i, level: 'ALTO', desc: 'Format String' },
    { pattern: /race.*condition|toctou/i, level: 'MÉDIO', desc: 'Race Condition' },
    { pattern: /information.*disclosure|info.*leak/i, level: 'MÉDIO', desc: 'Info Disclosure' },
    { pattern: /sensitive.*data.*exposed|password.*cleartext/i, level: 'CRÍTICO', desc: 'Sensitive Data' },
    { pattern: /default.*password|weak.*credential/i, level: 'ALTO', desc: 'Default Creds' },
    { pattern: /heartbleed|poodle|beast|freak|logjam|rocem/i, level: 'ALTO', desc: 'SSL Vulnerability' },
    { pattern: /breach|leak.*password|hash.*leak/i, level: 'CRÍTICO', desc: 'Data Breach' },
    { pattern: /vulnerability|vuln|critical|high.*risk/i, level: 'ALTO' },
    { pattern: /warning|medium.*risk|possible/i, level: 'MÉDIO' },
    { pattern: /exploit|poc|proof.*of.*concept/i, level: '0-DAY', desc: 'Exploit/POC' },
    { pattern: /unpatched|critical|zero.?day/i, level: '0-DAY', desc: '0-day ou unpatched' },
    { pattern: /missing.*header|missing.*security/i, level: 'MÉDIO' },
    { pattern: /eval\(|innerHTML|document\.|window\./i, level: 'MÉDIO' },
    { pattern: /password|secret|api.*key|token.*exposed/i, level: 'ALTO' },
    { pattern: /httpOnly|secure|samesite|httponly.*missing/i, level: 'MÉDIO' },
    { pattern: /strict-transport-security|hsts|csp|x-frame/i, level: 'MÉDIO' },
  ];
  
  const osintPatterns = [
    { pattern: /email|@/i, type: 'EMAIL', desc: 'Email encontrado' },
    { pattern: /phone|fone/i, type: 'PHONE', desc: 'Telefone' },
    { pattern: /addr|road|street/i, type: 'ADDRESS', desc: 'Endereço' },
    { pattern: /name.*google|linkedin|twitter|facebook/i, type: 'SOCIAL', desc: 'Social Media' },
    { pattern: /cloud|aws|s3|bucket/i, type: 'CLOUD', desc: 'Cloud exposure' },
    { pattern: /github|gitlab|source/i, type: 'CODE', desc: 'Code repo' },
    { pattern: /api|key|token|secret/i, type: 'CRED', desc: 'API Key' },
    { pattern: /subdomain|www|iis|nginx|apache/i, type: 'TECH', desc: 'Tech info' },
  ];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    for (const vp of vulnPatterns) {
      if (vp.pattern.test(line)) {
        vulns.push(`[${vp.level}] ${line.trim().substring(0, 100)}`);
        if (vp.level === 'CRÍTICO') severity = 'CRÍTICO';
        else if (vp.level === 'ALTO' && severity !== 'CRÍTICO') severity = 'ALTO';
        else if (vp.level === 'MÉDIO' && severity === 'BAIXO') severity = 'MÉDIO';
        break;
      }
    }
  }
  
  const securityHeaders = lines.filter(l => 
    /strict-transport-security|hsts|content-security-policy|csp|x-frame-options|x-content-type|norferrer|feature-policy|permissions-policy/i.test(l)
  ).length;
  
  if (securityHeaders === 0 && tool === 'curl') {
    vulns.push('[MÉDIO] Security headers faltando (HSTS, CSP, X-Frame-Options)');
    if (severity === 'BAIXO') severity = 'MÉDIO';
  }
  
  return { vulns: vulns.slice(0, 20), severity };
}

const actionCommands: Record<string, string[]> = {
  recon: [
    'nmap -sV -sC -Pn -T4 TARGET',
    'subfinder -d TARGET -silent -recursive',
    'shodan host TARGET',
    'whois TARGET',
    'host TARGET',
  ],
  pentest: [
    'nmap -sV -sC -T4 -Pn --script=vuln TARGET',
    'nikto -h TARGET',
    'sqlmap -u URL --batch --level=1 --risk=3',
    'gobuster dir -u URL -w /usr/share/wordlists/dirb/common.txt',
    'whatweb -a 3 TARGET',
  ],
  '0day': [
    'nmap -sV -sC -Pn -T4 TARGET',
    'nmap -sV --script=vuln -Pn TARGET',
    'nikto -h TARGET',
    'shodan host TARGET',
    'searchsploit -s "TARGET"',
  ],
  osint: [
    'shodan host TARGET',
    'theHarvester -d TARGET -b all',
    'subfinder -d TARGET -silent',
    'waybackurls TARGET',
    'whois TARGET',
  ],
  scan: [
    'nmap -sV -T4 -Pn -p- TARGET',
    'shodan host TARGET',
  ],
  vuln: [
    'nmap -sV --script=vuln -Pn TARGET',
    'shodan host TARGET',
    'nikto -h TARGET',
  ],
};

async function runToolCmd(cmd: string, target: string, useProxy: boolean = false): Promise<string> {
  const domain = target.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = target.startsWith('http') ? target : `https://${domain}`;
  const prefix = useProxy ? 'proxychains4 ' : '';
  
  let fullCmd = cmd.replace(/TARGET/g, domain).replace(/URL/g, url);
  fullCmd = prefix + fullCmd + ' 2>&1';
  
  const timeout = fullCmd.includes('nmap') ? 120000 : fullCmd.includes('subfinder') ? 60000 : 45000;
  
  try {
    const { stdout, stderr } = await execAsync(fullCmd, { timeout });
    return stdout || stderr || '';
  } catch (err: any) {
    return '[ERROR] ' + (err.message || 'failed').substring(0, 100);
  }
}

async function runVulnScan(target: string, tool: string, useProxy: boolean = false): Promise<{output: string, vulns: string[], severity: string}> {
  const intents = toolCommands[tool] || toolCommands['default'];
  const allOutputs: string[] = [];
  const allVulns: string[] = [];
  
  for (const cmd of intents) {
    const output = await runToolCmd(cmd, target, useProxy);
    const lines = output.split('\n').filter(l => l.trim());
    allOutputs.push(...lines.slice(0, 20));
    
    const { vulns } = analyzeVulns(output, tool);
    allVulns.push(...vulns);
  }
  
  const severity = allVulns.some(v => v.includes('[CRÍTICO]')) ? 'CRÍTICO' 
                : allVulns.some(v => v.includes('[ALTO]')) ? 'ALTO' 
                : allVulns.some(v => v.includes('[MÉDIO]')) ? 'MÉDIO' 
                : 'BAIXO';
  
  return { output: allOutputs.join('\n'), vulns: allVulns.slice(0, 20), severity };
}

async function checkTor(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('pgrep -x tor', { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function startTor(): Promise<void> {
  console.log('   🔄 Starting Tor...');
  try {
    await execAsync('sudo service tor start', { timeout: 15000 });
  } catch (e: any) {
    console.log('   ⚠️  Tor start failed: ' + e.message);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║    NASAI-MAESTRO-4.0: ULTIMATE CLASSIFIER                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const classifier = new UltimateClassifier();

  const args = process.argv.slice(2);
  
  if (args[0] === 'eval') {
    classifier.evaluate();
  } else if (args[0] === 'scan' || args[0] === 'recon' || args[0] === 'pentest' || args[0] === '0day' || args[0] === 'osint') {
    let target = args[1] || 'example.com';
    let action = args[0] === 'scan' ? 'vuln' : args[0];
    let useProxy = args.includes('--proxy') || args.includes('-P');
    
    if (action === 'pentest' || action === 'recon' || action === '0day' || action === 'osint') {
      target = args[2] || args[1] || 'example.com';
    }
    
    if (args.includes('--proxy') || args.includes('-P')) {
      useProxy = true;
      args = args.filter(a => a !== '--proxy' && a !== '-P');
      target = args[1] || 'example.com';
    }
    
    if (!target.startsWith('http') && !target.match(/^[a-zA-Z0-9]*:\/\//)) {
      target = target.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]/) ? `https://${target}` : target;
    }
    
    const result = classifier.classify(target);
    let activeAction = action;
    
    if (action === 'pentest' || action === 'recon' || action === '0day' || action === 'osint') {
      activeAction = action;
    } else {
      activeAction = result.intent;
    }
    
    result.confidence = 90;
    const cmds = actionCommands[activeAction] || actionCommands['vuln'];
    
    console.log(`\n🎯 SCAN: ${target}`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Confiança: ${result.confidence.toFixed(1)}%`);
    const useTor = await checkTor();
    if (useProxy && !useTor) {
      await startTor();
    }
    
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🔍 EXECUTING: ${cmds.length} commands${useProxy ? ' (via Tor)' : ''}`);
    console.log(`${'═'.repeat(50)}\n`);
    
    const report: string[] = [];
    const allVulns: string[] = [];
    
    for (const cmd of cmds) {
      const cmdName = cmd.split(' ')[0];
      console.log(`▶ Running ${cmdName}...`);
      const output = await runToolCmd(cmd, target, useProxy);
      const lines = output.split('\n').filter(l => l.trim());
      allVulns.push(...lines.slice(0, 15));
      
      if (output && !output.includes('[ERROR]')) {
        report.push(`\n📊 ${cmdName}:`);
        report.push(...lines.slice(0, 20));
      } else {
        report.push(`\n📊 ${cmdName}: ${output.substring(0, 80)}`);
      }
    }
    
    const uniqueVulns = [...new Set(allVulns)];
    const finalSeverity = uniqueVulns.some(v => v.includes('[CRÍTICO]')) ? '🔴 CRÍTICO' 
                     : uniqueVulns.some(v => v.includes('[ALTO]')) ? '🟠 ALTO' 
                     : uniqueVulns.some(v => v.includes('[MÉDIO]')) ? '🟡 MÉDIO' 
                     : uniqueVulns.some(v => v.includes('[INFO]')) ? '🔵 INFO' 
                     : '🟢 BAIXO';
    
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📋 RELATÓRIO DE VULNERABILIDADES`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`\n🎯 Alvo: ${target}`);
    console.log(`🔍 Intent: ${result.intent}`);
    console.log(`⚙️  Commands: ${cmds.length}${useProxy ? ' (Tor)' : ''}`);
    console.log(`🛡️  Severity: ${finalSeverity} (${uniqueVulns.length} findings)`);
    
    if (uniqueVulns.length > 0) {
      console.log(`\n--- 🐛 Vulnerabilidades Detectadas ---`);
      for (const v of uniqueVulns) {
        console.log(v);
      }
    }
    
    console.log(`\n--- 📊 Detalhes do Scan ---`);
    console.log(report.join('\n').substring(0, 2000) || 'Sem detalhes');
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`✅ Scan completo em ${new Date().toLocaleTimeString()}`);
    console.log(`${'═'.repeat(50)}`);
    
  } else {
    const test = args.join(' ') || 'vuln target.com';
    const result = classifier.classify(test);
    const tools = classifier.selectTools(result.intent);
    
    console.log(`\n📥 Input: "${test}"`);
    console.log(`\n🎯 Resultado:`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Confiança: ${result.confidence.toFixed(1)}%`);
    console.log(`   Método: ${result.method}`);
    console.log(`   Tools: ${tools.join(', ')}`);
  }
}

main();