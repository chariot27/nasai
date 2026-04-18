import { RedTeamToolchain } from './toolchain_engine.js';
import { DynamicRedTeamEngine } from './dynamic_engine.js';

function classifyIntent(input: string): string {
  const text = input.toLowerCase();
  
  if (text.includes('secret') || text.includes('credential') || text.includes('api key') || text.includes('assetfinder')) {
    return 'recon_secrets';
  }
  if (text.includes('url') || text.includes('httpx') || text.includes('gau') || text.includes('endpoint') || text.includes('path')) {
    return 'recon_urls';
  }
  if (text.includes('critical') || text.includes('severe') || text.includes('cve') || text.includes('vulnerabilit') || text.includes('nuclei')) {
    return 'critical_scan';
  }
  if (text.includes('dynamic') || text.includes('simultaneously') || text.includes('simultaneo') || text.includes('parallel') || text.includes('todos') || text.includes('all')) {
    return 'dynamic';
  }
  
  return 'basic'; // fallback
}

async function main() {
  const args = process.argv.slice(2);
  const prompt = args.join(' ');

  if (!prompt) {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║      NASAI RED TEAM WEB - EXECUÇÃO REAL                   ║
╚═══════════════════════════════════════════════════════════╝
Modo de uso:
  npx tsx src/redteam/run.ts "sua requisição como llm aqui no dominio alvo"

Exemplos:
  npx tsx src/redteam/run.ts "find secrets on meudominio.com"
  npx tsx src/redteam/run.ts "run critical scan with nuclei on meudominio.com"
  npx tsx src/redteam/run.ts "run completely dynamic tests simultaneously on meudominio.com"
`);
    return;
  }

  const targetMatch = prompt.match(/(?:on|for) ([a-zA-Z0-9.-]+)/);
  let target = targetMatch ? targetMatch[1] : '';

  if (!target) {
    // try to find anything that looks like a domain
    const dMatch = prompt.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    target = dMatch ? dMatch[1] : '';
  }

  if (!target) {
    console.error('[ERRO] Não foi possível identificar um domínio na sua requisição.');
    console.log('Tente algo como: "find secrets on meudominio.com"');
    return;
  }

  console.log(`\n[INFO] Interpretando seu pedido: "${prompt}"`);
  const intent = classifyIntent(prompt);
  console.log(`[INFO] Alvo identificado: ${target}`);
  console.log(`[INFO] Intenção classificada: ${intent}`);
  console.log(`[AVISO] Executando contra um alvo real!\n`);

  if (intent === 'dynamic') {
    const engine = new DynamicRedTeamEngine();
    await engine.runDynamicTests(target, true);
  } else {
    const engine = new RedTeamToolchain();
    const result = await engine.selectToolchain(intent, target, true);

    if (result.success) {
      console.log(`\n[SUCESSO] Pipeline [${result.chainName}] executado com sucesso!`);
      console.log(result.outputSummary);
    } else {
      console.error(`\n[ERRO] Falha na execução da Pipeline [${result.chainName}].`);
      console.error(`Erro: ${result.error}`);
    }
  }
}

main().catch(console.error);
