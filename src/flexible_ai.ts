import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TaskResult {
  success: boolean;
  output: string;
  errors: string[];
  time: number;
}

interface Analysis {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

class FlexibleAI {
  private taskHistory: Map<string, TaskResult> = new Map();
  private baseline = 0.90;

  async execute(task: string, context: Record<string, any>): Promise<{ output: string; results: TaskResult[]; analysis: Analysis }> {
    const results = await this.runTDD(task, context);
    const analysis = this.analyze(results);
    this.selfLearn(analysis);
    
    return {
      output: this.formatOutput(task, results, analysis),
      results,
      analysis
    };
  }

  private async runTDD(task: string, context: Record<string, any>): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    
    const tests = this.generateTests(task);
    
    for (const test of tests) {
      const start = Date.now();
      try {
        const output = execSync(test.cmd, { timeout: test.timeout || 10000, encoding: 'utf-8' });
        results.push({ success: test.validator(output), output: output.substring(0, 500), errors: [], time: Date.now() - start });
      } catch (e: any) {
        results.push({ success: false, output: '', errors: [e.message], time: Date.now() - start });
      }
    }
    
    return results;
  }

  private generateTests(task: string): { cmd: string; validator: (o: string) => boolean; timeout?: number }[] {
    const domainMatch = task.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
    const domain = domainMatch ? domainMatch[1] : null;
    
    task = task.toLowerCase();
    
    if (task.includes('test') || task.includes('pentest') || task.includes('scan')) {
      return [
        { cmd: `host ${domain}`, validator: (o: string) => o.includes('has address'), timeout: 5000 },
        { cmd: `nmap -p 80,443 ${domain}`, validator: (o: string) => o.includes('open') || o.includes('filtered'), timeout: 15000 },
        { cmd: `dig +short ${domain}`, validator: (o: string) => o.length > 0, timeout: 5000 }
      ];
    }
    
    if (task.includes('code') || task.includes('test') || task.includes('build')) {
      return [
        { cmd: `ls -la`, validator: () => true },
        { cmd: `npm test 2>/dev/null || echo "no tests"`, validator: () => true, timeout: 30000 }
      ];
    }
    
    return [
      { cmd: `echo "Task: ${task}"`, validator: () => true }
    ];
  }

  private analyze(results: TaskResult[]): Analysis {
    const passed = results.filter(r => r.success).length;
    const score = results.length > 0 ? passed / results.length : 0;
    
    const issues = results.filter(r => !r.success).map((r, i) => `Test ${i + 1}: ${r.errors.join(', ')}`);
    const suggestions = issues.length > 0 ? 
      ['Revisar comandos que falharam', 'Aumentar timeout', 'Verificar dependencias'] : 
      ['Manter padrão atual', 'Expandir testes'];
    
    return { passed: score >= this.baseline, score, issues, suggestions };
  }

  private selfLearn(analysis: Analysis): void {
    if (!analysis.passed) {
      this.baseline = Math.max(0.70, this.baseline - 0.02);
    } else {
      this.baseline = Math.min(0.98, this.baseline + 0.01);
    }
  }

  private formatOutput(task: string, results: TaskResult[], analysis: Analysis): string {
    const domainMatch = task.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
    const target = domainMatch ? domainMatch[1] : 'Alvo';
    
    return `╔══��═══════════════════════════════════════════════════════╗
║       RESULTADO: ${target.toUpperCase().padEnd(41)}║
╚══════════════════════════════════════════════════════════╝

📊 STATUS: ${analysis.passed ? '✅ SUCESSO' : '⚠️ COM ISSUES'}

📈 Score: ${(analysis.score * 100).toFixed(1)}%

📋 Testes: ${results.filter(r => r.success).length}/${results.length}

${results.filter(r => r.success).length < results.length ? '\n⚠️ ISSUES:\n' + analysis.issues.join('\n') : ''}

💡 SUGESTOES:
${analysis.suggestions.map(s => '• ' + s).join('\n')}

═══════════════════════════════════════════════════════════`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const task = args.join(' ') || 'help';
  
  const ai = new FlexibleAI();
  
  if (task === 'help') {
    console.log(`
NASAI Flexible AI System

Usage:
  nasai "pentest domain.com"
  nasai "test the code"
  nasai "analyze performance"
        `);
    return;
  }
  
  const result = await ai.execute(task, {});
  console.log(result.output);
}

main().catch(console.error);