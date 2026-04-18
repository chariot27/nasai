import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CVETestCase {
  id: string;
  cwe_category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  expected_outcome: string;
}

const cases: CVETestCase[] = [];
let idCounter = 1;

// CWE Categories mapped to specific prompts for defensive code review
const cweTemplates = [
  {
    cwe: "CWE-89 (SQL Injection)",
    prompts: [
      "Audite auth.ts, encontre a concatenação de string na query SQL de login e altere para Prepared Statements nativos.",
      "O log reporta erro 500 em /users?id=1' OR '1'='1. Abra userController.js e sanitize o input id antes de buscar no DB.",
      "Substitua a chamada db.raw() vulnerável a Injeção no arquivo report.ts usando query builder tipado do Knex."
    ]
  },
  {
    cwe: "CWE-79 (Cross-Site Scripting)",
    prompts: [
      "Encontre o uso de dangerouslySetInnerHTML no componente Profile.tsx e sanitize o input com DOMPurify antes da renderização.",
      "A resposta JSON da API de comentários não escapa tags HTML. Adicione um middleware de sanitização na rota de comentários.",
      "O script frontend.js reflete o parâmetro 'q' da URL diretamente no innerHTML. Corrija para textContent."
    ]
  },
  {
    cwe: "CWE-22 (Path Traversal)",
    prompts: [
      "No endpoint de download (download.ts), valide que req.query.file não contém '../' e se restringe à pasta /public/assets.",
      "Um scanner relatou acesso ao /etc/passwd. O script router.php lê arquivos arbitrariamente baseados no parâmetro 'page'. Restrinja o include via allowlist.",
      "Reescreva a função getFileStream() para usar path.resolve() e checar se o caminho final começa com o BASE_DIR seguro."
    ]
  },
  {
    cwe: "CWE-918 (Server-Side Request Forgery)",
    prompts: [
      "O endpoint /webhook/proxy aceita uma URL de usuário. Adicione checagem de IP para bloquear acessos à rede interna 10.0.0.0/8.",
      "Evite que a função fetchExternalAvatar acesse instâncias AWS Metadata 169.254.169.254 implementando uma regra DNS rigorosa.",
      "Configure o Axios no webhook_service.ts para desabilitar o seguimento automático de redirecionamentos (allow_redirects=False)."
    ]
  },
  {
    cwe: "CWE-312 (Cleartext Storage of Sensitive Information)",
    prompts: [
      "O arquivo config.json contém chaves AWS em plaintext. Apague-as e configure o código em server.ts para usar variáveis de ambiente.",
      "A função logger.info() está gravando a senha do usuário em disco durante o login. Modifique o log para ocultar 'password' ou 'token'.",
      "O token JWT está sendo salvo em localStorage. Altere o fluxo de autenticação para armazenar o token em um cookie HttpOnly e Secure."
    ]
  }
];

// Gerar 1000 casos
for (let i = 0; i < 1000; i++) {
  const templateGroup = cweTemplates[i % cweTemplates.length];
  const promptText = templateGroup.prompts[i % templateGroup.prompts.length];
  
  // Distribuir dificuldades
  let diff: 'easy' | 'medium' | 'hard' = 'medium';
  if (i % 5 === 0) diff = 'hard'; // 20% Hard (Exige Reflexion)
  else if (i % 2 === 0) diff = 'easy'; // 40% Easy

  let finalPrompt = promptText;
  if (diff === 'hard') {
    finalPrompt += " (Nota: O arquivo original possui erros de formatação (trailing spaces) que impedirão substituição atômica direta. Você precisará ler, analisar e ajustar o alvo).";
  }

  cases.push({
    id: `CVE-AUDIT-${idCounter++}`,
    cwe_category: templateGroup.cwe,
    difficulty: diff,
    prompt: finalPrompt,
    expected_outcome: "Agente encontrou a falha, isolou o escopo, aplicou o patch de correção da vulnerabilidade e verificou integridade."
  });
}

// Randomizar ordem
cases.sort(() => Math.random() - 0.5);

const outputPath = path.join(__dirname, 'cases_cve.json');
fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2));

console.log(`Sucesso: Evals CVE/CWE gerados com ${cases.length} cenários de Code Review Defensivo.`);
console.log(`Caminho: ${outputPath}`);
