import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PDF_DIR = path.join(__dirname, '../pdfs');
const DB_PATH = path.join(__dirname, '../data/knowledge.json');

class PDFKnowledgeExtractor {
  constructor() {
    this.entries = [];
  }

  async parsePDFs() {
    const results = [];
    
    if (!fs.existsSync(PDF_DIR)) {
      console.log('📁 Pasta de PDFs não encontrada:', PDF_DIR);
      return results;
    }

    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    console.log(`📄 Encontrados ${files.length} PDFs`);

    for (const file of files) {
      const filePath = path.join(PDF_DIR, file);
      console.log(`   → Processando: ${file}`);
      
      try {
        const content = await this.extractFromPDF(filePath, file);
        if (content.text.length > 100) {
          results.push(content);
          console.log(`      ✓ ${content.text.length} caracteres extraídos`);
        }
      } catch (e) {
        console.log(`      ✗ Erro: ${e.message}`);
      }
    }

    return results;
  }

  async extractFromPDF(filePath, filename) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    const text = data.text;
    
    const keywords = this.extractKeywords(text);
    const source = this.getSourceName(filename);

    return { source, text: text.substring(0, 50000), keywords };
  }

  extractKeywords(text) {
    const securityTerms = [
      'vulnerability', 'exploit', 'injection', 'xss', 'sqli', 'csrf', 'ssrf',
      'pentest', 'hacking', 'red team', 'blue team', 'malware', 'phishing',
      'encryption', 'cryptography', 'tls', 'ssl', 'certificate', 'hash',
      'authentication', 'authorization', 'access control', 'owasp',
      'network', 'firewall', 'ids', 'ips', 'vpn', 'proxy',
      'sql injection', 'cross-site', 'directory traversal', 'lfi', 'rfi',
      'buffer overflow', 'heap overflow', 'format string', 'race condition',
      'privilege escalation', 'lateral movement', 'persistence', 'c2',
      'metasploit', 'nmap', 'burp', 'wireshark', 'nikto', 'sqlmap', 'hydra',
      'wordpress', 'plugin', 'theme', 'waf', 'hardening',
      'cloud', 'aws', 'azure', 'gcp', 's3', 'iam', 'kubernetes', 'docker',
      'mobile', 'android', 'ios', 'apk', 'jadx', 'frida', 'reversing',
      'cve', 'zero-day', '0day', 'nday', 'patch'
    ];

    const found = [];
    const lower = text.toLowerCase();
    
    for (const term of securityTerms) {
      if (lower.includes(term.toLowerCase())) {
        found.push(term);
      }
    }

    return [...new Set(found)].slice(0, 30);
  }

  getSourceName(filename) {
    const names = {
      'Cloudbric': 'Cloudbric WP Security',
      'Kali-Linux': 'Kali Linux Revealed',
      'Penetration Testing': 'Pentest Hands-on',
      'Volkis': 'Red Team Exercise',
      'Plano de Estudos': 'Study Plan Red Team',
      'Tribe of Hackers': 'Tribe of Hackers',
      'The-Complete-Guide': 'Building Skill Guide',
      'AF_with-intro': 'Active Directory',
      'inkavote': 'INKAVOTE',
      'gpt-5': 'AI Research',
      'Nasai Mythos': 'Nasai Research'
    };

    for (const [key, value] of Object.entries(names)) {
      if (filename.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return filename.replace('.pdf', '');
  }

  processContent(extractions) {
    const entries = [];
    let id = 1;

    for (const ext of extractions) {
      const chunks = this.chunkContent(ext.text, 2000);
      
      for (const chunk of chunks) {
        entries.push({
          id: id++,
          category: this.categorize(ext.source, chunk),
          topic: this.extractTopic(chunk),
          content: chunk,
          source: ext.source,
          keywords: ext.keywords.filter(k => chunk.toLowerCase().includes(k.toLowerCase())),
          created_at: new Date().toISOString()
        });
      }
    }

    return entries;
  }

  chunkContent(text, size) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const chunks = [];
    let current = '';

    for (const sent of sentences) {
      if (current.length + sent.length > size && current.length > 100) {
        chunks.push(current.trim());
        current = '';
      }
      current += sent + '. ';
    }

    if (current.trim().length > 50) {
      chunks.push(current.trim());
    }

    return chunks.length ? chunks : [text.substring(0, size)];
  }

  categorize(source, content) {
    const c = content.toLowerCase();
    
    if (c.includes('wordpress') || c.includes('plugin') || c.includes('theme')) {
      return 'WEB_SECURITY';
    }
    if (c.includes('nmap') || c.includes('metasploit') || c.includes('exploit')) {
      return 'PENTEST';
    }
    if (c.includes('red team') || c.includes('apt') || c.includes('lateral')) {
      return 'RED_TEAM';
    }
    if (c.includes('cloud') || c.includes('aws') || c.includes('s3')) {
      return 'CLOUD';
    }
    if (c.includes('mobile') || c.includes('android') || c.includes('ios')) {
      return 'MOBILE';
    }
    if (c.includes('network') || c.includes('firewall') || c.includes('vpn')) {
      return 'NETWORK';
    }
    
    return 'GENERAL';
  }

  extractTopic(content) {
    const topics = {
      'WordPress Security': ['wordpress', 'plugin', 'theme', 'wordfence', 'sucuri'],
      'Penetration Testing': ['pentest', 'exploit', 'vulnerability', 'hacking'],
      'Red Team': ['red team', 'apt', 'lateral', 'persistence', 'c2'],
      'Network Security': ['network', 'firewall', 'ids', 'ips', 'vpn'],
      'Web Vulnerabilities': ['xss', 'sqli', 'injection', 'csrf', 'ssrf'],
      'Cloud Security': ['aws', 'azure', 'gcp', 's3', 'iam', 'cloud'],
      'Mobile Security': ['mobile', 'android', 'ios', 'apk', 'jadx'],
      'Cryptography': ['encryption', 'hash', 'tls', 'ssl', 'crypto'],
    };

    for (const [topic, keys] of Object.entries(topics)) {
      if (keys.some(k => content.toLowerCase().includes(k))) {
        return topic;
      }
    }

    return 'Security Knowledge';
  }

  save(entries) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = JSON.stringify(entries, null, 2);
    fs.writeFileSync(DB_PATH, data);
    console.log(`💾 Salvos ${entries.length} conhecimentos em data/knowledge.json`);
  }

  load() {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }

    return [];
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         NASAI-MAESTRO-4.0: PDF KNOWLEDGE EXTRACTOR           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const extractor = new PDFKnowledgeExtractor();
  
  console.log('🔍 Parsing PDFs da pasta pdfs/...\n');
  const extractions = await extractor.parsePDFs();
  
  if (extractions.length === 0) {
    console.log('⚠️  Nenhum PDF processado');
    process.exit(1);
  }

  console.log(`\n📊 Processando ${extractions.length} documentos...\n`);
  const entries = extractor.processContent(extractions);
  
  console.log(`✅ Gerados ${entries.length} knowledge entries`);
  extractor.save(entries);

  const categories = [...new Set(entries.map(e => e.category))];
  const sources = [...new Set(entries.map(e => e.source))];
  
  console.log('\n📈 ESTATÍSTICAS:');
  console.log(`   Documentos: ${extractions.length}`);
  console.log(`   Entries: ${entries.length}`);
  console.log(`   Categorias: ${categories.length}`);
  console.log(`   Fontes: ${sources.join(', ')}`);
}

main();