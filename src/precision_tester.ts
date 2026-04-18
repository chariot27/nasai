import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Test {
  name: string;
  cmd: string;
  validate: (o: string) => boolean;
  category: string;
}

const LAB_TESTS: Test[] = [
  { name: 'DNS-A', cmd: 'host google.com', validate: (o: string) => o.includes('has address'), category: 'DNS' },
  { name: 'DNS-MX', cmd: 'dig +short google.com MX', validate: (o: string) => o.includes('google'), category: 'DNS' },
  { name: 'HTTP-GET', cmd: 'curl -s httpbin.org/get', validate: (o: string) => o.includes('args'), category: 'HTTP' },
  { name: 'HTTP-Headers', cmd: 'curl -sI httpbin.org/headers', validate: (o: string) => o.includes('200'), category: 'HTTP' },
  { name: 'PORT-80', cmd: 'nmap -p 80 httpbin.org', validate: (o: string) => o.includes('80'), category: 'PORT' },
  { name: 'PORT-443', cmd: 'nmap -p 443 httpbin.org', validate: (o: string) => o.includes('443'), category: 'PORT' },
  { name: 'SSL-Check', cmd: 'timeout 5 openssl s_client -connect google.com:443 </dev/null 2>&1 | head -3', validate: (o: string) => o.length > 10, category: 'SSL' },
  { name: 'SEC-HSTS', cmd: 'curl -sI https://google.com', validate: (o: string) => o.toLowerCase().includes('strict'), category: 'SECURITY' },
  { name: 'API-JSON', cmd: 'curl -s httpbin.org/json', validate: (o: string) => o.includes('{'), category: 'API' },
  { name: 'API-GET', cmd: 'curl -s httpbin.org/get?test=1', validate: (o: string) => o.includes('test'), category: 'API' },
  { name: 'CLOUD-CF', cmd: 'curl -sI bancocn.com', validate: (o: string) => o.toLowerCase().includes('cloudflare'), category: 'CLOUD' },
  { name: 'PERF-Code', cmd: 'curl -o /dev/null -s -w "%{http_code}" http://example.com', validate: (o: string) => Number(o) >= 200 && Number(o) < 400, category: 'PERF' },
  { name: 'ENC-GZIP', cmd: 'curl -s --compressed httpbin.org/gzip', validate: (o: string) => o.includes('gzip') || o.includes('gunzip'), category: 'ENCODING' },
  { name: 'REDIR', cmd: 'curl -sI -L httpbin.org/redirect/1', validate: (o: string) => o.includes('302'), category: 'REDIRECT' },
  { name: 'VULN-Simple', cmd: 'host testphp.vulnweb.com', validate: (o: string) => o.includes('has address'), category: 'VULN' },
  { name: 'DNS-IPv6', cmd: 'host google.com', validate: (o: string) => o.includes('IPv6'), category: 'NETWORK' },
  { name: 'WHOIS', cmd: 'whois google.com | head -5', validate: (o: string) => o.includes('Registrar'), category: 'INFO' },
  { name: 'HEADERS', cmd: 'curl -sI httpbin.org/anything', validate: (o: string) => o.includes('200'), category: 'HTTP' },
  { name: 'STATUS', cmd: 'curl -s -o /dev/null -w "%{http_code}" https://www.google.com', validate: (o: string) => o.trim() === '200', category: 'PERF' },
  { name: 'API-XML', cmd: 'curl -s httpbin.org/xml', validate: (o: string) => o.includes('<'), category: 'API' },
];

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║              NASAI PRECISION TEST - LABORATORY                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

let pass = 0;
let fail = 0;
const results: {name: string; passed: boolean; cat: string}[] = [];

for (let i = 0; i < LAB_TESTS.length; i++) {
  const t = LAB_TESTS[i];
  process.stdout.write(`[${i+1}/${LAB_TESTS.length}] ${t.name}... `);
  try {
    const out = execSync(t.cmd, { timeout: 10000, encoding: 'utf-8' });
    const ok = t.validate(out);
    console.log(ok ? '✅' : '❌');
    if (ok) pass++; else fail++;
    results.push({ name: t.name, passed: ok, cat: t.category });
  } catch { console.log('❌'); fail++; results.push({ name: t.name, passed: false, cat: t.category }); }
}

const acc = (pass / LAB_TESTS.length * 100).toFixed(1);

console.log('\n══════════════════════════════════════════════════════════════════════════');
console.log('                    PRECISION REPORT');
console.log('═══════════════════════════════════��══════════════════════════════════════');
console.log(`\n🎯 ACCURACY: ${acc}% (${pass}/${LAB_TESTS.length})\n`);

const byCat: Record<string, {p: number; t: number}> = {};
for (const r of results) {
  if (!byCat[r.cat]) byCat[r.cat] = { p: 0, t: 0 };
  byCat[r.cat].t++;
  if (r.passed) byCat[r.cat].p++;
}

console.log('📊 BY CATEGORY:');
for (const [c, d] of Object.entries(byCat)) {
  const a = (d.p / d.t * 100).toFixed(1);
  const icon = Number(a) >= 90 ? '✅' : Number(a) >= 70 ? '⚠️' : '❌';
  console.log(`   ${icon} ${c.padEnd(10)}: ${d.p}/${d.t} (${a}%)`);
}

console.log('\n' + (Number(acc) >= 90 ? '✅ EXCELLENT' : Number(acc) >= 70 ? '⚠️ GOOD' : '❌ NEEDS TRAINING'));

fs.writeFileSync(path.join(__dirname, 'precision.json'), JSON.stringify({ accuracy: acc, passed: pass, failed: fail, byCategory: byCat }, null, 2));