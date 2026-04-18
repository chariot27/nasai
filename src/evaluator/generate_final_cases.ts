import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  id: string;
  difficulty: 'hard' | 'medium' | 'easy';
  prompt: string;
  category: string;
}

const cases: TestCase[] = [];
let idCounter = 1;

// 1. HARD (5000 Casos) - Reflexion, AppSec Poliglota, Zero-days e Lógica Complexa
for (let i = 0; i < 5000; i++) {
  cases.push({
    id: `FINAL-HRD-${idCounter++}`,
    difficulty: 'hard',
    category: 'Vulnerability Remediation & Reflexion',
    prompt: `Auditoria Crítica Variante ${i}: Encontre a falha poliglota e aplique o patch de segurança. (Nota: Espera-se erro inicial de compilação ou formatação, ativando Reflexion).`
  });
}

// 2. MEDIUM (3000 Casos) - Refatorações, Planner Logic
for (let i = 0; i < 3000; i++) {
  cases.push({
    id: `FINAL-MED-${idCounter++}`,
    difficulty: 'medium',
    category: 'Code Refactoring & System Planning',
    prompt: `Refatoração Variante ${i}: Leia o arquivo, abstraia a lógica e mova para uma nova classe. Atualize as dependências.`
  });
}

// 3. EASY (2000 Casos) - Ações unitárias, leitura, grep
for (let i = 0; i < 2000; i++) {
  cases.push({
    id: `FINAL-ESY-${idCounter++}`,
    difficulty: 'easy',
    category: 'Log Analysis & Single Tools',
    prompt: `Operação Simples Variante ${i}: Liste os diretórios, leia o log ou crie um arquivo básico.`
  });
}

// Os casos já estão sendo empurrados na ordem: Hard -> Medium -> Easy (Dos piores para os mais fáceis).
const outputPath = path.join(__dirname, 'cases_final.json');
fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2));

console.log(`Sucesso: Gerados ${cases.length} casos para o stress test (Hard -> Medium -> Easy).`);
console.log(`Salvo em: ${outputPath}`);
