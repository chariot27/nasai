#!/usr/bin/env node
import { AgentEngine } from './src/agent/engine';
import { DynamicRedTeamEngine } from './src/redteam/dynamic_engine';
import { ZeroDayHunterEngine } from './src/redteam/zero_day_engine';

const VERSION = '9.0';
const args = process.argv.slice(2);

const HELP = `
╔══════════════════════════════════════════════════════════════════════╗
║          NASAI MAESTRO ${VERSION} — Autonomous Red Team AI Agent         ║
╚══════════════════════════════════════════════════════════════════════╝

USO:
  nasai "<prompt em linguagem natural>"
  nasai --redteam <domínio> [--0day]
  nasai --0day <domínio> [--port <porta>]
  nasai --benchmark
  nasai --help

EXEMPLOS:
  nasai "faça um pentest completo no example.com"
  nasai "descubra XSS em example.com"
  nasai "execute nmap em target.com"
  nasai --redteam target.com
  nasai --redteam target.com --0day
  nasai --0day target.com --port 443
`;

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

async function main() {
  // Modo --0day direto
  if (args[0] === '--0day') {
    const target = args[1];
    const portArg = args.indexOf('--port');
    const port = portArg !== -1 ? parseInt(args[portArg + 1]) : 80;
    const isHttps = port === 443;

    if (!target) {
      console.error('[ERRO] Informe o alvo: nasai --0day <domínio>');
      process.exit(1);
    }

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║             NASAI MAESTRO ${VERSION} — 0-DAY HUNT MODE ACTIVADO             ║
╚══════════════════════════════════════════════════════════════════════╝
Alvo  : ${target}
HTTPS : ${isHttps}
`);

    const engine = new ZeroDayHunterEngine({ target, port, isHttps, intensity: 'aggressive' });
    const anomalies = await engine.run();

    if (anomalies.length > 0) {
      console.log(`\n[⚠  ANOMALIAS DETECTADAS — ${anomalies.length}]`);
      console.log(JSON.stringify(anomalies, null, 2));
    } else {
      console.log('\n[✓] Nenhuma anomalia de protocolo encontrada.');
    }
    return;
  }

  // Modo --redteam (dynamic engine com 0-day opcional)
  if (args[0] === '--redteam') {
    const target = args[1];
    const zeroDay = args.includes('--0day');

    if (!target) {
      console.error('[ERRO] Informe o alvo: nasai --redteam <domínio>');
      process.exit(1);
    }

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                NASAI MAESTRO ${VERSION} — RED TEAM MODE                     ║
╚══════════════════════════════════════════════════════════════════════╝
Alvo    : ${target}
0-Day   : ${zeroDay ? 'SIM ⚠' : 'NÃO'}
`);

    const engine = new DynamicRedTeamEngine();
    await engine.runDynamicTests(target, true);
    return;
  }

  // Modo --benchmark (Stress Test e Métricas)
  if (args.includes('--benchmark')) {
    const { execSync } = await import('node:child_process');
    console.log('[MAESTRO] Disparando Bateria de Stress Test...');
    try {
      execSync('npx tsx src/stress_test.ts', { stdio: 'inherit' });
    } catch (e) {
      console.error('[ERRO] Falha ao executar benchmark.');
    }
    return;
  }

  // Modo padrão: prompt em linguagem natural via AgentEngine
  const prompt = args.join(' ');

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                NASAI MAESTRO ${VERSION} — AI Agent Mode                     ║
╚══════════════════════════════════════════════════════════════════════╝
Prompt: ${prompt}
`);

  const sessionId = `cli-${Date.now()}`;
  const engine = new AgentEngine(sessionId);

  await engine.init();
  await engine.processInput(prompt, (msg: string) => {
    console.log(`  > ${msg}`);
  });
  await engine.stop();
}

main().catch(console.error);

process.on('SIGINT', () => {
  console.log('\n\n[!] Interrupção detectada. Finalizando Maestro Nasai e limpando processos...');
  process.exit(0);
});