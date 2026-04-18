import * as fs from 'node:fs';
import * as path from 'node:path';

const KNOWLEDGE_PATH = './data/knowledge.json';

interface Entry {
  id: number;
  category: string;
  topic: string;
  content: string;
  source: string;
  keywords: string[];
  created_at: string;
}

const SECURITY_KEYWORDS = [
  'lfi', 'rfi', 'sqli', 'xss', 'csrf', 'ssrf', 'rce', 'idor', '0-day', 'zeroday',
  'bypass', 'waf', 'recon', 'stealth', 'fuzz', 'nmap', 'payload', 'exploit',
  'vulnerability', 'cve', 'mitre', 'red team', 'blue team', 'malware', 'phishing'
];

async function normalizeBase() {
  console.log('[MAESTRO] Iniciando tratamento da base de dados...');
  
  if (!fs.existsSync(KNOWLEDGE_PATH)) {
    console.error('[ERRO] Base knowledge.json não encontrada.');
    return;
  }

  const raw = fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
  let entries: Entry[] = JSON.parse(raw);
  const initialCount = entries.length;

  console.log(`[DATA] Processando ${initialCount} entradas...`);

  // 1. Limpeza e Extração
  entries = entries.map(entry => {
    // Limpar conteúdo de lixo comum
    let cleaned = entry.content
      .replace(/Slides Removed[\s\S]*?understanding\./gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extrair palavras-chave se estiver vazio
    const contentLower = cleaned.toLowerCase();
    const foundKeywords = SECURITY_KEYWORDS.filter(k => contentLower.includes(k));
    
    return {
      ...entry,
      content: cleaned,
      keywords: [...new Set([...entry.keywords, ...foundKeywords])]
    };
  });

  // 2. Deduplicação (baseado no conteúdo limpo)
  const seen = new Set();
  entries = entries.filter(entry => {
    const key = entry.content.substring(0, 500); // Primeiros 500 chars para performance
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 3. Re-indexação e Normalização de Datas
  entries = entries.map((entry, index) => ({
    ...entry,
    id: index + 1,
    category: entry.category === 'GENERAL' && entry.keywords.includes('red team') ? 'RED_TEAM' : entry.category
  }));

  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(entries, null, 2));

  console.log(`\n[SUCESSO] Base tratada!`);
  console.log(`- Entradas Iniciais: ${initialCount}`);
  console.log(`- Entradas Finais: ${entries.length}`);
  console.log(`- Removidas (Duplicatas/Lixo): ${initialCount - entries.length}`);
}

normalizeBase().catch(console.error);
