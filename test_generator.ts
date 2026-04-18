import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const intents = [
  'vuln', 'web', 'recon', 'scan', 'mitm', 'brute', 'whois', 'dns', 'email',
  'tech', 'headers', 'cms', 'ssl', 'audit', 'malware', 'full', 'cloud', 'api', 'ad', 'iot', 'postexploit'
];

const templates: Record<string, string[]> = {
  vuln: [
    'check vulnerability', 'vuln scan', 'find vuln', 'security issue', 'cve scan', 'pen test', 'pentest',
    'test sqli', 'find sql injection', 'check xss', 'detect rce', 'exploit check', 'nikto scan', 'nuclei scan',
    'check cve-2024', 'cve lookup', 'cve search', 'vulnerability assessment', 'penetration testing',
    'security flaw', 'security bug', 'security problem', 'security vulnerability',
    'check exploit', 'test exploit', 'find exploit', 'scan vulnerability', 'vuln assessment',
    'check injection', 'test injection', 'find injection', 'sqli test', 'xss test', 'ssrf test',
    'rce test', 'command injection', 'test command injection', 'detect command injection',
    'check authentication bypass', 'test auth bypass', 'find auth bypass',
    'check authorization', 'test broken access', 'idor test',
    'check csrf', 'test csrf', 'check ssti', 'test template injection',
    'test xxe', 'check xml injection', 'test lfi', 'check rfi',
    'vulnerability check', 'vulnerability test', 'vulnerability scan',
    'exploit vulnerability', 'find vulnerability', 'detect vulnerability'
  ],
  web: [
    'scan website', 'web scan', 'directory enum', 'directory enumeration', 'find directories',
    'gobuster', 'dirb', 'ffuf', 'dirbuster', 'scan directory', 'enumerate directory',
    'web directory', 'find hidden', 'hidden files', 'admin panel', 'login page', 'web admin',
    'web app scan', 'web application', 'scan web app', 'web enum', 'bruteforce web',
    'find web pages', 'discover url', 'enumerate url', 'web url', 'web path',
    'web content', 'web file', 'web assets', 'scan web content', 'list website',
    'scan web directory', 'enumerate web', 'bust directory', 'scan web paths',
    'directory busting', 'directory scan', 'find web directories', 'probe website',
    'check website', 'analyze website', 'test website', 'scan website for files',
    'web enumeration', 'web discovery', 'discover web paths', 'find web resources'
  ],
  recon: [
    'reconnaissance', 'recon', 'subdomain enum', 'subdomain enumeration', 'find subdomains',
    'subfinder', 'findomain', 'amass', 'assetfinder', 'passive recon', 'active recon',
    'full recon', 'recon all', 'domain discovery', 'domain enum', 'osint', 'information gathering',
    'subdomain scan', 'discover subdomains', 'list subdomains', 'find domains', 'probe subdomains',
    'enum subdomains', 'scan subdomains', 'domain scan', 'subdomain discovery',
    'google dorks', 'ghdb', 'email harvest', 'whois enum', 'reverse dns', 'dns enum',
    'fierce', 'subenum', 'asset enum', 'reconnaissance gather', 'gather intel',
    'find all subdomains', 'discover all subdomains', 'enumerate subdomains',
    'scan for subdomains', 'find subdomain', 'check subdomain', 'probe subdomain',
    ' subdomain takeover', 'find vulnerable subdomain', 'osint gather'
  ],
  scan: [
    'port scan', 'nmap', 'network scan', 'scan ports', 'service scan', 'tcp scan', 'udp scan',
    'scan all ports', 'quick scan', 'intense scan', 'syn scan', 'connect scan', 'ping scan',
    'host discovery', 'enumerate ports', 'check ports', 'service enum', 'service discovery',
    'fast scan', 'full scan ports', 'aggressive scan', 'comprehensive scan',
    'scan host', 'check host', 'network enum', 'host enum', 'port enum',
    'nmap scan', 'port sweep', 'scan network', 'check network', 'test network',
    'scan target', 'enumerate target', 'check services', 'detect services',
    'scan for open ports', 'find open ports', 'list open ports', 'check open ports'
  ],
  mitm: [
    'mitm', 'man in the middle', 'ettercap', 'bettercap', 'responder', 'arp spoof', 'arp poison',
    'arp poisoning', 'dns spoof', 'ssl strip', 'sslstrip', 'traffic intercept', 'network intercept',
    'session hijack', 'cookie steal', 'cookie hijack', 'network sniff', 'packet sniff',
    'intercept traffic', 'arp scan', 'sniff network', 'network sniffing', 'arp spoofing',
    'dns poisoning', 'man in browser', 'man in mobile', 'wifi mitm', 'wireless mitm',
    'evil twin', 'rogue ap', 'traffic hijack', 'http hijack', 'ssl sniffing',
    'https sniffing', 'network interception', 'arp mitm', 'test mitm', 'check mitm',
    'detect mitm', 'probe mitm', 'sniff traffic', 'capture traffic'
  ],
  brute: [
    'brute', 'bruteforce', 'brute force', 'password crack', 'hydra', 'medusa', 'john', 'hashcat',
    'credential attack', 'credential stuff', 'password spray', 'wordlist', 'dictionary attack',
    'login brute', 'login crack', 'force login', 'guess login', 'crack login',
    'password attack', 'credential brute', 'login attack', 'brute credentials',
    'test credentials', 'check credentials', 'guess password', 'crack password',
    'force password', 'brute force login', 'password guess', 'brute force attack',
    'hydra scan', 'medusa scan', 'john the ripper', 'hashcat attack',
    'credential spray', 'password brute', 'brute force password'
  ],
  whois: [
    'whois', 'domain whois', 'whois lookup', 'domain lookup', 'domain info', 'domain owner',
    'domain age', 'domain created', 'domain expiry', 'domain registration', 'registrar',
    'nameserver', 'check whois', 'lookup whois', 'domain details', 'owner info',
    'check domain', 'query domain', 'domain search', 'check domain age', 'check domain expiry',
    'when created', 'when expires', 'who owns domain', 'domain registration info',
    'domain owner lookup', 'registrar check', 'check registrar', 'check nameservers',
    'domain status check', 'domain expiration date', 'domain created date'
  ],
  dns: [
    'dns', 'dig', 'nslookup', 'mx record', 'txt record', 'ns record', 'a record',
    'dns lookup', 'dns query', 'dns check', 'dns records', 'dns enum', 'dnsenum',
    'dns zone transfer', 'axfr', 'dnssec', 'reverse dns', 'resolve', 'nameserver',
    'check mx', 'check spf', 'dmarc', 'dkim', 'full dns enumeration',
    'dns check', 'test dns', 'probe dns', 'check dns records',
    'verify dns', 'dns information', 'dns analysis', 'dns scan'
  ],
  email: [
    'email', 'emails', 'harvest', 'theharvester', 'harvest emails', 'find email',
    'collect emails', 'email collection', 'email finder', 'email scraper', 'gather emails',
    'probe email', 'scan email', 'find email addresses', 'harvest email addresses',
    'email enumeration', 'email gather', 'gather email', 'check email',
    'email hunter', 'email finder', 'email harvester', 'email collector'
  ],
  tech: [
    'tech', 'technology', 'whatweb', 'wappalyzer', 'fingerprint', 'detect tech',
    'detect technology', 'detect server', 'detect framework', 'identify technology',
    'server identification', 'service identification', 'detect cms',
    'detect programming language', 'probe tech', 'analyze tech',
    'technology detection', 'detect backend', 'detect frontend', 'tech scan',
    'identify framework', 'fingerprint server', 'identify server',
    'which technology', 'probe server', 'check technology'
  ],
  headers: [
    'http header', 'http headers', 'check header', 'security header', 'csp',
    'x-frame-options', 'hsts', 'strict-transport-security', 'content-security-policy',
    'analyze header', 'analyze headers', 'verify headers', 'check csp',
    'check hsts', 'check x-frame', 'check cors', 'header check',
    'check security headers', 'verify security header', 'scan headers',
    'header analysis', 'header security', 'check header security'
  ],
  cms: [
    'cms', 'wordpress', 'drupal', 'joomla', 'magento', 'wpscan', 'droopescan',
    'cms scan', 'cms detection', 'wordpress scan', 'drupal scan', 'joomla scan',
    'wordpress vuln', 'detect cms', 'identify cms', 'which cms', 'wordpress detection',
    'cms vulnerability', 'cms exploit', 'wpscan scan', 'joomscan', 'scan cms',
    'check wordpress', 'check drupal', 'check joomla', 'probe cms',
    'identify wordpress', 'identify joomla', 'identify drupal'
  ],
  ssl: [
    'ssl', 'tls', 'certificate', 'cert', 'ssl check', 'tls check', 'cert check',
    'ssl certificate', 'tls certificate', 'https check', 'check ssl', 'check tls',
    'verify ssl', 'check certificate', 'test ssl', 'test tls', 'cipher', 'cipher suite',
    'heartbleed', 'poodle', 'beast', 'freak', 'testssl', 'check https',
    'verify https', 'test certificate', 'probe ssl', 'check tls version',
    'check ssl version', 'certificate validation', 'ssl scan', 'tls scan'
  ],
  audit: [
    'audit', 'security audit', 'system audit', 'compliance', 'lynis', 'hardening',
    'cis', 'stig', 'security check', 'system check', 'verify hardening',
    'security assessment', 'risk assessment', 'security hardening',
    'system hardening', 'verify security', 'probe hardening', 'assess security',
    'security posture', 'security evaluation', 'security baseline', 'baseline check',
    'compliance check', 'security benchmark', 'vulnerability assessment',
    'penetration audit', 'security control', 'run lynis', 'lynis audit'
  ],
  malware: [
    'malware', 'virus', 'rootkit', 'rkhunter', 'clamav', 'detect malware', 'find malware',
    'scan malware', 'trojan', 'backdoor', 'keylogger', 'spyware', 'adware', 'infected',
    'check virus', 'scan rootkit', 'detect virus', 'probe malware', 'analyze malware',
    'ransomware', 'detect ransomware', 'check ransomware', 'yara', 'virustotal',
    'malware analysis', 'malware detection', 'detect malicious', 'check malicious',
    'virus detection', 'trojan detection', 'backdoor detection', 'rootkit detection',
    'malicious code', 'malware found', 'scan for virus', 'antivirus check'
  ],
  full: [
    'full scan', 'complete scan', 'full assessment', 'comprehensive', 'full test',
    'complete test', 'full audit', 'full penetration', 'pentest', 'penetration test',
    'everything', 'all', 'complete', 'full coverage', 'full vulnerability',
    'full recon', 'full enumeration', 'all-in-one', 'all tests', 'comprehensive test',
    'full check', 'full eval', 'full security', 'overall assessment', 'complete assessment',
    'thorough scan', 'detailed scan', 'extensive scan', 'end-to-end', 'entire scan',
    'comprehensive scan', 'full vulnerability scan', 'full pentest'
  ],
  cloud: [
    'cloud', 'aws', 'azure', 'gcp', 's3', 'bucket', 'cloud enum', 'aws enum', 'azure enum',
    's3 bucket', 'bucket enum', 'cloud scan', 'cloud vuln', 'cloud security', 'cloud assessment',
    'public bucket', 'bucket takeover', 'cloud misconfig', 'aws scan', 'azure scan', 'gcp scan',
    'cloud discovery', 'cloud footprint', 'enumerate cloud', 'iam enum', 'lambda', 'serverless',
    'find s3', 'check s3', 'enumerate s3', 'scan aws', 'scan azure', 'scan gcp',
    'aws security', 'azure security', 'gcp security', 'cloud asset'
  ],
  api: [
    'api', 'rest', 'graphql', 'endpoint', 'api scan', 'api fuzz', 'api enum', 'api vuln',
    'swagger', 'openapi', 'wsdl', 'api security', 'api test', 'api endpoint',
    'graphql introspection', 'rest fuzz', 'api pen test', 'jwt', 'oauth', 'api auth',
    'api rate limit', 'api dos', 'parameter fuzzing', 'api mass assignment', 'detect api',
    'test api', 'check api', 'api vulnerability', 'api exploit', 'api penetration',
    'api fuzzing', 'api brute', 'api endpoint scan'
  ],
  ad: [
    'active directory', 'ldap', 'kerberos', 'bloodhound', 'ad scan', 'ad enum', 'domain admin',
    'domain controller', 'crackmapexec', 'impacket', 'enum4linux', 'kerberoast', 'golden ticket',
    'silver ticket', 'pass the hash', 'pth', 'dcsync', 'mimikatz', 'lsass', 'sam dump',
    'ntlm relay', 'smb relay', 'acl abuse', 'domain privesc', 'lateral movement',
    'psexec', 'wmiexec', 'ad vulnerability', 'ad attack', 'ad assessment',
    'active directory attack', 'active directory enum', 'kerberos attack',
    'ldap enum', 'ldap scan', 'domain enum', 'user enum'
  ],
  iot: [
    'iot', 'firmware', 'embedded', 'device', 'scada', 'plc', 'ics', 'industrial',
    'firmware analysis', 'firmware extract', 'binwalk', 'firmalyze', 'smart device',
    'mqtt', 'zigbee', 'bluetooth', 'modbus', 'coap', 'device scan', 'device fingerprint',
    'iot scan', 'iot vuln', 'iot security', 'firmware security', 'device vulnerability',
    'firmware unpack', 'firmware analysis', 'embedded device', 'scada scan',
    'smart home', 'mqtt scan', 'zigbee scan', 'ble scan'
  ],
  postexploit: [
    'postexploit', 'post exploit', 'persistence', 'backdoor', 'rootkit', 'maintain access',
    'keylogger', 'screen capture', 'screenshot', 'webcam', 'microphone',
    'credential harvest', 'password dump', 'lsass dump', 'secretsdump',
    'privilege escalate', 'privesc', 'sudo privesc', 'suid exploit',
    'meterpreter', 'reverse shell', 'bind shell', 'webshell', 'lateral movement',
    'pivot', 'port forward', 'socks proxy', 'exfil', 'exfiltration',
    'data theft', 'credential theft', 'mimikatz', 'getsystem'
  ]
};

function generateTests(count: number) {
  const cases: {input: string, expected: string}[] = [];
  
  for (let i = 0; i < count; i++) {
    const intent = intents[Math.floor(Math.random() * intents.length)];
    const phraseList = templates[intent];
    const phrase = phraseList[Math.floor(Math.random() * phraseList.length)];
    
    const domains = ['target.com', 'example.com', 'test.com', 'demo.com', 'app.com', 'web.com', 'site.com', 'host.com', 'server.com', 'net.com'];
    const target = domains[Math.floor(Math.random() * domains.length)];
    
    const variations = [
      phrase,
      phrase + ' ' + target,
      phrase + ' on ' + target,
      phrase + ' for ' + target,
      'run ' + phrase,
      'execute ' + phrase,
      'scan ' + phrase,
      'check ' + phrase,
      'find ' + phrase,
      'test ' + phrase,
      phrase.replace(/^check /, '').replace(/^find /, '').replace(/^scan /, '').replace(/^test /, ''),
    ];
    
    const input = variations[Math.floor(Math.random() * variations.length)];
    cases.push({ input, expected: intent });
  }
  
  return cases;
}

function runTests(cases: {input: string, expected: string}[]) {
  let correct = 0;
  let total = cases.length;
  const results: {input: string, expected: string, got: string, correct: boolean}[] = [];
  const byIntent: Record<string, {correct: number, total: number}> = {};
  
  console.log(`Testing ${total} cases...\n`);
  
  for (let i = 0; i < total; i++) {
    const { input, expected } = cases[i];
    const result = classifySimple(input);
    const isCorrect = result.intent === expected;
    
    if (isCorrect) correct++;
    
    if (!byIntent[expected]) byIntent[expected] = { correct: 0, total: 0 };
    byIntent[expected].total++;
    if (isCorrect) byIntent[expected].correct++;
    
    if (i < 100 || i % 10000 === 0) {
      process.stdout.write(`\rProgress: ${Math.round(i/total*100)}%`);
    }
  }
  
  console.log('\n');
  return { correct, total, byIntent };
}

function classifySimple(text: string): { intent: string; confidence: number } {
  const input = text.toLowerCase().trim();
  const scores: Map<string, number> = new Map();
  
  const patterns: Record<string, string[]> = {
    vuln: templates.vuln,
    web: templates.web,
    recon: templates.recon,
    scan: templates.scan,
    mitm: templates.mitm,
    brute: templates.brute,
    whois: templates.whois,
    dns: templates.dns,
    email: templates.email,
    tech: templates.tech,
    headers: templates.headers,
    cms: templates.cms,
    ssl: templates.ssl,
    audit: templates.audit,
    malware: templates.malware,
    full: templates.full,
    cloud: templates.cloud,
    api: templates.api,
    ad: templates.ad,
    iot: templates.iot,
    postexploit: templates.postexploit
  };
  
  for (const [intent, pats] of Object.entries(patterns)) {
    let score = 0;
    for (const pat of pats) {
      if (input === pat) score += 30;
      else if (input.startsWith(pat + ' ') || input.startsWith(pat)) score += 25;
      else if (pat.length >= 4 && input.includes(pat)) score += 15;
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
  
  return { intent: bestIntent, confidence: bestScore > 0 ? 80 : 50 };
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   NASAI TEST GENERATOR v1.0            ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  
  if (args[0] === 'gen') {
    const count = parseInt(args[1] || '200000');
    const cases = generateTests(count);
    fs.writeFileSync(path.join(__dirname, 'test_cases.json'), JSON.stringify(cases));
    console.log(`✓ Generated ${count} test cases`);
  } 
  else if (args[0] === 'test') {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_cases.json'), 'utf-8'));
    const results = runTests(data);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`\nTotal: ${results.total}`);
    console.log(`Correct: ${results.correct} (${Math.round(results.correct/results.total*100)}%)`);
    console.log('\nBy Intent:');
    for (const [intent, stats] of Object.entries(results.byIntent)) {
      const acc = Math.round(stats.correct/stats.total*100);
      const icon = acc >= 90 ? '✅' : acc >= 70 ? '⚠️' : '❌';
      console.log(`  ${icon} ${intent}: ${stats.correct}/${stats.total} (${acc}%)`);
    }
  }
}

main();