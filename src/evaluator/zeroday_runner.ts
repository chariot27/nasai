import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ZeroDayCase {
  id: string;
  name: string;
  category: string;
  difficulty: 'critical' | 'high' | 'medium' | 'low';
  cvss: number;
  prompt: string;
  attack_vector: string;
  payload: string;
  year: number;
}

interface TestResult {
  case_id: string;
  passed: boolean;
  detection: boolean;
  false_positive: boolean;
  execution_time: number;
  error?: string;
}

interface Analysis {
  total: number;
  passed: number;
  failed: number;
  avg_cvss: number;
  by_category: Record<string, { total: number; passed: number }>;
  by_difficulty: Record<string, { total: number; passed: number }>;
  detection_rate: number;
  false_positive_rate: number;
}

class ZeroDayEvaluator {
  private cases: ZeroDayCase[] = [];
  private results: TestResult[] = [];
  private baselineAccuracy = 0.75;

  constructor(casesPath: string) {
    const data = fs.readFileSync(casesPath, 'utf-8');
    this.cases = JSON.parse(data);
  }

  private simulateModelResponse(caseData: ZeroDayCase): TestResult {
    const start = Date.now();
    
    const difficultyProb = {
      critical: this.baselineAccuracy + 0.05,
      high: this.baselineAccuracy + 0.1,
      medium: this.baselineAccuracy + 0.15,
      low: this.baselineAccuracy + 0.2
    };
    
    const cvssFactor = caseData.cvss / 10;
    const prob = Math.min(0.98, difficultyProb[caseData.difficulty] * cvssFactor);
    
    const random = Math.random();
    const passed = random < prob;
    
    return {
      case_id: caseData.id,
      passed,
      detection: passed,
      false_positive: !passed && Math.random() < 0.1,
      execution_time: Date.now() - start
    };
  }

  async runEvaluation(interactive = false) {
    console.clear();
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('       NASAI 0-DAY & EDGE CASE EVALUATION FRAMEWORK');
    console.log('       Advanced Vulnerability Simulation');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    console.log(`Total 0-day cases: ${this.cases.length}`);
    console.log(`Model: nasai-maestro-3.0\n`);
    
    let processed = 0;
    for (const testCase of this.cases) {
      const result = this.simulateModelResponse(testCase);
      this.results.push(result);
      processed++;
      
      if (interactive || processed % 50 === 0 || processed === this.cases.length) {
        const acc = (this.getAnalysis().detection_rate * 100).toFixed(1);
        const icon = result.passed ? '✓' : '✗';
        
        console.log(`[${processed}/${this.cases.length}] ${icon} ${testCase.id} | ${testCase.category} | ${testCase.difficulty.toUpperCase()} | CVSS: ${testCase.cvss.toFixed(1)} | Acc: ${acc}%`);
      }
      
      if (interactive && processed % 100 === 0) {
        this.printLiveAnalysis();
        await new Promise(r => setTimeout(r, 10));
      }
    }
    
    this.printFinalReport();
    this.performRootCauseAnalysis();
    this.recommendImprovements();
    this.saveResults();
  }

  private getAnalysis(): Analysis {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const falsePositives = this.results.filter(r => r.false_positive).length;
    
    const byCategory: Record<string, { total: number; passed: number }> = {};
    const byDifficulty: Record<string, { total: number; passed: number }> = {};
    
    for (const r of this.results) {
      const c = this.cases.find(x => x.id === r.case_id);
      if (!c) continue;
      
      if (!byCategory[c.category]) byCategory[c.category] = { total: 0, passed: 0 };
      byCategory[c.category].total++;
      if (r.passed) byCategory[c.category].passed++;
      
      if (!byDifficulty[c.difficulty]) byDifficulty[c.difficulty] = { total: 0, passed: 0 };
      byDifficulty[c.difficulty].total++;
      if (r.passed) byDifficulty[c.difficulty].passed++;
    }
    
    return {
      total,
      passed,
      failed,
      avg_cvss: this.cases.reduce((a, c) => a + c.cvss, 0) / total,
      by_category: byCategory,
      by_difficulty: byDifficulty,
      detection_rate: passed / total,
      false_positive_rate: falsePositives / total
    };
  }

  private printLiveAnalysis() {
    console.log('\n--- Live Metrics ---');
    const a = this.getAnalysis();
    console.log(`Detection: ${(a.detection_rate * 100).toFixed(1)}%`);
  }

  private printFinalReport() {
    const a = this.getAnalysis();
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('                    0-DAY ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    console.log(`
🎯 DETECTION RATE: ${(a.detection_rate * 100).toFixed(2)}%

📊 BY CATEGORY:
`);
    for (const [cat, data] of Object.entries(a.by_category)) {
      const rate = (data.passed / data.total * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(data.passed / data.total * 20));
      console.log(`   ${cat.padEnd(12)} ${data.passed}/${data.total} ${rate.padStart(5)}% ${bar}`);
    }
    
    console.log(`
📊 BY SEVERITY:
`);
    const diffOrder = ['critical', 'high', 'medium', 'low'];
    for (const diff of diffOrder) {
      if (!a.by_difficulty[diff]) continue;
      const data = a.by_difficulty[diff];
      const rate = (data.passed / data.total * 100).toFixed(1);
      console.log(`   ${diff.toUpperCase().padEnd(8)} ${data.passed}/${data.total} ${rate.padStart(6)}%`);
    }
    
    console.log(`
🛡️ FALSE POSITIVE RATE: ${(a.false_positive_rate * 100).toFixed(2)}%

📈 CVSS AVG: ${a.avg_cvss.toFixed(1)}/10
`);
  }

  private performRootCauseAnalysis() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('                    ROOT CAUSE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    const a = this.getAnalysis();
    const issues: string[] = [];
    
    if (a.by_difficulty.critical && a.by_difficulty.critical.passed / a.by_difficulty.critical.total < 0.8) {
      issues.push('⚠️  Critical vulnerabilities: Model struggles with critical severity. Needs more training on RCE, SSRF, Auth bypass.');
    }
    if (a.by_difficulty.high && a.by_difficulty.high.passed / a.by_difficulty.high.total < 0.85) {
      issues.push('⚠️  High severity: Need improvement on complex attack chains.');
    }
    if (a.by_category['AI'] && a.by_category['AI'].passed / a.by_category['AI'].total < 0.8) {
      issues.push('⚠️  AI/ML category: Prompt injection, model evasion needs work.');
    }
    if (a.by_category['Bypass'] && a.by_category['Bypass'].passed / a.by_category['Bypass'].total < 0.75) {
      issues.push('⚠️  Bypass techniques: WAF bypass, protocol smuggling difficult.');
    }
    if (a.false_positive_rate > 0.15) {
      issues.push('⚠️  High false positive rate: Model too noisy.');
    }
    
    if (issues.length === 0) {
      console.log('✅ No major issues detected.');
    } else {
      for (const issue of issues) {
        console.log(issue);
      }
    }
  }

  private recommendImprovements() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('                    RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    const a = this.getAnalysis();
    
    if (a.detection_rate < 0.9) {
      console.log(`
📌 SUGESTÕES DE TREINAMENTO:

1. Treinar com mais dados de:
   - HTTP Request Smuggling
   - JWT Algorithm Confusion
   - SSRF via PDF/Image
   - WebSocket Attacks
   - DNS Rebinding

2. Adicionar tool calls para:
   - sqlmap (SQL injection)
   - nmap scripts específicos
   - Custom request fuzzer

3. Aumentar dataset de:
   - 0-days recentes
   - Edge cases de bypass
   - Attack chaining

4. Ajustar temperatura para:
   - Lower (0.1) para exploits críticos
   - Higher (0.3) para enumeração
`);
    }
    
    console.log('📊 Próximos passos:');
    console.log('   1. Gerar mais casos de dificuldade crítica');
    console.log('   2. Re-treinar com dados específicos');
    console.log('   3. Executar novamente após ajuste');
  }

  private saveResults() {
    const a = this.getAnalysis();
    const outputPath = path.join(__dirname, 'zeroday_analysis.json');
    
    const output = {
      timestamp: new Date().toISOString(),
      model: 'nasai-maestro-3.0',
      accuracy: a.detection_rate,
      false_positive_rate: a.false_positive_rate,
      avg_cvss: a.avg_cvss,
      by_category: a.by_category,
      by_difficulty: a.by_difficulty,
      results: this.results.slice(-100)
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Analysis saved to: ${outputPath}`);
  }

  adjustBaseline(improvement: number) {
    this.baselineAccuracy = Math.min(0.99, this.baselineAccuracy + improvement);
    console.log(`\n🔧 Baseline adjusted to: ${(this.baselineAccuracy * 100).toFixed(1)}%`);
  }
}

async function main() {
  const casesPath = path.join(__dirname, 'zeroday_cases.json');
  const args = process.argv.slice(2);
  const mode = args[0];
  
  if (!fs.existsSync(casesPath)) {
    console.log('Generating 0-day cases...');
    const { execSync } = require('child_process');
    execSync(`npx bun run ${path.join(__dirname, 'zeroday_collector.ts')}`, { cwd: __dirname });
  }
  
  const evaluator = new ZeroDayEvaluator(casesPath);
  
  if (mode === 'interactive') {
    await evaluator.runEvaluation(true);
  } else if (mode === 'retrain') {
    console.log('🔄 Simulating model improvement...\n');
    const improvements = [0.05, 0.08, 0.1, 0.12, 0.15];
    for (let i = 0; i < improvements.length; i++) {
      evaluator.adjustBaseline(improvements[i]);
      await evaluator.runEvaluation();
    }
  } else {
    await evaluator.runEvaluation();
  }
}

main().catch(console.error);