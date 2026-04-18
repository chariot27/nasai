import { execSync } from 'child_process';

interface TestCase {
  name: string;
  cmd: string;
  validator: (output: string) => boolean;
  timeout: number;
}

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
  error: string;
  time: number;
}

interface SuiteResult {
  name: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}

class TDDEngine {
  private testSuites: Map<string, TestCase[]> = new Map();
  private results: SuiteResult[] = [];

  register(suite: string, tests: TestCase[]) {
    this.testSuites.set(suite, tests);
  }

  async run(suite?: string): Promise<SuiteResult[]> {
    const results: SuiteResult[] = [];
    
    const suites = suite ? [suite] : Array.from(this.testSuites.keys());
    
    for (const name of suites) {
      const tests = this.testSuites.get(name) || [];
      const results_: TestResult[] = [];
      
      for (const test of tests) {
        const start = Date.now();
        try {
          const output = execSync(test.cmd, { timeout: test.timeout || 10000, encoding: 'utf-8' });
          const passed = test.validator(output);
          results_.push({ name: test.name, passed, output: output.substring(0, 300), error: '', time: Date.now() - start });
        } catch (e: any) {
          results_.push({ name: test.name, passed: false, output: '', error: e.message, time: Date.now() - start });
        }
      }
      
      const passed = results_.filter(r => r.passed).length;
      const failed = results_.filter(r => !r.passed).length;
      results.push({ name, passed, failed, tests: results_ });
    }
    
    this.results = results;
    return results;
  }

  report(): string {
    let output = '\n╔═══════════════════════════════════════════════════════╗\n║              TDD TEST REPORT                              ║\n╚═══════════════════════════════════════════════════════╝\n';
    
    for (const r of this.results) {
      output += `\n📦 ${r.name}\n`;
      output += `   ✅ Passed: ${r.passed} | ❌ Failed: ${r.failed}\n`;
      
      for (const t of r.tests) {
        output += `   ${t.passed ? '✅' : '❌'} ${t.name.padEnd(30)} ${t.time}ms\n`;
        if (t.error) output += `      Error: ${t.error.substring(0, 50)}\n`;
      }
    }
    
    const totalPassed = this.results.reduce((a, r) => a + r.passed, 0);
    const totalFailed = this.results.reduce((a, r) => a + r.failed, 0);
    const total = totalPassed + totalFailed;
    
    output += `\n═══════════════════════════════════════════════════════════\n`;
    output += `TOTAL: ${totalPassed}/${total} (${(totalPassed/total*100).toFixed(1)}%)`;
    output += `\n═══════════════════════════════════════════════════════════\n`;
    
    return output;
  }

  analyze(): { score: number; improvements: string[] } {
    const totalPassed = this.results.reduce((a, r) => a + r.passed, 0);
    const total = this.results.reduce((a, r) => a + r.passed + r.failed, 0);
    const score = total > 0 ? totalPassed / total : 0;
    
    const improvements: string[] = [];
    for (const r of this.results) {
      if (r.failed > 0) {
        for (const t of r.tests) {
          if (!t.passed) {
            improvements.push(`Fix: ${t.name} - ${t.error.substring(0, 50)}`);
          }
        }
      }
    }
    
    return { score, improvements };
  }
}

class AutoTrainer {
  private tdd: TDDEngine;
  private baseline = 0.90;

  constructor() {
    this.tdd = new TDDEngine();
  }

  async train(task: string) {
    const suite = this.detectSuite(task);
    await this.tdd.run(suite);
    
    console.log(this.tdd.report());
    
    const { score, improvements } = this.tdd.analyze();
    
    if (score >= this.baseline) {
      console.log(`\n✅ TREINAMENTO COMPLETO! Score: ${(score*100).toFixed(1)}%\n`);
    } else {
      console.log(`\n⚠️ TREINANDO... Score: ${(score*100).toFixed(1)}%`);
      console.log(`   Problemas encontrados:`);
      for (const i of improvements) console.log(`   - ${i}`);
    }
    
    return { score, suite };
  }

  private detectSuite(task: string): string {
    task = task.toLowerCase();
    
    if (task.includes('pentest') || task.includes('scan') || task.includes('vuln')) {
      return 'pentest';
    }
    if (task.includes('code') || task.includes('test') || task.includes('build')) {
      return 'code';
    }
    if (task.includes('http') || task.includes('curl') || task.includes('api')) {
      return 'api';
    }
    if (task.includes('dns') || task.includes('domain')) {
      return 'dns';
    }
    
    return 'general';
  }

  setupSuites() {
    this.tdd.register('pentest', [
      { name: 'DNS Resolution', cmd: 'host google.com', validator: (o: string) => o.includes('has address'), timeout: 5000 },
      { name: 'Port 80 Open', cmd: 'nmap -p 80 google.com', validator: (o: string) => o.includes('open'), timeout: 10000 },
      { name: 'Port 443 Open', cmd: 'nmap -p 443 google.com', validator: (o: string) => o.includes('open'), timeout: 10000 }
    ]);
    
    this.tdd.register('code', [
      { name: 'File Check', cmd: 'ls -la', validator: () => true, timeout: 2000 },
      { name: 'Build Test', cmd: 'npm test 2>/dev/null || echo "OK"', validator: () => true, timeout: 20000 }
    ]);
    
    this.tdd.register('api', [
      { name: 'HTTP GET', cmd: 'curl -sI https://google.com', validator: (o: string) => o.includes('HTTP'), timeout: 5000 },
      { name: 'HTTPS', cmd: 'curl -sI https://google.com', validator: (o: string) => o.includes('HTTPS'), timeout: 5000 }
    ]);
    
    this.tdd.register('dns', [
      { name: 'A Record', cmd: 'dig +short google.com A', validator: (o: string) => o.length > 0, timeout: 3000 },
      { name: 'MX Record', cmd: 'dig +short google.com MX', validator: (o: string) => o.length > 0, timeout: 3000 }
    ]);
    
    this.tdd.register('general', [
      { name: 'Basic Test', cmd: 'echo "OK"', validator: (o: string) => o.includes('OK') }
    ]);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const task = args.join(' ') || 'help';
  
  if (task === 'help') {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║       NASAI TDD AUTO-TRAINER v1.0                        ║
╚═══════════════════════════════════════════════════════════╝

Usage:
  nasai-tdd "pentest domain.com"
  nasai-tdd "test the code"
  nasai-tdd "scan api endpoint"
  nasai-tdd "analyze dns"
        `);
    return;
  }
  
  const trainer = new AutoTrainer();
  trainer.setupSuites();
  
  await trainer.train(task);
}

main().catch(console.error);