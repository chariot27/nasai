# NASAI MAESTRO 9.0 🎯

**Autonomous, Local-First AI Agent for Dynamic Red Teaming & 0-Day Research**

> `nasai-maestro-9.0` — Ecossistema completo e auto-contido · Fuzzing agressivo · Sub-agentes especialistas integrados · Heurísticas de 0-day · Orquestração dinâmica

---

## 🚀 Instalação Global (Rodar de qualquer lugar)

O Nasai Maestro 9.0 está disponível como um comando global no seu sistema. Após a configuração inicial não é necessário estar no diretório do projeto.

### Verificar instalação

```bash
nasai --help
which nasai       # /usr/local/bin/nasai
```

### Reinstalar / atualizar o link global (caso necessário)

```bash
cd "/home/noname/Área de trabalho/work/nasai"
sudo ln -sf "$(pwd)/nasai-wrapper.sh" /usr/local/bin/nasai
```

---

## ⚡ Comandos & Modos de Uso

### 1. Modo AI Agent (Linguagem Natural)

O modo padrão — basta digitar seu objetivo em linguagem natural. O Nasai interpreta a intenção, seleciona as ferramentas certas e executa autonomamente.

```bash
nasai "faça um pentest completo no example.com"
nasai "descubra XSS em example.com"
nasai "execute nmap em target.com"
nasai "procure credenciais expostas em app.example.com"
```

---

### 2. Modo Red Team Dinâmico (`--redteam`)

Aciona a `DynamicRedTeamEngine` — execução 100% concorrente, auto-corrigível e adaptativa. Realiza Recon (Fase 1), Fast Checks JS nativos (Fase 2), e orquestração paralela de ferramentas (Fase 3).

```bash
nasai --redteam <domínio>
```

**Exemplos:**
```bash
nasai --redteam target.com
nasai --redteam app.target.com
```

**Com 0-Day Hunt integrado (Fase 4):**
```bash
nasai --redteam target.com --0day
```

---

### 3. Modo 0-Day Hunt (`--0day`) ⚠️

**Novo no Maestro 9.0.** Aciona a `ZeroDayHunterEngine` diretamente — fuzzing agressivo de protocolos via raw sockets (Node.js `net`/`tls`), análise heurística de respostas anômalas e detecção autônoma de falhas inéditas.

```bash
nasai --0day <domínio> [--port <porta>]
```

**Exemplos:**
```bash
# HTTP (porta 80, padrão)
nasai --0day target.com

# HTTPS (porta 443, ativa TLS raw socket)
nasai --0day target.com --port 443

# Porta customizada
nasai --0day api.target.com --port 8443
```

**O que o modo 0-day faz:**

| Payload | Técnica | Objetivo |
|---------|---------|----------|
| Método HTTP inválido (`N@ZAI_HACK`) | Parser Abuse | Detectar WAF cego / cache poisoning |
| `Content-Length` + `Transfer-Encoding` | HTTP Request Smuggling (CL.TE) | Backend desync |
| Null byte em path/header (`\x00`) | Path Traversal / Header Injection | Bypass de sanitização |
| Header gigante (8192 bytes) | Buffer Exhaustion | DoS de parser / memory leak |
| Request incompleta (sem `\r\n\r\n`) | Timeout Resource Leak | Detecção de resource exhaustion |

**Heurísticas de análise:**
- `CRASH_OR_WAF_DROP` — conexão dropada imediatamente (ECONNRESET)
- `RESOURCE_EXHAUSTION_SUSPICION` — latência > 4s para payload leve
- `0DAY_FRAMEWORK_DUMP` — vazamento de stack trace / SQL error / segfault
- `WAF_BYPASS_OR_CACHE_POISONING` — 200 OK para método inválido

---

### 4. Ajuda

```bash
nasai --help
nasai -h
```

---

## 🏗️ Arquitetura

```
nasai/
├── nasai.ts                          # Entrypoint CLI (todos os modos)
├── nasai-wrapper.sh                  # Wrapper global (/usr/local/bin/nasai)
├── src/
│   ├── agent/
│   │   ├── engine.ts                 # AgentEngine (nasai-maestro-9.0)
│   │   ├── subagents/                # Sub-agentes especialistas integrados 🤖
│   │   ├── skills/                   # Skills de Segurança e Pentest ⚔️
│   │   └── community-skills/         # Skills contribuídas pela comunidade 🌐
│   ├── redteam/
│   │   ├── dynamic_engine.ts         # Motor concorrente (Fases 1–4)
│   │   └── zero_day_engine.ts        # 0-Day Hunter (NOVO v9.0) ⚡
│   ├── tools/
│   │   ├── pentest/                  # Ferramentas avançadas de pentest 🛠️
│   │   └── community/                # Ferramentas da comunidade 📦
│   ├── support/                      # Scripts de suporte e formatos (KALI/HTB)
│   └── evaluator/                    # Suite de benchmarks e avaliação
├── package.json
└── README.md
```

---

## 📊 Benchmarks de Acurácia

### Red Team Real (Ambiente de Execução)
| Métrica | Valor |
|---------|-------|
| Prompts testados | 1.000 |
| Acertos de intenção + orquestração | 914 |
| **Acurácia global** | **91,40%** |

### Core LLM Teórico (Banco de Treino)
| Métrica | Valor |
|---------|-------|
| Base total de casos | 66.760 + |
| Acurácia global | 96,54% |
| Taxa de detecção 0-Day | **86,7%** (26/30 exploits) |

<details>
<summary>📋 Ver distribuição de categorias (66k+ casos)</summary>

```
CATEGORIAS:
├── Bypass:        3,883
├── WebSocket:     3,269
├── General:       3,240
├── DoS:           3,455
├── SSRF:          3,507
├── IDOR:          3,526
├── Info:          3,524
├── RCE:           3,118
├── Auth:          3,011
├── XSS:           2,989
├── JWT:           2,995
├── SQLi:          2,908
├── XXE:           3,036
├── File Upload:   3,083
├── Smuggling:     3,001
├── Pollution:     3,059
├── OAuth:         2,997
├── Cache:         2,965
├── CSRF:          3,291
├── SSTI:          2,860
└── Deser:         3,043
```
</details>

---

## 🧪 Testes & Avaliação

### Benchmarks do Core

```bash
# Avaliação do roteamento de Red Team (1000 casos)
npm run test:redteam:web

# Avaliação do Core LLM
npm run test:eval

# Teste contra vulnerabilidades 0-Day
npm run test:zeroday:eval

# Benchmark massivo (66k+ casos)
npm run test:massive

# Avaliação de CVEs específicos
npm run test:cve:eval
```

### Aprendizado Contínuo

```bash
# Aprender nova vulnerabilidade
npm run learn "nova_vulnerabilidade"

# Gerar casos sintéticos
npm run test:gen

# Geração em larga escala
npm run generate 10000
```

### Testando a Engine 0-Day Localmente

Para validar sem um alvo real, use o servidor mock incluído:

```bash
# 1. Suba o servidor vulnerável local (porta 8080)
node mock_target.js

# 2. Em outro terminal, rode o 0-day hunter
nasai --0day localhost --port 8080
```

---

## 📝 Licença

MIT License — Open Source Security Research

> ⚠️ **Aviso legal:** Este software é destinado exclusivamente a pesquisa de segurança ofensiva autorizada, testes em ambientes controlados e bug bounty com escopo definido. O uso contra sistemas sem autorização explícita é ilegal.