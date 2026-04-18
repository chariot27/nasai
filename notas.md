# 📝 NOTAS DE COMANDOS: NASAI MAESTRO 9.0

Guia rápido de referência para todos os comandos e ferramentas disponíveis no ecossistema Nasai.

---

## 🚀 Comandos Principais (CLI)

| Comando | Descrição | Exemplo |
| :--- | :--- | :--- |
| `nasai "<prompt>"` | Executa comando via Linguagem Natural (Agent) | `nasai "scaneie o google.com"` |
| `nasai --redteam <alvo>` | Inicia pipeline completo de Red Team | `nasai --redteam clearme.com` |
| `nasai --0day <alvo>` | Ativa o **Zero-Day Hunter Engine** (4 fases) | `nasai --0day syfe.com` |
| `nasai --benchmark` | Executa Stress Test e gera Relatório de Métricas | `nasai --benchmark` |
| `nasai --help` | Exibe a ajuda detalhada do CLI | `nasai --help` |

---

## 🧠 Scripts de Inteligência e Treino

Estes scripts gerenciam o "cérebro" do Maestro e a base de conhecimento.

| Script | Função | Comando |
| :--- | :--- | :--- |
| `normalize_knowledge.ts` | Limpa e trata a base `knowledge.json` | `npx tsx src/normalize_knowledge.ts` |
| `deep_train.ts` | Executa o Treino Profundo (200k casos) | `npx tsx src/deep_train.ts` |
| `generate_frel.ts` | Gera o Relatório Final de Avaliação | `npx tsx src/generate_frel.ts` |
| `stress_test.ts` | Motor de benchmark e validação massiva | `npx tsx src/stress_test.ts` |

---

## 🛠️ Ferramentas Integradas (Native Tools)

O Maestro coordena estas ferramentas automaticamente no modo Stealth.

| Ferramenta | Uso no Pipeline | Comando Base |
| :--- | :--- | :--- |
| **Nmap** | Recon Stealth e Validação | `nmap -sS -Pn` |
| **Naabu** | Port Scanning ultra-rápido | `naabu -host <target>` |
| **Proxychains4** | Ofuscação e Bypass de WAF | `proxychains4 -q` |
| **Subfinder** | Descoberta de subdomínios | `subfinder -d <domain>` |
| **WhatWeb** | Identificação de tecnologias | `whatweb <url>` |

---

## 📂 Arquivos de Dados e Resultados

| Arquivo | Conteúdo |
| :--- | :--- |
| `data/knowledge.json` | Base de conhecimento tratada (792 registros) |
| `METRICS_REPORT.md` | Resultado do último benchmark |
| `FREL.md` | Relatório Final de Acurácia (98.8%) |
| `EXPANSION_NOTES.md` | Guia para expansão da base de dados |

---
*Nasai Maestro 9.0 - Comandos Consolidados.*
