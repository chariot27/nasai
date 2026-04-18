import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'Software Engineering' | 'Defensive Security' | 'DevOps';
  prompt: string;
  expected_tools: string[];
  expected_outcome: string;
}

const cases: TestCase[] = [];
let idCounter = 1;

// --- DIFICULDADE 1: EASY (35 Casos) ---
// Foco: Ações unitárias, leitura de logs, configuração básica
const easyPrompts = [
  { p: "Verifique o status do git no repositório atual.", c: "DevOps" },
  { p: "Leia o arquivo docker-compose.yml e me diga as portas mapeadas.", c: "DevOps" },
  { p: "Encontre todos os arquivos .ts modificados hoje.", c: "Software Engineering" },
  { p: "Crie um arquivo .gitignore para um projeto Node.js.", c: "Software Engineering" },
  { p: "Rode npm run lint e reporte os arquivos com erro.", c: "Software Engineering" },
  { p: "Leia o arquivo package.json e verifique se o 'helmet' (segurança) está instalado.", c: "Defensive Security" },
  { p: "Faça um grep procurando por senhas hardcoded em env.example.", c: "Defensive Security" }
];

for (let i = 0; i < 35; i++) {
  const item = easyPrompts[i % easyPrompts.length];
  cases.push({
    id: `EVALv2-EASY-${idCounter++}`,
    difficulty: 'easy',
    category: item.c as any,
    prompt: `${item.p} (Variante ${i+1})`,
    expected_tools: ['run_shell', 'read_file'],
    expected_outcome: "Comando executado com sucesso e contexto compreendido corretamente na primeira tentativa."
  });
}

// --- DIFICULDADE 2: MEDIUM (40 Casos) ---
// Foco: Planejamento lógico (System 2 Planner), refatorações simples e auditoria de código.
const mediumPrompts = [
  { p: "Leia o arquivo auth.js e substitua a geração de hash MD5 pela biblioteca bcrypt.", c: "Defensive Security" },
  { p: "Audite o arquivo server.ts para vulnerabilidades de SQL Injection e implemente prepared statements.", c: "Defensive Security" },
  { p: "Procure pela função 'calculateTax', entenda sua lógica, e extraia ela para um novo arquivo mathUtils.ts.", c: "Software Engineering" },
  { p: "Atualize todas as dependências do React no package.json e rode o install.", c: "DevOps" },
  { p: "Leia o script de deploy.sh, encontre onde as credenciais estão em plain text, e as modifique para carregar do ambiente ($AWS_KEY).", c: "DevOps" },
  { p: "Implemente um middleware de Rate Limiting simples no index.ts para prevenir ataques de força bruta.", c: "Defensive Security" }
];

for (let i = 0; i < 40; i++) {
  const item = mediumPrompts[i % mediumPrompts.length];
  cases.push({
    id: `EVALv2-MED-${idCounter++}`,
    difficulty: 'medium',
    category: item.c as any,
    prompt: `${item.p} (Variante ${i+1})`,
    expected_tools: ['read_file', 'edit_file', 'run_shell'],
    expected_outcome: "Planner gerou a árvore de tarefas corretamente. Modificações de código estruturais aplicadas sem corromper sintaxe."
  });
}

// --- DIFICULDADE 3: HARD (25 Casos) ---
// Foco: Recuperação de Erros (Reflexion), scripts quebrados e desafios intencionais onde a 1ª tentativa falhará.
const hardPrompts = [
  { p: "Conserte a falha de XSS refletido no arquivo frontend.tsx (Nota intencional: O arquivo está minificado, exigindo formatação prévia).", c: "Defensive Security" },
  { p: "O script de build CI/CD falhou com o erro 'Cannot read property X of undefined'. Debugue o arquivo src/builder.ts, rode o teste local, falhe e corrija o erro silencioso.", c: "Software Engineering" },
  { p: "Crie um script Python para validar certificados TLS no servidor, mas se a lib 'ssl' do sistema estiver corrompida, trate a exceção do shell e baixe o binário correto.", c: "DevOps" },
  { p: "Aplique um patch para fechar a vulnerabilidade CVE-2024-XXXX em um servidor Express legado sem interromper o serviço.", c: "Defensive Security" },
  { p: "Substitua a regex de validação de e-mail no backend por uma versão imune a ReDoS (Regular Expression Denial of Service). O arquivo possui indentação quebrada que fará sua edição atômica falhar na 1ª vez.", c: "Defensive Security" }
];

for (let i = 0; i < 25; i++) {
  const item = hardPrompts[i % hardPrompts.length];
  cases.push({
    id: `EVALv2-HRD-${idCounter++}`,
    difficulty: 'hard',
    category: item.c as any,
    prompt: `${item.p} (Variante ${i+1})`,
    expected_tools: ['run_shell', 'read_file', 'edit_file'],
    expected_outcome: "O modelo deve falhar intencionalmente na primeira tentativa, analisar a mensagem de erro da ferramenta (Reflexion), recalibrar a estratégia de busca/substituição ou comando bash, e resolver o problema nas iterações seguintes."
  });
}

const outputPath = path.join(__dirname, 'cases.json');
fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2));

console.log(`Sucesso: Evals v2 gerados com ${cases.length} novos cenários complexos.`);
console.log(`Caminho: ${outputPath}`);
